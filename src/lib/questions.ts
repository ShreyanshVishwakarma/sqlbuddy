// Content is loaded at build time (server) and bundled into the static export via
// content-bundle.json. See scripts/generate-bundle.mjs and scripts/validate-questions.ts.
export interface QuestionSummary {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  description: string;
  id: string;
}

import { loadAllQuestions } from "@/content/loader";
import type { QuestionPackage } from "@/content/types";

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

export async function getAllQuestionSummaries(): Promise<QuestionSummary[]> {
  const qs = await loadAllQuestions();
  return qs
    .map((q: QuestionPackage) => ({
      slug: q.metadata.slug,
      title: q.metadata.title,
      difficulty: q.metadata.difficulty,
      topics: q.metadata.topics,
      description: q.metadata.description,
      id: q.metadata.id,
    }))
    .sort(
      (a, b) =>
        DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] ||
        a.title.localeCompare(b.title),
    );
}

export async function getQuestionSummary(slug: string): Promise<QuestionSummary | undefined> {
  return (await getAllQuestionSummaries()).find((q) => q.slug === slug);
}

/**
 * Learning path: questions ordered easy → medium → hard. Returns the next question
 * after `slug` in that path, or null when `slug` is the last one.
 */
export async function getNextQuestionSlug(slug: string): Promise<string | null> {
  const path = await getAllQuestionSummaries();
  const index = path.findIndex((q) => q.slug === slug);
  if (index === -1) return path[0]?.slug ?? null;
  return path[index + 1]?.slug ?? null;
}
