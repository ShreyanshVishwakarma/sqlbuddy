/**
 * Static registry of question slugs. The registry is generated from the content
 * directory and lets the server statically generate catalogue + question pages
 * without reading the filesystem at request time.
 *
 * When a new question directory is added, run `npm run validate:content` which
 * regenerates this file, or update it by hand and keep it in sync.
 */
export const QUESTION_SLUGS: string[] = [
  "second-highest-salary",
  "customers-without-orders",
  "monthly-sales-ranking",
  "employees-per-department",
  "orders-gap-analysis",
  "top-three-per-category",
];

/** Constant path (relative to public/) where the sql.js WASM binary is served from. */
export const SQL_WASM_PATH = "/sql-wasm/sql-wasm-v1.wasm";

/** Maximum rows rendered in the result grid before showing a truncation notice. */
export const MAX_RESULT_ROWS = 200;

/** Default per-query execution timeout used by the practice workspace. */
export const DEFAULT_QUERY_TIMEOUT_MS = 8000;
