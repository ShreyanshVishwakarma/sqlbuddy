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
    <div className="flex h-full min-h-32 flex-col items-center justify-center gap-1.5 text-center">
      <span className="text-muted font-mono text-lg" aria-hidden>
        ▸ _
      </span>
      <p className="text-muted-foreground text-sm font-medium">No results yet</p>
      <p className="text-muted text-xs">Run your query or press Ctrl/⌘ + Enter</p>
    </div>
  );
}

/** SQL error state. */
export function ResultsError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="border-danger bg-danger-soft flex h-full min-h-32 items-start gap-3 border-l-2 p-4"
    >
      <span className="bg-danger mt-0.5 rounded px-1.5 py-0.5 text-[11px] font-bold text-white uppercase">
        SQL error
      </span>
      <div>
        <p className="text-danger font-mono text-sm">{message}</p>
        <p className="text-muted-foreground mt-1 text-xs">
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
      <div className="bg-surface-muted h-3 w-24 animate-pulse rounded" />
      <div className="bg-surface-muted h-3 w-full animate-pulse rounded" />
      <div className="bg-surface-muted h-3 w-3/4 animate-pulse rounded" />
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
 * Uses sticky headers and monospace cells with tabular figures.
 */
export function ResultsGrid({ results }: { results: QueryResults }) {
  const rows = results.rows;
  const capped = results.truncated || results.rowCount > MAX_RESULT_ROWS;
  const displayRows = capped ? rows.slice(0, MAX_RESULT_ROWS) : rows;

  return (
    <div className="flex h-full flex-col">
      <div className="border-border bg-surface-muted text-muted-foreground flex items-center justify-between border-b px-4 py-1.5 text-xs tabular-nums">
        <span>
          {results.rowCount} row{results.rowCount === 1 ? "" : "s"} · {results.elapsedMs} ms
        </span>
        {capped && (
          <span className="text-warning font-medium">
            Showing first {displayRows.length} of {results.rowCount} rows
          </span>
        )}
      </div>
      <div className="bg-surface min-h-0 flex-1 overflow-auto">
        <table className="w-max min-w-full border-collapse text-left font-mono text-xs tabular-nums">
          <thead className="sticky top-0 z-10">
            <tr>
              {results.columns.map((col, i) => (
                <th
                  key={i}
                  className="border-border bg-surface-muted text-foreground border-b px-3 py-1.5 font-semibold"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, ri) => (
              <tr key={ri} className="odd:bg-surface even:bg-surface-muted/60">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`border-border/60 border-b px-3 py-1 whitespace-nowrap ${
                      cell === null ? "text-muted italic" : "text-foreground"
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
