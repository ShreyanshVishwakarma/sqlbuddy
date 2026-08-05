/**
 * Typed message protocol between the practice workspace UI and the SQLite Web Worker.
 *
 * All messages travel through postMessage, so every payload must be structured-cloneable.
 * Requests are correlated with responses by `requestId` (except `initializeQuestion`,
 * which is acknowledged by the `ready` broadcast).
 */

export type WorkerRequest =
  | { type: "initializeQuestion"; questionId: string; schemaSql: string; seedSql: string }
  | { type: "executeQuery"; requestId: string; sql: string; maxRows: number }
  | { type: "resetDatabase"; requestId: string }
  | { type: "getSchema"; requestId: string }
  | { type: "previewTable"; requestId: string; tableName: string; limit: number }
  | { type: "disposeDatabase"; requestId: string };

export type WorkerResponse =
  | { type: "ready"; questionId: string }
  | {
      type: "querySuccess";
      requestId: string;
      columns: string[];
      rows: CellValue[][];
      rowCount: number;
      elapsedMs: number;
      truncated: boolean;
    }
  | { type: "queryError"; requestId: string; message: string; line?: number; column?: number }
  | { type: "schemaSuccess"; requestId: string; tables: TableInfo[] }
  | { type: "tablePreviewSuccess"; requestId: string; columns: string[]; rows: CellValue[][] }
  | { type: "resetSuccess"; requestId: string }
  | { type: "disposeSuccess"; requestId: string }
  | { type: "workerError"; message: string };

/** A single cell value after serialization; NULL stays null, numbers stay numbers. */
export type CellValue = string | number | null;

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  /** Approximate row count reported by SQLite's sqlite_stat1 / direct COUNT. */
  rowCount?: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  pk: boolean;
}
