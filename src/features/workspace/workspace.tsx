"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { QuestionPackage } from "@/content/types";
import { MAX_RESULT_ROWS, DEFAULT_QUERY_TIMEOUT_MS } from "@/lib/constants";
import { createSqliteClient, SqliteWorkerClient } from "@/lib/worker";
import type { TableInfo } from "@/lib/worker/protocol";
import { validateInWorker } from "@/lib/validation/run";
import type { ValidationResult } from "@/lib/validation/validate";
import {
  saveDraft,
  getQuestionState,
  markCompleted,
  incrementAttempts,
  recordQuestionOpened,
  saveNotes,
} from "@/lib/store/db";
import { SqlEditor } from "./sql-editor";
import { SchemaExplorer } from "./schema-explorer";
import {
  ResultsEmpty,
  ResultsError,
  ResultsGrid,
  ResultsSkeleton,
  type QueryResults,
} from "./results-grid";
import { SubmissionPanel, type SubmissionStatus } from "./submission-panel";
import { DifficultyBadge } from "@/components/ui";
import { Markdown } from "@/components/markdown";

type EngineStatus = "initializing" | "ready" | "error";

interface WorkspaceProps {
  question: QuestionPackage;
}

export function SqlWorkspace({ question }: WorkspaceProps) {
  const { metadata } = question;

  const [editorValue, setEditorValue] = useState<string>(question.starterSql);
  const [engine, setEngine] = useState<EngineStatus>("initializing");
  const [engineErrorMessage, setEngineErrorMessage] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[] | null>(null);
  const [results, setResults] = useState<QueryResults | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [submission, setSubmission] = useState<SubmissionStatus>("idle");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [notes, setNotes] = useState("");

  const clientRef = useRef<SqliteWorkerClient | null>(null);
  const notesDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Engine lifecycle: created once on mount, disposed on unmount ----
  useEffect(() => {
    const client = createSqliteClient();
    clientRef.current = client;

    let cancelled = false;
    async function init() {
      try {
        await client.initializeQuestion({
          questionId: metadata.id,
          schemaSql: question.schemaSql,
          seedSql: question.seedSql,
        });
        if (cancelled) return;
        setEngine("ready");
        const schema = await client.getSchema();
        if (!cancelled) setTables(schema);
      } catch (e) {
        if (cancelled) return;
        setEngineErrorMessage((e as Error).message);
        setEngine("error");
      }
    }
    void init();

    return () => {
      cancelled = true;
      client.dispose();
    };
  }, [metadata.id, question.schemaSql, question.seedSql]);

  // ---- Restore persisted draft / state once ----
  useEffect(() => {
    let cancelled = false;
    void getQuestionState(metadata.id).then((state) => {
      if (cancelled) return;
      setBookmarked(state.bookmarked);
      setNotes(state.notes);
      if (state.draft && state.draft.trim()) {
        setEditorValue(state.draft);
      }
    });
    void recordQuestionOpened(metadata.id);
    return () => {
      cancelled = true;
    };
  }, [metadata.id]);

  // ---- Autosave draft with debounce ----
  const handleEditorChange = useCallback(
    (value: string) => {
      setEditorValue(value);
      if (draftDebounce.current) clearTimeout(draftDebounce.current);
      draftDebounce.current = setTimeout(() => {
        void saveDraft(metadata.id, value);
      }, 400);
    },
    [metadata.id],
  );

  // ---- Notes autosave ----
  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value);
      if (notesDebounce.current) clearTimeout(notesDebounce.current);
      notesDebounce.current = setTimeout(() => {
        void saveNotes(metadata.id, value);
      }, 500);
    },
    [metadata.id],
  );

  const handleRun = useCallback(async () => {
    const client = clientRef.current;
    if (!client || engine !== "ready" || running) return;
    setRunning(true);
    setRunError(null);
    setResults(null);
    try {
      const res = await client.executeQuery({
        sql: editorValue,
        maxRows: MAX_RESULT_ROWS,
        timeoutMs: DEFAULT_QUERY_TIMEOUT_MS,
      });
      setResults(res);
    } catch (e) {
      setRunError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }, [clientRef, engine, running, editorValue]);

  const handleSubmit = useCallback(async () => {
    const client = clientRef.current;
    if (!client || engine !== "ready" || running) return;
    setRunning(true);
    setSubmission("evaluating");
    setValidation(null);
    try {
      await incrementAttempts(metadata.id);
      const result = await validateInWorker(client, question, editorValue);
      // Validation disposes/re-creates the worker DB per fixture; restore the
      // practice database so the workspace continues where the learner left off.
      await client.disposeDatabase();
      await client.initializeQuestion({
        questionId: metadata.id,
        schemaSql: question.schemaSql,
        seedSql: question.seedSql,
      });
      setValidation(result);
      if (result.passed) {
        setSubmission("passed");
        await markCompleted(metadata.id);
      } else {
        setSubmission("failed");
      }
    } catch (e) {
      setSubmission("failed");
      setValidation({
        passed: false,
        passedCount: 0,
        totalCount: 0,
        outcomes: [],
        error: (e as Error).message,
      });
    } finally {
      setRunning(false);
    }
  }, [clientRef, engine, running, editorValue, question, metadata.id]);

  const handleReset = useCallback(async () => {
    const client = clientRef.current;
    if (!client || engine !== "ready" || running) return;
    setRunning(true);
    setRunError(null);
    setResults(null);
    setSubmission("idle");
    setValidation(null);
    try {
      await client.resetDatabase();
      const schema = await client.getSchema();
      setTables(schema);
    } catch (e) {
      setRunError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }, [clientRef, engine, running]);

  const handleToggleBookmark = useCallback(async () => {
    const next = await (await import("@/lib/store/db")).toggleBookmark(metadata.id);
    setBookmarked(next);
  }, [metadata.id]);

  if (engine === "error") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          SQLite engine failed to start
        </p>
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
          This app needs WebAssembly and Web Workers. Your browser may block them, or the WASM file
          failed to load.
        </p>
        <p className="max-w-md font-mono text-xs break-all text-rose-500">{engineErrorMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-950">
        <Link
          href={`/questions/${metadata.slug}`}
          className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← Question
        </Link>
        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
        <h1 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {metadata.title}
        </h1>
        <DifficultyBadge difficulty={metadata.difficulty} />
        <button
          onClick={handleToggleBookmark}
          aria-pressed={bookmarked}
          className="ml-1 rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {bookmarked ? "★" : "☆"}
          <span className="sr-only">{bookmarked ? "Remove bookmark" : "Bookmark"}</span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-slate-400 sm:inline">
            {engine === "ready" ? "SQLite ready" : "Initializing…"}
          </span>
          <button
            onClick={handleReset}
            disabled={running || engine !== "ready"}
            className="rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-slate-200 ring-inset hover:bg-slate-100 disabled:opacity-50 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            Reset
          </button>
          <button
            onClick={handleRun}
            disabled={running || engine !== "ready"}
            className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {running ? "Running…" : "Run ▸"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={running || engine !== "ready"}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(280px,340px)_1fr]">
        {/* Left panel */}
        <aside className="min-h-0 overflow-y-auto border-b border-slate-200 bg-slate-50/60 lg:border-r lg:border-b-0 dark:border-slate-800 dark:bg-slate-900/40">
          <section className="border-b border-slate-200 p-4 dark:border-slate-800">
            <Markdown source={question.promptMdx} />
          </section>
          <section className="border-b border-slate-200 dark:border-slate-800">
            <SchemaExplorer
              tables={tables}
              onPreviewTable={(tableName, limit) => {
                const client = clientRef.current;
                if (!client) throw new Error("SQLite engine not ready.");
                return client.previewTable(tableName, limit);
              }}
            />
          </section>
          <section className="p-4">
            <label
              className="mb-1 block text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400"
              htmlFor="question-notes"
            >
              Notes
            </label>
            <textarea
              id="question-notes"
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Your private notes for this question…"
              rows={4}
              className="w-full resize-y rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </section>
        </aside>

        {/* Main panel */}
        <main className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 border-b border-slate-200 dark:border-slate-800">
            <SqlEditor
              value={editorValue}
              onChange={handleEditorChange}
              onRun={() => void handleRun()}
              onSubmit={() => void handleSubmit()}
            />
          </div>

          <div className="flex flex-col">
            <div className="h-52 shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              {runError ? (
                <ResultsError message={runError} />
              ) : results ? (
                <ResultsGrid results={results} />
              ) : running ? (
                <ResultsSkeleton />
              ) : engine === "initializing" ? (
                <ResultsSkeleton />
              ) : (
                <ResultsEmpty />
              )}
            </div>
            <div className="px-4 py-2.5">
              <SubmissionPanel status={submission} result={validation} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
