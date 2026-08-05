"use client";

import type { ValidationResult } from "@/lib/validation/validate";

export type SubmissionStatus = "idle" | "evaluating" | "passed" | "failed";

interface SubmissionPanelProps {
  status: SubmissionStatus;
  result: ValidationResult | null;
}

/**
 * Shows the current submission state. After evaluation, reports only the number of
 * fixtures passed — never the hidden fixture contents.
 */
export function SubmissionPanel({ status, result }: SubmissionPanelProps) {
  if (status === "idle") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
        <span aria-hidden>○</span> Not submitted yet. Press{" "}
        <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
          Ctrl/⌘ + Shift + Enter
        </kbd>{" "}
        to check your answer.
      </div>
    );
  }

  if (status === "evaluating") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
          aria-hidden
        />
        Evaluating your answer against hidden test fixtures…
      </div>
    );
  }

  if (status === "passed") {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      >
        <span aria-hidden>✓</span> Passed — your query matches the reference on all{" "}
        {result?.totalCount ?? 0} fixtures.
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
    >
      <p className="font-medium">
        <span aria-hidden>✕</span> Not quite — {result?.passedCount ?? 0} of{" "}
        {result?.totalCount ?? 0} fixtures passed.
      </p>
      {result?.error && <p className="mt-1 text-xs opacity-80">{result.error}</p>}
      {result && !result.error && result.outcomes.length > 0 && (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs opacity-80">
          {result.outcomes.map((o) => (
            <li key={o.fixtureId}>
              {o.label}: {o.passed ? "passed" : `failed — ${o.reason}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
