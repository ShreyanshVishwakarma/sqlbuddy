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
  "recyclable-low-fat-products",
  "find-customer-referee",
  "big-countries",
  "article-views",
  "invalid-tweets",
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
  "teacher-subjects",
  "class-five-students",
  // Joins & subqueries
  "nth-highest-salary",
  "visited-no-transactions",
  "process-machine-time",
  "employee-bonus",
  "customers-bought-all-products",
  // CTEs & dates
  "orders-gap-analysis",
  "immediate-food-delivery",
  "game-play-activity",
  // Window functions
  "rank-scores",
  "running-total",
  "rolling-average-sales",
  "first-last-order",
  "latest-event-per-user",
  "monthly-sales-ranking",
  "top-three-per-category",
  "consecutive-numbers",
  "exchange-seats",
  // Gaps & islands
  "consecutive-logins",
  "longest-login-streak",
  // Unions & relational division
  "friend-requests-most-friends",
];

/** Constant path (relative to public/) where the sql.js WASM binary is served from. */
export const SQL_WASM_PATH = "/sql-wasm/sql-wasm-v1.wasm";

/** Maximum rows rendered in the result grid before showing a truncation notice. */
export const MAX_RESULT_ROWS = 200;

/** Default per-query execution timeout used by the practice workspace. */
export const DEFAULT_QUERY_TIMEOUT_MS = 8000;
