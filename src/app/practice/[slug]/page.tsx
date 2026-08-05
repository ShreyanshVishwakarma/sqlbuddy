import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadQuestion } from "@/content/loader";
import { nodeLoader } from "@/content/node-loader";
import { getNextQuestionSlug } from "@/lib/questions";
import { QUESTION_SLUGS } from "@/lib/constants";
import { PracticeWorkspace } from "@/features/workspace/practice-workspace";

export const dynamic = "force-static";

interface PracticePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return QUESTION_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PracticePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const question = loadQuestion(slug, nodeLoader);
    return { title: `Practice: ${question.metadata.title}` };
  } catch {
    return { title: "Practice" };
  }
}

export default async function PracticePage({ params }: PracticePageProps) {
  const { slug } = await params;
  let question;
  try {
    question = loadQuestion(slug, nodeLoader);
  } catch {
    question = null;
  }
  if (!question) notFound();

  // The learning path (easy → medium → hard) for the "next question" flow.
  const nextSlug = await getNextQuestionSlug(slug);

  return <PracticeWorkspace question={question} nextSlug={nextSlug} />;
}
