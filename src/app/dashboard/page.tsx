"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAllQuestionSummaries, type QuestionSummary } from "@/lib/questions";
import { getAllQuestionStates, type QuestionState } from "@/lib/store/db";
import { DifficultyBadge, TopicChip } from "@/components/ui";

export default function DashboardPage() {
  const [states, setStates] = useState<Record<string, QuestionState>>({});
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([getAllQuestionSummaries(), getAllQuestionStates()]).then(([qs, s]) => {
      if (!active) return;
      setQuestions(qs);
      setStates(s);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = questions.length;
    const completed = questions.filter((q) => states[q.id]?.completed).length;
    const attempted = questions.filter((q) => (states[q.id]?.attemptCount ?? 0) > 0).length;
    const bookmarked = questions.filter((q) => states[q.id]?.bookmarked).length;

    const byTopic: Record<string, { total: number; completed: number }> = {};
    for (const q of questions) {
      for (const t of q.topics) {
        const bucket = (byTopic[t] ??= { total: 0, completed: 0 });
        bucket.total += 1;
        if (states[q.id]?.completed) bucket.completed += 1;
      }
    }

    const recentlyOpened = [...questions]
      .filter((q) => states[q.id]?.lastOpenedAt)
      .sort((a, b) =>
        (states[b.id]?.lastOpenedAt ?? "").localeCompare(states[a.id]?.lastOpenedAt ?? ""),
      )
      .slice(0, 5);

    return { total, completed, attempted, bookmarked, byTopic, recentlyOpened };
  }, [questions, states]);

  if (!loaded) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="bg-surface-muted h-8 w-48 animate-pulse rounded" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-surface-muted h-28 animate-pulse rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  const pct = stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100);

  return (
    <main className="grain mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-10 max-w-2xl">
        <p className="text-accent mb-3 text-xs font-semibold tracking-widest uppercase">
          Your progress
        </p>
        <h1 className="text-foreground text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-3">
          Stored only in this browser (IndexedDB). Clearing browser data resets it.
        </p>
      </header>

      {/* Stat cards — layered, not bordered boxes */}
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Overall progress">
        <StatCard
          label="Completed"
          value={`${stats.completed}`}
          sub={`of ${stats.total} questions`}
          accent
        />
        <StatCard label="Attempted" value={`${stats.attempted}`} sub="at least one submission" />
        <StatCard label="Bookmarked" value={`${stats.bookmarked}`} sub="questions saved" />
      </section>

      {/* Overall completion bar */}
      <section className="bg-surface-muted mt-6 rounded-xl p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-foreground text-sm font-medium">Overall completion</p>
          <p className="text-muted-foreground text-sm tabular-nums">{pct}%</p>
        </div>
        <div className="bg-background mt-3 h-2.5 overflow-hidden rounded-full">
          <div
            className="bg-accent h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      {/* Completion by topic */}
      <section className="mt-10">
        <h2 className="text-foreground mb-4 text-lg font-semibold tracking-tight">
          Completion by topic
        </h2>
        <div className="border-border bg-surface shadow-tinted overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-muted text-left text-xs tracking-widest uppercase">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Topic</th>
                <th className="px-4 py-2.5 font-semibold">Progress</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.byTopic)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([topic, { total, completed }]) => {
                  const tpct = total === 0 ? 0 : Math.round((completed / total) * 100);
                  return (
                    <tr key={topic} className="border-border border-t">
                      <td className="px-4 py-2.5">
                        <TopicChip topic={topic} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="bg-surface-muted h-2 w-full max-w-52 overflow-hidden rounded-full">
                            <div
                              className="bg-accent h-full rounded-full transition-all duration-500"
                              style={{ width: `${tpct}%` }}
                            />
                          </div>
                          <span className="text-muted w-12 text-right text-xs tabular-nums">
                            {completed}/{total}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recently opened */}
      <section className="mt-10">
        <h2 className="text-foreground mb-4 text-lg font-semibold tracking-tight">
          Recently opened
        </h2>
        {stats.recentlyOpened.length === 0 ? (
          <div className="border-border-strong rounded-xl border border-dashed p-10 text-center">
            <p className="text-foreground text-sm font-medium">Nothing here yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Open a question to start building your streak.
            </p>
            <Link
              href="/questions"
              className="bg-accent text-accent-foreground hover:bg-accent-strong mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            >
              Browse questions
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : (
          <ul className="divide-border border-border bg-surface shadow-tinted divide-y overflow-hidden rounded-xl border">
            {stats.recentlyOpened.map((q) => (
              <li key={q.slug}>
                <Link
                  href={`/questions/${q.slug}`}
                  className="hover:bg-surface-muted flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-150"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <DifficultyBadge difficulty={q.difficulty} />
                    <span className="text-foreground truncate font-medium">{q.title}</span>
                  </div>
                  {states[q.id]?.completed && (
                    <span className="text-success shrink-0 text-xs font-medium">✓ completed</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface-muted shadow-tinted rounded-xl p-5">
      <p className="text-muted text-xs font-semibold tracking-widest uppercase">{label}</p>
      <p
        className={`mt-1 text-3xl font-bold tabular-nums ${accent ? "text-accent" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">{sub}</p>
    </div>
  );
}
