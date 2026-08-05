/**
 * Static registry of question slugs. The registry is generated from the content
 * directory and lets the server statically generate catalogue + question pages
 * without reading the filesystem at request time.
 *
 * When a new question directory is added, run `npm run validate:content` which
 * regenerates this file, or update it by hand and keep it in sync.
 */
export const QUESTION_SLUGS: string[] = [
  // Basics
  "duplicate-emails",
  "employees-earning-more-than-managers",
  "rising-temperature",
  "active-users-per-day",
  "customers-without-orders",
  "second-highest-salary",
  // Aggregation & grouping
  "employees-per-department",
  "percentage-of-total-sales",
  "pivot-quarterly-sales",
  // Joins & subqueries
  "nth-highest-salary",
  // CTEs & dates
  "orders-gap-analysis",
  // Window functions
  "rank-scores",
  "running-total",
  "rolling-average-sales",
  "first-last-order",
  "latest-event-per-user",
  "monthly-sales-ranking",
  "top-three-per-category",
  // Gaps & islands
  "consecutive-logins",
  "longest-login-streak",
];

/** Constant path (relative to public/) where the sql.js WASM binary is served from. */
export const SQL_WASM_PATH = "/sql-wasm/sql-wasm-v1.wasm";

/** Maximum rows rendered in the result grid before showing a truncation notice. */
export const MAX_RESULT_ROWS = 200;

/** Default per-query execution timeout used by the practice workspace. */
export const DEFAULT_QUERY_TIMEOUT_MS = 8000;
