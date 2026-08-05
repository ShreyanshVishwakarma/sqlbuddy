"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  /** Next question in the learning path (easy → medium → hard), if any. */
  nextSlug: string | null;
}

export function SqlWorkspace({ question, nextSlug }: WorkspaceProps) {
  const { metadata } = question;
  const router = useRouter();

  const [editorValue, setEditorValue] = useState<string>(question.starterSql);
  const [answerVisible, setAnswerVisible] = useState(false);
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
  const draftBeforeAnswer = useRef<string | null>(null);

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
      // Never persist the reference answer as a draft.
      if (answerVisible) return;
      if (draftDebounce.current) clearTimeout(draftDebounce.current);
      draftDebounce.current = setTimeout(() => {
        void saveDraft(metadata.id, value);
      }, 400);
    },
    [metadata.id, answerVisible],
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

  // Toggles the reference answer in the editor. The learner's draft is preserved
  // and restored exactly when the answer is hidden again.
  const handleToggleAnswer = useCallback(() => {
    setAnswerVisible((visible) => {
      if (visible) {
        if (draftBeforeAnswer.current !== null) {
          setEditorValue(draftBeforeAnswer.current);
          draftBeforeAnswer.current = null;
        }
        return false;
      }
      draftBeforeAnswer.current = editorValue;
      setEditorValue(question.referenceSql);
      return true;
    });
  }, [editorValue, question.referenceSql]);

  const goToNext = useCallback(() => {
    if (nextSlug) router.push(`/practice/${nextSlug}`);
  }, [nextSlug, router]);

  if (engine === "error") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-foreground text-lg font-semibold">SQLite engine failed to start</p>
        <p className="text-muted-foreground max-w-md text-sm">
          This app needs WebAssembly and Web Workers. Your browser may block them, or the WASM file
          failed to load.
        </p>
        <p className="text-danger max-w-md font-mono text-xs break-all">{engineErrorMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-accent text-accent-foreground hover:bg-accent-strong mt-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      {/* Top bar */}
      <div className="border-border bg-surface flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2">
        <Link
          href={`/questions/${metadata.slug}`}
          className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
        >
          ← Question
        </Link>
        <span className="bg-border-strong h-4 w-px" aria-hidden />
        <h1 className="text-foreground truncate text-sm font-semibold">{metadata.title}</h1>
        <DifficultyBadge difficulty={metadata.difficulty} />
        <button
          onClick={handleToggleBookmark}
          aria-pressed={bookmarked}
          className="text-muted hover:bg-surface-muted hover:text-foreground rounded-md px-1.5 py-1 text-sm transition-colors"
        >
          {bookmarked ? "★" : "☆"}
          <span className="sr-only">{bookmarked ? "Remove bookmark" : "Bookmark"}</span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted hidden text-xs sm:inline">
            {engine === "ready" ? "SQLite ready" : "Initializing…"}
          </span>
          <button
            onClick={handleToggleAnswer}
            aria-pressed={answerVisible}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
              answerVisible
                ? "bg-accent text-accent-foreground hover:bg-accent-strong"
                : "text-muted-foreground ring-border-strong hover:bg-surface-muted hover:text-foreground ring-1 ring-inset"
            }`}
          >
            {answerVisible ? "Hide answer" : "Answer"}
          </button>
          <button
            onClick={handleReset}
            disabled={running || engine !== "ready"}
            className="text-muted-foreground ring-border-strong hover:bg-surface-muted hover:text-foreground rounded-md px-3 py-1.5 text-sm font-medium ring-1 transition-all duration-150 ring-inset active:scale-[0.98] disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={handleRun}
            disabled={running || engine !== "ready"}
            className="bg-foreground text-background rounded-md px-4 py-1.5 text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {running ? "Running…" : "Run ▸"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={running || engine !== "ready" || answerVisible}
            className="bg-accent text-accent-foreground hover:bg-accent-strong rounded-md px-4 py-1.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(280px,340px)_1fr]">
        {/* Left panel */}
        <aside className="border-border bg-surface min-h-0 overflow-y-auto border-b lg:border-r lg:border-b-0">
          <section className="border-border border-b p-5">
            <Markdown source={question.promptMdx} />
          </section>
          <section className="border-border border-b">
            <SchemaExplorer
              tables={tables}
              onPreviewTable={(tableName, limit) => {
                const client = clientRef.current;
                if (!client) throw new Error("SQLite engine not ready.");
                return client.previewTable(tableName, limit);
              }}
            />
          </section>
          <section className="p-5">
            <label
              className="text-muted mb-1.5 block text-xs font-semibold tracking-widest uppercase"
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
              className="border-border bg-surface-muted text-foreground placeholder:text-muted focus:border-accent w-full resize-y rounded-md border p-2.5 text-sm focus:outline-none"
            />
          </section>
        </aside>

        {/* Main panel */}
        <main className="bg-surface flex min-h-0 flex-col">
          <div className="border-border min-h-0 flex-1 border-b">
            <SqlEditor
              value={editorValue}
              onChange={handleEditorChange}
              onRun={() => void handleRun()}
              onSubmit={() => void handleSubmit()}
              disabled={answerVisible}
            />
          </div>

          <div className="flex flex-col">
            <div className="border-border bg-surface h-52 shrink-0 border-b">
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
              <SubmissionPanel
                status={submission}
                result={validation}
                nextSlug={nextSlug}
                onNext={goToNext}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
