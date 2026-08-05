import type { SqliteWorkerClient } from "@/lib/worker";
import type { FixtureDb, QueryResult, ValidationResult } from "./validate";
import { validateSubmission } from "./validate";
import type { QuestionPackage } from "@/content/types";
import { loadValidationFixtures } from "@/content/loader";

export interface RunSqlResult {
  columns: string[];
  rows: (string | number | null)[][];
  rowCount: number;
  elapsedMs: number;
  truncated: boolean;
}

/**
 * Runs learner SQL against the practice database with a cap on returned rows and a
 * per-query timeout enforced by the worker client (which kills and recreates the
 * worker on timeout).
 */
export async function runSql(
  client: SqliteWorkerClient,
  sql: string,
  maxRows: number,
  timeoutMs: number,
): Promise<RunSqlResult> {
  return client.executeQuery({ sql, maxRows, timeoutMs });
}

/** Executes a full script (e.g. fixture schema + data) statement by statement. */
export async function runScript(client: SqliteWorkerClient, sql: string): Promise<void> {
  if (!sql.trim()) return;
  for (const stmt of splitScriptStatements(sql)) {
    await client.executeQuery({ sql: stmt, maxRows: 1, timeoutMs: 10000 });
  }
}

/**
 * Runs fixture-based validation in the browser through the worker client.
 *
 * The worker owns a single practice database. Each fixture needs an isolated
 * database, so we dispose the current one, open a fresh one, load schema + fixture
 * data into it, run the learner SQL and the reference SQL, compare, then move on.
 * Every step executes on the worker thread — the main thread only awaits responses.
 */
export async function validateInWorker(
  client: SqliteWorkerClient,
  question: QuestionPackage,
  learnerSql: string,
): Promise<ValidationResult> {
  // Load fixtures + reference SQL from the client validation bundle.
  const fixtures = loadValidationFixtures().filter((f) => f.metadata.id === question.metadata.id);

  const hooks = {
    async createDatabase(): Promise<FixtureDb> {
      await client.disposeDatabase();
      await client.initializeQuestion({
        questionId: question.metadata.id,
        schemaSql: "", // fixture runs load their own schema
        seedSql: "",
      });
      return new WorkerFixtureDb(client);
    },
  };

  return validateSubmission(question, fixtures, learnerSql, hooks);
}

/** Splits on semicolons that are outside string literals. */
export function splitScriptStatements(sql: string): string[] {
  const out: string[] = [];
  let current = "";
  let inString = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      inString = !inString;
      current += ch;
      continue;
    }
    if (ch === ";" && !inString) {
      const t = current.trim();
      if (t) out.push(t);
      current = "";
      continue;
    }
    current += ch;
  }
  const t = current.trim();
  if (t) out.push(t);
  return out;
}

/** FixtureDb backed by the worker client: exec/runQuery each round-trip to the worker. */
class WorkerFixtureDb implements FixtureDb {
  constructor(private readonly client: SqliteWorkerClient) {}

  async exec(sql: string): Promise<void> {
    for (const stmt of splitScriptStatements(sql)) {
      await this.client.executeQuery({ sql: stmt, maxRows: 1, timeoutMs: 10000 });
    }
  }

  async runQuery(sql: string): Promise<QueryResult> {
    const res = await this.client.executeQuery({ sql, maxRows: 1000, timeoutMs: 10000 });
    return { columns: res.columns, rows: res.rows };
  }
}
