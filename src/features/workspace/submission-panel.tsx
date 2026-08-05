"use client";

import type { ValidationResult } from "@/lib/validation/validate";

export type SubmissionStatus = "idle" | "evaluating" | "passed" | "failed";

interface SubmissionPanelProps {
  status: SubmissionStatus;
  result: ValidationResult | null;
  /** Slug of the next question in the learning path, if any. */
  nextSlug?: string | null;
  onNext?: () => void;
}

/**
 * Shows the current submission state. After evaluation, reports only the number of
 * fixtures passed — never the hidden fixture contents. On a pass, offers to jump
 * straight to the next question in the learning path.
 */
export function SubmissionPanel({ status, result, nextSlug, onNext }: SubmissionPanelProps) {
  if (status === "idle") {
    return (
      <div className="border-border-strong text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm">
        <span aria-hidden className="text-muted">
          ○
        </span>
        Not submitted yet. Press{" "}
        <kbd className="bg-surface-muted text-foreground ring-border-strong rounded px-1.5 py-0.5 font-mono text-xs ring-1 ring-inset">
          Ctrl/⌘ + Shift + Enter
        </kbd>{" "}
        to check your answer.
      </div>
    );
  }

  if (status === "evaluating") {
    return (
      <div className="border-border text-muted-foreground flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm">
        <span
          className="border-accent h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent"
          aria-hidden
        />
        Evaluating your answer against hidden fixtures…
      </div>
    );
  }

  if (status === "passed") {
    return (
      <div
        role="status"
        className="border-success/30 bg-success-soft flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
      >
        <p className="text-success flex items-center gap-2 text-sm font-medium">
          <span aria-hidden>✓</span>
          Passed — matches the reference on all {result?.totalCount ?? 0} fixtures.
        </p>
        {nextSlug && (
          <button
            onClick={onNext}
            className="bg-success inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          >
            Next question
            <span aria-hidden>→</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="border-danger/30 bg-danger-soft text-danger rounded-lg border px-3 py-2.5 text-sm"
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
