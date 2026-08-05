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

export async function getAllQuestionSummaries(): Promise<QuestionSummary[]> {
  return (await loadAllQuestions()).map((q: QuestionPackage) => ({
    slug: q.metadata.slug,
    title: q.metadata.title,
    difficulty: q.metadata.difficulty,
    topics: q.metadata.topics,
    description: q.metadata.description,
    id: q.metadata.id,
  }));
}

export async function getQuestionSummary(slug: string): Promise<QuestionSummary | undefined> {
  return (await getAllQuestionSummaries()).find((q) => q.slug === slug);
}
