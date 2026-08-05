"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAllQuestionSummaries, type QuestionSummary } from "@/lib/questions";
import { DifficultyBadge, TopicChip } from "@/components/ui";

type DifficultyFilter = "all" | "easy" | "medium" | "hard";

const DIFFICULTIES: DifficultyFilter[] = ["all", "easy", "medium", "hard"];

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);

  useEffect(() => {
    let active = true;
    void getAllQuestionSummaries().then((qs) => {
      if (active) setQuestions(qs);
    });
    return () => {
      active = false;
    };
  }, []);

  const topics = useMemo(
    () => [...new Set(questions.flatMap((q) => q.topics))].sort(),
    [questions],
  );

  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [topic, setTopic] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return questions.filter((item) => {
      if (difficulty !== "all" && item.difficulty !== difficulty) return false;
      if (topic !== "all" && !item.topics.includes(topic)) return false;
      if (q) {
        const haystack = `${item.title} ${item.description} ${item.topics.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [questions, query, difficulty, topic]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Questions
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          {questions.length} interview questions covering joins, aggregation, window functions, and
          more.
        </p>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="search">
          Search questions
        </label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or keyword…"
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none sm:w-72 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <div
          role="group"
          aria-label="Filter by difficulty"
          className="flex overflow-hidden rounded-md ring-1 ring-slate-200 ring-inset dark:ring-slate-700"
        >
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              aria-pressed={difficulty === d}
              className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                difficulty === d
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="topic-filter">
          Filter by topic
        </label>
        <select
          id="topic-filter"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          <option value="all">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {questions.length === 0 ? (
        <p className="py-12 text-center text-slate-500 dark:text-slate-400" aria-busy="true">
          Loading questions…
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-slate-500 dark:text-slate-400">
          No questions match your filters.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((q) => (
            <QuestionCard key={q.slug} question={q} />
          ))}
        </ul>
      )}
    </main>
  );
}

function QuestionCard({ question }: { question: QuestionSummary }) {
  return (
    <li>
      <Link
        href={`/questions/${question.slug}`}
        className="group flex h-full flex-col rounded-xl border border-slate-200 p-5 transition-colors hover:border-indigo-300 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:border-indigo-700 dark:hover:bg-slate-900/40"
      >
        <div className="mb-2 flex items-center justify-between">
          <DifficultyBadge difficulty={question.difficulty} />
        </div>
        <h2 className="font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
          {question.title}
        </h2>
        <p className="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-300">
          {question.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          {question.topics.map((t) => (
            <TopicChip key={t} topic={t} />
          ))}
        </div>
      </Link>
    </li>
  );
}
