/// <reference lib="webworker" />
import initSqlJs, { type Database, type SqlJsStatic, type Statement } from "sql.js";
import { SQL_WASM_PATH } from "../constants";
import type { CellValue, ColumnInfo, TableInfo, WorkerRequest, WorkerResponse } from "./protocol";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let currentQuestionId: string | null = null;

// Original SQL captured at init so reset can reconstruct without re-sending payloads.
let initSchemaSql = "";
let initSeedSql = "";

async function ensureSqlJs(): Promise<SqlJsStatic> {
  if (SQL) return SQL;
  // The browser build of sql.js derives the wasm URL from document.currentScript,
  // which does not exist inside a Worker — so we always pass an explicit locateFile.
  SQL = await initSqlJs({
    locateFile: () => SQL_WASM_PATH,
  });
  return SQL;
}

function post(msg: WorkerResponse) {
  ctx.postMessage(msg);
}

function serializeCell(value: unknown): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (value instanceof Uint8Array) {
    // BLOBs become a short hex-ish preview; real practice data rarely uses blobs.
    return `[blob:${value.length} bytes]`;
  }
  return String(value);
}

function statementType(sql: string): string {
  // Skip leading comments so "-- comment\nSELECT ..." still classifies as SELECT.
  let text = sql.trim();
  let guard = 0;
  while (guard++ < 10) {
    if (text.startsWith("--")) {
      const nl = text.indexOf("\n");
      if (nl === -1) return "UNKNOWN";
      text = text.slice(nl + 1).trimStart();
      continue;
    }
    if (text.startsWith("/*")) {
      const end = text.indexOf("*/");
      if (end === -1) return "UNKNOWN";
      text = text.slice(end + 2).trimStart();
      continue;
    }
    break;
  }
  const first = text.split(/\s+/, 1)[0]?.toUpperCase();
  return first && /^[A-Z]+$/.test(first) ? first : "UNKNOWN";
}

