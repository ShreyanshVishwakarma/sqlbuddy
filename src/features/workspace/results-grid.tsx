"use client";

import type { CellValue } from "@/lib/worker/protocol";
import { MAX_RESULT_ROWS } from "@/lib/constants";

export interface QueryResults {
  columns: string[];
  rows: CellValue[][];
  rowCount: number;
  elapsedMs: number;
  truncated: boolean;
}

/** Empty state shown before the first query. */
export function ResultsEmpty() {
  return (
    <div className="flex h-full min-h-32 flex-col items-center justify-center gap-1 text-center text-sm text-slate-400">
      <p>No results yet</p>
      <p className="text-xs">Run your query or press Ctrl/Cmd + Enter</p>
    </div>
  );
}

/** SQL error state. */
export function ResultsError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex h-full min-h-32 items-start gap-2 border-t-2 border-rose-500 bg-rose-50 p-4 dark:bg-rose-950/40"
    >
      <span className="mt-0.5 rounded bg-rose-600 px-1.5 py-0.5 text-xs font-semibold text-white">
        SQL Error
      </span>
      <div>
        <p className="font-mono text-sm text-rose-700 dark:text-rose-300">{message}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Your editor content was kept — fix the query and run again.
        </p>
      </div>
    </div>
  );
}

/** Loading skeleton while SQLite initializes. */
export function ResultsSkeleton() {
  return (
    <div className="flex h-full min-h-32 flex-col gap-2 p-4" aria-busy="true">
      <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

function cellDisplay(value: CellValue): string {
  if (value === null) return "NULL";
  return String(value);
}

/**
 * Result grid. Rows are capped at MAX_RESULT_ROWS in the workspace before reaching
 * here; the grid itself renders plain rows (interview result sets are small).
 * Uses sticky headers and monospace cells for a developer-tool feel.
 */
export function ResultsGrid({ results }: { results: QueryResults }) {
  const rows = results.rows;
  const capped = results.truncated || results.rowCount > MAX_RESULT_ROWS;
  const displayRows = capped ? rows.slice(0, MAX_RESULT_ROWS) : rows;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <span>
          {results.rowCount} row{results.rowCount === 1 ? "" : "s"} · {results.elapsedMs} ms
        </span>
        {capped && (
          <span className="font-medium text-amber-600 dark:text-amber-400">
            Showing first {displayRows.length} of {results.rowCount} rows
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-max min-w-full border-collapse text-left font-mono text-xs">
          <thead className="sticky top-0 z-10">
            <tr>
              {results.columns.map((col, i) => (
                <th
                  key={i}
                  className="border-b border-slate-200 bg-slate-100 px-3 py-1.5 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, ri) => (
              <tr
                key={ri}
                className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-slate-950 dark:even:bg-slate-900/40"
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`border-b border-slate-100 px-3 py-1 whitespace-nowrap dark:border-slate-800 ${
                      cell === null
                        ? "text-slate-400 italic dark:text-slate-500"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {cellDisplay(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
