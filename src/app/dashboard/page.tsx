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
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Progress is stored only in this browser (IndexedDB). Clearing browser data resets it.
        </p>
      </header>

      {/* Stat cards */}
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Overall progress">
        <StatCard
          label="Completed"
          value={`${stats.completed} / ${stats.total}`}
          sub="questions passed"
        />
        <StatCard
          label="Attempted"
          value={`${stats.attempted} / ${stats.total}`}
          sub="at least one submission"
        />
        <StatCard label="Bookmarked" value={`${stats.bookmarked}`} sub="questions saved" />
      </section>

      {/* Completion by topic */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
          Completion by topic
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs tracking-wider text-slate-500 uppercase dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Topic</th>
                <th className="px-4 py-2.5 font-semibold">Progress</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.byTopic)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([topic, { total, completed }]) => {
                  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
                  return (
                    <tr key={topic} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-2.5">
                        <TopicChip topic={topic} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-full max-w-52 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-indigo-500 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-xs text-slate-500 dark:text-slate-400">
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
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
          Recently opened
        </h2>
        {stats.recentlyOpened.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nothing yet — open a question to get started.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {stats.recentlyOpened.map((q) => (
              <li key={q.slug}>
                <Link
                  href={`/questions/${q.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <DifficultyBadge difficulty={q.difficulty} />
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                      {q.title}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {states[q.id]?.completed ? "✓ completed" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <Link
          href="/settings"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Settings — theme, notes, clear local data →
        </Link>
      </section>
    </main>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
      <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>
    </div>
  );
}