/** True when the SQL contains at least one non-comment statement. */
function hasSqlStatement(sql: string): boolean {
  return (
    sql
      .replace(/--[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .trim().length > 0
  );
}

/** Executes one statement; returns its results or throws with a friendly message. */
function runStatement(
  stmt: Statement,
  maxRows: number,
): { columns: string[]; rows: CellValue[][]; rowCount: number; truncated: boolean } {
  const columns = stmt.getColumnNames();
  const rows: CellValue[][] = [];
  let truncated = false;
  let rowCount = 0;

  if (columns.length === 0) {
    // DDL / DML statement — no result set.
    stmt.step();
    return { columns, rows, rowCount: 0, truncated: false };
  }

  while (stmt.step()) {
    if (rowCount >= maxRows) {
      truncated = true;
      break;
    }
    const values = stmt.get();
    rows.push(values.map(serializeCell));
    rowCount++;
  }
  return { columns, rows, rowCount, truncated };
}

function executeSql(
  sql: string,
  maxRows: number,
): { columns: string[]; rows: CellValue[][]; rowCount: number; truncated: boolean } {
  if (!db) throw new Error("No database initialized. Open a question first.");
  if (!sql.trim()) throw new Error("Empty query.");

  const type = statementType(sql);
  if (type === "UNKNOWN")
    throw new Error(`Could not determine statement type from "${sql.trim().slice(0, 40)}…"`);

  // Comment-only input (e.g. a "-- note" that slipped through splitting) has no
  // statements; treat it as an empty query rather than a hard error.
  if (!hasSqlStatement(sql)) throw new Error("Empty query.");

  // A single "query" may contain several statements separated by semicolons (e.g. a
  // CTE plus the final SELECT). Execute them in sequence and surface the last result set.
  let result: ReturnType<typeof runStatement> | null = null;
  for (const stmt of db.iterateStatements(sql)) {
    try {
      if (stmt.getColumnNames().length > 0) {
        result = runStatement(stmt, maxRows);
      } else {
        stmt.step(); // run and discard DDL/DML statements
      }
    } finally {
      stmt.free();
    }
  }
  if (!result) return { columns: [], rows: [], rowCount: 0, truncated: false };
  return result;
}

function readSchema(): TableInfo[] {
  if (!db) throw new Error("No database initialized.");
  const tables: TableInfo[] = [];

  const list = db.exec(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  );
  const names: string[] = (list[0]?.values ?? []).map((r: unknown[]) => String(r[0]));

  for (const name of names) {
    const colStmt = db.prepare(`PRAGMA table_info("${name.replaceAll('"', '""')}")`);
    const columns: ColumnInfo[] = [];
    while (colStmt.step()) {
      const row = colStmt.get();
      columns.push({
        name: String(row[1]),
        type: String(row[2] ?? ""),
        notNull: Number(row[3]) === 1,
        pk: Number(row[5]) > 0,
      });
    }
    colStmt.free();

    // Rough row count via sqlite_stat1 if present; never blocks on a full COUNT.
    let rowCount: number | undefined;
    try {
      const res = db.exec(
        `SELECT n_distinct FROM sqlite_stat1 WHERE tbl = '${name.replaceAll("'", "''")}' LIMIT 1`,
      );
      rowCount = res[0] ? Number(res[0].values[0][0]) : undefined;
    } catch {
      rowCount = undefined;
    }

    tables.push({ name, columns, rowCount });
  }
  return tables;
}

function previewTable(
  tableName: string,
  limit: number,
): { columns: string[]; rows: CellValue[][] } {
  if (!db) throw new Error("No database initialized.");
  const safe = tableName.replaceAll('"', '""');
  const res = db.exec(`SELECT * FROM "${safe}" LIMIT ${Math.max(1, Math.min(limit, 200))}`);
  if (res.length === 0) return { columns: [], rows: [] };
  const cols = res[0].columns;
  const rows = res[0].values.map((r: unknown[]) => r.map(serializeCell));
  return { columns: cols, rows };
}

function resetDatabase(schemaSql: string, seedSql: string) {
  if (db) {
    try {
      db.close();
    } catch {
      // closing a busy db can throw; discarding the reference is enough in a worker
    }
    db = null;
  }
  db = new (SQL as SqlJsStatic).Database();
  if (schemaSql.trim()) db.exec(schemaSql);
  if (seedSql.trim()) db.exec(seedSql);
}

function buildDb(schemaSql: string, seedSql: string) {
  if (!SQL) throw new Error("SQL.js not initialized.");
  resetDatabase(schemaSql, seedSql);
}

async function handleMessage(ev: MessageEvent<WorkerRequest>) {
  const msg = ev.data;
  try {
    switch (msg.type) {
      case "initializeQuestion": {
        await ensureSqlJs();
        buildDb(msg.schemaSql, msg.seedSql);
        currentQuestionId = msg.questionId;
        post({ type: "ready", questionId: msg.questionId });
        break;
      }
      case "executeQuery": {
        const started = performance.now();
        try {
          const res = executeSql(msg.sql, msg.maxRows);
          post({
            type: "querySuccess",
            requestId: msg.requestId,
            columns: res.columns,
            rows: res.rows,
            rowCount: res.rowCount,
            elapsedMs: Math.round(performance.now() - started),
            truncated: res.truncated,
          });
        } catch (e) {
          const err = e as Error;
          const { message, line, column } = parseErrorWithPosition(err.message);
          post({
            type: "queryError",
            requestId: msg.requestId,
            message,
            ...(line !== undefined ? { line } : {}),
            ...(column !== undefined ? { column } : {}),
          });
        }
        break;
      }
      case "getSchema": {
        post({ type: "schemaSuccess", requestId: msg.requestId, tables: readSchema() });
        break;
      }
      case "previewTable": {
        const res = previewTable(msg.tableName, msg.limit);
        post({ type: "tablePreviewSuccess", requestId: msg.requestId, ...res });
        break;
      }
      case "resetDatabase": {
        if (!SQL || !currentQuestionId) {
          post({ type: "queryError", requestId: msg.requestId, message: "Nothing to reset." });
          break;
        }
        // Rebuild from the original SQL stored at initialization time.
        resetDatabase(initSchemaSql, initSeedSql);
        post({ type: "resetSuccess", requestId: msg.requestId });
        break;
      }
      case "disposeDatabase": {
        if (db) {
          try {
            db.close();
          } catch {
            // ignore
          }
          db = null;
        }
        currentQuestionId = null;
        post({ type: "disposeSuccess", requestId: msg.requestId });
        break;
      }
      default: {
        post({
          type: "workerError",
          message: `Unknown message type: ${(msg as WorkerRequest).type}`,
        });
      }
    }
  } catch (e) {
    post({ type: "workerError", message: (e as Error).message });
  }
}

function parseErrorWithPosition(raw: string): { message: string; line?: number; column?: number } {
  // SQLite errors from sql.js look like: "near \"foo\": syntax error" — position
  // info is not reliably exposed, so we surface a cleaned message and best-effort
  // coordinates from a common pattern like "... at line 3 column 7".
  let m = raw.replace(/^Error: /, "").replace(/^SQL logic error(?: near "[^"]*")?:?\s*/i, "");
  let line: number | undefined;
  let column: number | undefined;
  const pos = m.match(/line (\d+) column (\d+)/i);
  if (pos) {
    line = Number(pos[1]);
    column = Number(pos[2]);
    m = m.replace(/ at line \d+ column \d+/i, "");
  }
  const message = (m.trim() || "Query failed.").replace(/^./, (c) => c.toUpperCase());
  return { message, line, column };
}

ctx.addEventListener("message", (ev) => {
  const msg = ev.data as WorkerRequest;
  if (msg.type === "initializeQuestion") {
    initSchemaSql = msg.schemaSql;
    initSeedSql = msg.seedSql;
  }
  void handleMessage(ev);
});

export {};
