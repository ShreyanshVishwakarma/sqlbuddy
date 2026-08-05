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
        <div className="bg-surface-muted h-3 w-20 animate-pulse rounded" />
        <div className="bg-surface-muted h-3 w-32 animate-pulse rounded" />
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
      <h3 className="text-muted mb-2 px-1 text-xs font-semibold tracking-widest uppercase">
        Schema
      </h3>
      <ul className="space-y-1">
        {tables.map((table) => (
          <li key={table.name}>
            <button
              onClick={() => toggleTable(table.name)}
              className="text-foreground hover:bg-surface-muted flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150"
              aria-expanded={openTables.has(table.name)}
            >
              <span className="font-mono font-medium">{table.name}</span>
              <span className="text-muted text-xs tabular-nums">{table.columns.length} cols</span>
            </button>
            {openTables.has(table.name) && (
              <div className="mt-1 space-y-1 pl-3">
                {table.columns.map((col) => (
                  <div
                    key={col.name}
                    className="flex items-baseline justify-between gap-2 font-mono text-xs"
                  >
                    <span className="text-muted-foreground">
                      {col.name}
                      {col.pk && (
                        <span
                          className="bg-warning/10 text-warning ml-1 rounded px-1 py-px text-[10px] font-semibold"
                          title="Primary key"
                        >
                          PK
                        </span>
                      )}
                    </span>
                    <span className="text-muted">{col.type || "ANY"}</span>
                  </div>
                ))}
                {preview?.table === table.name && preview.status === "loading" && (
                  <div className="text-muted py-1 text-xs" aria-busy="true">
                    Loading preview…
                  </div>
                )}
                {preview?.table === table.name && preview.status === "error" && (
                  <div className="text-danger py-1 text-xs">Preview failed: {preview.message}</div>
                )}
                {preview?.table === table.name && preview.status === "loaded" && (
                  <div className="ring-border mt-1 overflow-x-auto rounded-md ring-1 ring-inset">
                    <table className="w-full border-collapse font-mono text-[11px] tabular-nums">
                      <thead>
                        <tr>
                          {preview.columns.map((c, i) => (
                            <th
                              key={i}
                              className="border-border bg-surface-muted text-muted-foreground border-b px-1.5 py-1 text-left font-medium"
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
                                className="border-border/60 text-muted-foreground border-b px-1.5 py-0.5"
                              >
                                {cell === null ? (
                                  <span className="text-muted italic">NULL</span>
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
