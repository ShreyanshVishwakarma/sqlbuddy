import Link from "next/link";
import { getAllQuestionSummaries } from "@/lib/questions";
import { DifficultyBadge } from "@/components/ui";

export const dynamic = "force-static";

export default async function HomePage() {
  const questions = await getAllQuestionSummaries();
  const topics = [...new Set(questions.flatMap((q) => q.topics))].sort();
  const easy = questions.filter((q) => q.difficulty === "easy").length;

  return (
    <main className="grain">
      {/* Hero — asymmetric, left-aligned over a subtle ambient glow */}
      <section className="border-border relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_0%,var(--accent-soft),transparent_60%),radial-gradient(40%_40%_at_90%_20%,rgba(13,148,136,0.06),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-20 sm:px-6 sm:pt-28 sm:pb-28">
          <p className="bg-surface text-muted-foreground ring-border mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset">
            <span className="bg-success h-1.5 w-1.5 rounded-full" aria-hidden />
            Runs entirely in your browser
          </p>
          <h1 className="text-foreground max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Practice SQL with a real database, right in the browser.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed">
            Every query you write runs against SQLite compiled to WebAssembly — on your machine, not
            a server. {questions.length} questions, from first SELECTs to window functions, with
            instant pass/fail feedback.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/questions"
              className="bg-accent text-accent-foreground shadow-tinted hover:bg-accent-strong inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
            >
              Browse questions
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:bg-surface-muted hover:text-foreground inline-flex items-center rounded-lg px-5 py-3 text-sm font-semibold transition-colors duration-200"
            >
              Your progress
            </Link>
          </div>
        </div>
      </section>

      {/* How it works — 2-column zig-zag instead of 3 equal cards */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div className="lg:sticky lg:top-24">
            <p className="text-accent mb-3 text-xs font-semibold tracking-widest uppercase">
              The loop
            </p>
            <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
              Open a question. Write SQL. Get graded.
            </h2>
            <p className="text-muted-foreground mt-4 max-w-md leading-relaxed">
              No sign-up, no backend, no waiting. Your answer is checked against hidden fixtures
              with edge cases — duplicates, NULLs, and ties — so passing actually means something.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["easy", "medium", "hard"].map((d) => (
                <DifficultyBadge key={d} difficulty={d as "easy" | "medium" | "hard"} />
              ))}
            </div>
          </div>

          <ol className="space-y-4">
            {[
              {
                step: "01",
                title: "Read the prompt and schema",
                body: "The left panel shows the question, the schema explorer, and sample rows you can click through.",
              },
              {
                step: "02",
                title: "Write and run SQL in a full editor",
                body: "Monaco with syntax highlighting and Ctrl/⌘+Enter to run. Results render instantly from the local engine.",
              },
              {
                step: "03",
                title: "Submit for pass/fail validation",
                body: "Your query runs against every hidden fixture. Pass all of them and the question is marked complete — in this browser.",
              },
            ].map((item) => (
              <li
                key={item.step}
                className="group border-border bg-surface shadow-tinted relative flex gap-5 rounded-xl border p-5 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <span className="text-muted font-mono text-sm font-semibold tabular-nums">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-foreground font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Privacy note — quiet band, not a card-on-card */}
      <section className="border-border bg-surface-muted border-y">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="text-foreground text-xl font-semibold tracking-tight">
              Your data never leaves your device
            </h2>
            <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
              SQL runs in a Web Worker via SQLite WASM. Drafts, progress, bookmarks, and notes live
              only in this browser&apos;s IndexedDB. There is no backend, no analytics, no
              authentication.
            </p>
          </div>
        </div>
      </section>

      {/* Question preview — numbered list with sticky header, not a grid of cards */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-accent mb-3 text-xs font-semibold tracking-widest uppercase">
              The catalogue
            </p>
            <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
              {questions.length} questions, {easy} to start easy.
            </h2>
            <p className="text-muted-foreground mt-4 max-w-md leading-relaxed">
              Ordered from easy to hard so the curve stays gentle. Filter by difficulty, topic, or a
              keyword to focus a session.
            </p>
            <Link
              href="/questions"
              className="text-accent hover:text-accent-strong mt-6 inline-flex items-center gap-2 text-sm font-semibold transition-colors"
            >
              View the full catalogue
              <span aria-hidden>→</span>
            </Link>
          </div>

          <ol className="divide-border border-border bg-surface shadow-tinted divide-y overflow-hidden rounded-xl border">
            {questions.slice(0, 10).map((q, i) => (
              <li key={q.slug}>
                <Link
                  href={`/questions/${q.slug}`}
                  className="group hover:bg-surface-muted flex items-center gap-4 px-5 py-4 transition-colors duration-150"
                >
                  <span className="text-muted w-6 shrink-0 font-mono text-sm tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-foreground group-hover:text-accent truncate font-medium">
                      {q.title}
                    </h3>
                    <p className="text-muted-foreground truncate text-sm">{q.description}</p>
                  </div>
                  <DifficultyBadge difficulty={q.difficulty} />
                  <span
                    aria-hidden
                    className="text-muted ml-2 transition-transform duration-200 group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-muted mt-8 text-center text-sm">
          {topics.length} topics covered — from basic SELECTs to window functions and NULL handling.
        </p>
      </section>
    </main>
  );
}
