"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAllQuestionSummaries, type QuestionSummary } from "@/lib/questions";
import { getAllQuestionStates, type QuestionState } from "@/lib/store/db";
import { DifficultyBadge, TopicChip } from "@/components/ui";

type DifficultyFilter = "all" | "easy" | "medium" | "hard";

const DIFFICULTIES: DifficultyFilter[] = ["all", "easy", "medium", "hard"];

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [states, setStates] = useState<Record<string, QuestionState>>({});

  useEffect(() => {
    let active = true;
    void Promise.all([getAllQuestionSummaries(), getAllQuestionStates()]).then(([qs, s]) => {
      if (!active) return;
      setQuestions(qs);
      setStates(s);
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

  const done = questions.filter((item) => states[item.id]?.completed).length;

  return (
    <main className="grain mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-10 max-w-2xl">
        <p className="text-accent mb-3 text-xs font-semibold tracking-widest uppercase">
          The catalogue
        </p>
        <h1 className="text-foreground text-4xl font-bold tracking-tight">Questions</h1>
        <p className="text-muted-foreground mt-3">
          {questions.length} questions, ordered from easy to hard.{" "}
          {done > 0
            ? `${done} completed in this browser.`
            : "Nothing completed yet — start with an easy one."}
        </p>
      </header>

      {/* Filters */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="search">
          Search questions
        </label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or keyword…"
          className="border-border bg-surface text-foreground placeholder:text-muted focus:border-accent w-full rounded-lg border px-3.5 py-2 text-sm sm:w-72"
        />
        <div
          role="group"
          aria-label="Filter by difficulty"
          className="ring-border-strong flex overflow-hidden rounded-lg ring-1 ring-inset"
        >
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              aria-pressed={difficulty === d}
              className={`px-3.5 py-2 text-xs font-semibold capitalize transition-colors duration-150 ${
                difficulty === d
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground"
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
          className="border-border bg-surface text-foreground focus:border-accent rounded-lg border px-3.5 py-2 text-sm"
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
        <div className="py-20 text-center" aria-busy="true">
          <div className="bg-surface-muted mx-auto h-8 w-48 animate-pulse rounded" />
          <div className="bg-surface-muted mx-auto mt-4 h-3 w-64 animate-pulse rounded" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground py-20 text-center">No questions match your filters.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((q) => (
            <QuestionCard key={q.slug} question={q} completed={!!states[q.id]?.completed} />
          ))}
        </ul>
      )}
    </main>
  );
}

function QuestionCard({ question, completed }: { question: QuestionSummary; completed: boolean }) {
  return (
    <li className="h-full">
      <Link
        href={`/questions/${question.slug}`}
        className="group border-border bg-surface shadow-tinted hover:border-border-strong flex h-full flex-col rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <DifficultyBadge difficulty={question.difficulty} />
          {completed ? (
            <span className="text-success inline-flex items-center gap-1 text-xs font-medium">
              <span aria-hidden>✓</span> completed
            </span>
          ) : (
            <span className="text-muted text-xs">not started</span>
          )}
        </div>
        <h2 className="text-foreground group-hover:text-accent font-semibold">{question.title}</h2>
        <p className="text-muted-foreground mt-1.5 flex-1 text-sm leading-relaxed">
          {question.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {question.topics.slice(0, 3).map((t) => (
            <TopicChip key={t} topic={t} />
          ))}
        </div>
      </Link>
    </li>
  );
}
