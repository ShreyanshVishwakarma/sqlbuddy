import type { TableInfo, WorkerRequest, WorkerResponse } from "./protocol";

export interface InitializeQuestionParams {
  questionId: string;
  schemaSql: string;
  seedSql: string;
}

export interface ExecuteQueryParams {
  sql: string;
  maxRows: number;
  timeoutMs: number;
}

export interface ExecuteQueryResult {
  columns: string[];
  rows: CellValue[][];
  rowCount: number;
  elapsedMs: number;
  truncated: boolean;
}

export type CellValue = string | number | null;

export class WorkerTimeoutError extends Error {
  constructor(message = "Query timed out.") {
    super(message);
    this.name = "WorkerTimeoutError";
  }
}

export class WorkerUnavailableError extends Error {
  constructor(message = "The SQLite engine is unavailable in this browser.") {
    super(message);
    this.name = "WorkerUnavailableError";
  }
}

interface PendingRequest {
  resolve: (res: WorkerResponse) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout> | null;
}

type WorkerFactory = () => Worker;

/**
 * Thin, promise-based client for the SQLite Web Worker.
 *
 * Responsibilities:
 * - correlates responses with requests via requestId
 * - enforces a per-request timeout; on timeout it terminates the Worker and
 *   transparently recreates it, so a runaway query can never wedge the UI
 * - serializes init/reset/dispose so state mutations never interleave
 */
export class SqliteWorkerClient {
  private worker: Worker | null = null;
  private readonly factory: WorkerFactory;
  private pending = new Map<string, PendingRequest>();
  private requestSeq = 0;
  private readyPromise: Promise<void> | null = null;
  private readyListeners: { finish: () => void; fail: () => void } | null = null;
  private disposed = false;

  constructor(factory: WorkerFactory) {
    this.factory = factory;
  }

  private getWorker(): Worker {
    if (this.disposed) throw new WorkerUnavailableError("Worker was disposed.");
    if (!this.worker) {
      this.worker = this.factory();
      this.worker.onmessage = (ev: MessageEvent<WorkerResponse>) => this.handleResponse(ev.data);
      this.worker.onerror = (ev) => this.handleWorkerError(ev.message || "Unknown worker error");
    }
    return this.worker;
  }

  /** Kills the current worker (used on timeout). A fresh one is created lazily. */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.readyPromise = null;
  }

  /** Call when the workspace unmounts. */
  dispose() {
    this.disposed = true;
    this.terminate();
    for (const [, p] of this.pending) {
      clearTimeout(p.timer as ReturnType<typeof setTimeout>);
      p.reject(new WorkerUnavailableError("Worker disposed."));
    }
    this.pending.clear();
  }

  /** True once the worker has been created (even if it later timed out). */
  get isActive() {
    return this.worker !== null;
  }

  initializeQuestion(params: InitializeQuestionParams): Promise<void> {
    const worker = this.getWorker();
    worker.postMessage({
      type: "initializeQuestion",
      questionId: params.questionId,
      schemaSql: params.schemaSql,
      seedSql: params.seedSql,
    } satisfies WorkerRequest);
    if (!this.readyPromise) {
      this.readyPromise = new Promise<void>((resolve, reject) => {
        const finish = () => resolve();
        const fail = () => reject(new WorkerUnavailableError());
        this.readyListeners = { finish, fail };
      });
    }
    return this.readyPromise;
  }

  executeQuery(params: ExecuteQueryParams): Promise<ExecuteQueryResult> {
    const requestId = this.nextRequestId();
    const worker = this.getWorker();

    return new Promise<ExecuteQueryResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        // Kill the worker: SQLite WASM can't be interrupted mid-flight, so the only
        // safe way to stop a runaway query is to terminate the Worker and start over.
        this.terminate();
        reject(new WorkerTimeoutError());
      }, params.timeoutMs);

      this.pending.set(requestId, {
        resolve: (res) => {
          clearTimeout(timer);
          if (res.type === "querySuccess") {
            resolve({
              columns: res.columns,
              rows: res.rows,
              rowCount: res.rowCount,
              elapsedMs: res.elapsedMs,
              truncated: res.truncated,
            });
          } else if (res.type === "queryError") {
            reject(new Error(res.message));
          } else {
            reject(new Error(`Unexpected response type: ${res.type}`));
          }
        },
        reject,
        timer,
      });

      worker.postMessage({
        type: "executeQuery",
        requestId,
        sql: params.sql,
        maxRows: params.maxRows,
      } satisfies WorkerRequest);
    });
  }

  resetDatabase(): Promise<void> {
    return this.request({ type: "resetDatabase" } as WorkerRequest).then(() => undefined);
  }

  getSchema(): Promise<TableInfo[]> {
    return this.request({ type: "getSchema" } as WorkerRequest).then((res) => {
      if (res.type === "schemaSuccess") return res.tables;
      throw new Error(`Unexpected response: ${res.type}`);
    });
  }

  previewTable(tableName: string, limit = 50): Promise<{ columns: string[]; rows: CellValue[][] }> {
    return this.request({
      type: "previewTable",
      tableName,
      limit,
    } as WorkerRequest).then((res) => {
      if (res.type === "tablePreviewSuccess") return { columns: res.columns, rows: res.rows };
      throw new Error(`Unexpected response: ${res.type}`);
    });
  }

  disposeDatabase(): Promise<void> {
    return this.request({ type: "disposeDatabase" } as WorkerRequest).then(() => undefined);
  }

  private request(msg: WorkerRequest): Promise<WorkerResponse> {
    const worker = this.getWorker();
    return new Promise<WorkerResponse>((resolve, reject) => {
      const requestId = this.nextRequestId();
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        this.terminate();
        reject(new WorkerTimeoutError());
      }, 30000);
      this.pending.set(requestId, { resolve, reject, timer });
      worker.postMessage({ ...msg, requestId } as WorkerRequest);
    });
  }

  private nextRequestId(): string {
    this.requestSeq += 1;
    return `req-${this.requestSeq}-${Date.now().toString(36)}`;
  }

  private handleResponse(res: WorkerResponse) {
    if (res.type === "ready") {
      this.readyListeners?.finish();
      this.readyListeners = null;
      return;
    }
    if (res.type === "workerError") {
      this.readyListeners?.fail();
      this.readyListeners = null;
      this.handleWorkerError(res.message);
      return;
    }
    if (res.type === "querySuccess" || res.type === "queryError") {
      const p = this.pending.get(res.requestId);
      if (p) {
        clearTimeout(p.timer as ReturnType<typeof setTimeout>);
        this.pending.delete(res.requestId);
        p.resolve(res);
      }
      return;
    }
    if (
      res.type === "schemaSuccess" ||
      res.type === "tablePreviewSuccess" ||
      res.type === "resetSuccess" ||
      res.type === "disposeSuccess"
    ) {
      const p = this.pending.get(res.requestId);
      if (p) {
        clearTimeout(p.timer as ReturnType<typeof setTimeout>);
        this.pending.delete(res.requestId);
        p.resolve(res);
      }
    }
  }

  private handleWorkerError(message: string) {
    for (const [, p] of this.pending) {
      clearTimeout(p.timer as ReturnType<typeof setTimeout>);
      p.reject(new WorkerUnavailableError(message));
    }
    this.pending.clear();
  }
}
