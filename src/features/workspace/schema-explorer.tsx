"use client";

import { useState } from "react";
import type { TableInfo } from "@/lib/worker/protocol";
import type { CellValue } from "@/lib/worker/protocol";

interface SchemaExplorerProps {
  tables: TableInfo[] | null;
  /** Preview callback provided by the workspace (wired to the worker client). */
  onPreviewTable: (
    tableName: string,
    limit: number,
  ) => Promise<{ columns: string[]; rows: CellValue[][] }>;
}

type PreviewState =
  | { table: string; status: "loading" }
  | { table: string; status: "loaded"; columns: string[]; rows: CellValue[][] }
  | { table: string; status: "error"; message: string };

/**
 * Lists tables with their columns and types. Clicking a table previews its rows
 * via the workspace's preview callback (capped at 50).
 */
export function SchemaExplorer({ tables, onPreviewTable }: SchemaExplorerProps) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [openTables, setOpenTables] = useState<Set<string>>(new Set());

  if (!tables) {
    return (
      <div className="flex flex-col gap-2 p-3" aria-busy="true">
        <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  const toggleTable = (name: string) => {
    setOpenTables((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        if (preview?.table === name) setPreview(null);
      } else {
        next.add(name);
        void loadPreview(name);
      }
      return next;
    });
  };

  const loadPreview = async (name: string) => {
    setPreview({ table: name, status: "loading" });
    try {
      const res = await onPreviewTable(name, 50);
      setPreview({ table: name, status: "loaded", columns: res.columns, rows: res.rows });
    } catch (e) {
      setPreview({ table: name, status: "error", message: (e as Error).message });
    }
  };

  return (
    <div className="p-3">
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
        Schema
      </h3>
      <ul className="space-y-1">
        {tables.map((table) => (
          <li key={table.name}>
            <button
              onClick={() => toggleTable(table.name)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-expanded={openTables.has(table.name)}
            >
              <span className="font-mono font-medium">{table.name}</span>
              <span className="text-xs text-slate-400">{table.columns.length} cols</span>
            </button>
            {openTables.has(table.name) && (
              <div className="mt-1 space-y-1 pl-3">
                {table.columns.map((col) => (
                  <div
                    key={col.name}
                    className="flex items-baseline justify-between gap-2 font-mono text-xs"
                  >
                    <span className="text-slate-600 dark:text-slate-300">
                      {col.name}
                      {col.pk && (
                        <span className="ml-1 text-amber-500" title="Primary key">
                          PK
                        </span>
                      )}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500">{col.type || "ANY"}</span>
                  </div>
                ))}
                {preview?.table === table.name && preview.status === "loading" && (
                  <div className="py-1 text-xs text-slate-400" aria-busy="true">
                    Loading preview…
                  </div>
                )}
                {preview?.table === table.name && preview.status === "error" && (
                  <div className="py-1 text-xs text-rose-500">
                    Preview failed: {preview.message}
                  </div>
                )}
                {preview?.table === table.name && preview.status === "loaded" && (
                  <div className="mt-1 overflow-x-auto rounded-md ring-1 ring-slate-200 ring-inset dark:ring-slate-700">
                    <table className="w-full border-collapse font-mono text-[11px]">
                      <thead>
                        <tr>
                          {preview.columns.map((c, i) => (
                            <th
                              key={i}
                              className="border-b border-slate-200 bg-slate-50 px-1.5 py-1 text-left font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                            >
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, 10).map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                className="border-b border-slate-100 px-1.5 py-0.5 text-slate-700 dark:border-slate-800 dark:text-slate-300"
                              >
                                {cell === null ? (
                                  <span className="text-slate-400 italic">NULL</span>
                                ) : (
                                  String(cell)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
