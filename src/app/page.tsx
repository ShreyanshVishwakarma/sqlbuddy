import Link from "next/link";
import { getAllQuestionSummaries } from "@/lib/questions";
import { DifficultyBadge, TopicChip } from "@/components/ui";

export const dynamic = "force-static";

export default async function HomePage() {
  const questions = await getAllQuestionSummaries();
  const topics = [...new Set(questions.flatMap((q) => q.topics))].sort();

  return (
    <main className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 py-20 text-center">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 ring-1 ring-indigo-200 ring-inset dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-800">
          100% local · SQLite in your browser · no sign-up
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
          Practice SQL interview questions with a real database —{" "}
          <span className="text-indigo-600 dark:text-indigo-400">right in your browser</span>.
        </h1>
        <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Every query you write runs against a genuine SQLite database compiled to WebAssembly,
          executing entirely on your machine. Write SQL, run it, see real results, and get pass/fail
          feedback against hidden test fixtures. No backend, no accounts, no waiting.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/questions"
            className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            Browse questions
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg px-6 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition-colors ring-inset hover:bg-slate-100 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-800"
          >
            Your progress
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="grid gap-4 py-10 sm:grid-cols-3">
        {[
          {
            title: "Open a question",
            body: "Read the prompt, inspect the schema, and browse sample rows in the schema explorer.",
          },
          {
            title: "Write & run SQL",
            body: "A full Monaco editor with syntax highlighting. Results render instantly from a local SQLite engine.",
          },
          {
            title: "Submit & learn",
            body: "Your answer is validated against hidden fixtures with edge cases. Pass and it's marked complete — locally.",
          },
        ].map((step, i) => (
          <div
            key={step.title}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 dark:border-slate-800 dark:bg-slate-900/40"
          >
            <span className="text-xs font-semibold tracking-wider text-indigo-500 uppercase">
              Step {i + 1}
            </span>
            <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {step.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{step.body}</p>
          </div>
        ))}
      </section>

      {/* Privacy note */}
      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 dark:border-slate-800 dark:bg-slate-900/40">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Your data never leaves your device
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          All SQL execution happens in a Web Worker using SQLite compiled to WebAssembly — no query
          is ever sent to a server. Drafts, progress, bookmarks, and notes are stored only in your
          browser&apos;s IndexedDB. There is no backend, no analytics, and no authentication.{" "}
          <strong>Queries run locally.</strong>
        </p>
      </section>

      {/* Question preview */}
      <section className="py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Practice questions
          </h2>
          <Link
            href="/questions"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            View all →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {questions.slice(0, 9).map((q) => (
            <Link
              key={q.slug}
              href={`/questions/${q.slug}`}
              className="group rounded-xl border border-slate-200 p-5 transition-colors hover:border-indigo-300 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:border-indigo-700 dark:hover:bg-slate-900/40"
            >
              <div className="mb-2 flex items-center gap-2">
                <DifficultyBadge difficulty={q.difficulty} />
                <span className="text-xs text-slate-400">{q.topics.length} topics</span>
              </div>
              <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                {q.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                {q.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {q.topics.slice(0, 3).map((t) => (
                  <TopicChip key={t} topic={t} />
                ))}
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {topics.length} distinct topics covered — from basic SELECTs to window functions and NULL
          handling.
        </p>
      </section>
    </main>
  );
}
