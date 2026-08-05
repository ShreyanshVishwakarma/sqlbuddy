import { SqliteWorkerClient } from "./client";

export { SqliteWorkerClient } from "./client";
export * from "./protocol";
export type { ExecuteQueryResult, ExecuteQueryParams } from "./client";

/**
 * Creates a Worker using Next's bundler. `new Worker(new URL(...), { type: "module" })`
 * makes webpack emit a separate, content-hashed worker chunk — the SQLite runtime
 * is never part of any page's main bundle.
 */
export function createSqliteWorker(): Worker {
  return new Worker(new URL("./sqlite.worker.ts", import.meta.url), { type: "module" });
}

/** Convenience factory returning a ready-to-use client backed by the bundled worker. */
export function createSqliteClient(): SqliteWorkerClient {
  return new SqliteWorkerClient(createSqliteWorker);
}
