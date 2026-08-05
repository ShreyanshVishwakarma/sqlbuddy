import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadQuestion } from "@/content/loader";
import { nodeLoader } from "@/content/node-loader";
import { QUESTION_SLUGS } from "@/lib/constants";
import { DifficultyBadge, TopicChip } from "@/components/ui";
import { Markdown } from "@/components/markdown";

interface QuestionPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-static";

export function generateStaticParams() {
  return QUESTION_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: QuestionPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const question = loadQuestion(slug, nodeLoader);
    return {
      title: question.metadata.title,
      description: question.metadata.description,
    };
  } catch {
    return { title: "Question not found" };
  }
}

export default async function QuestionPage({ params }: QuestionPageProps) {
  const { slug } = await params;
  let question;
  try {
    question = loadQuestion(slug, nodeLoader);
  } catch {
    question = null;
  }
  if (!question) notFound();

  const { metadata, schemaSql, seedSql } = question;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link
          href="/questions"
          className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← All questions
        </Link>
      </nav>

      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={metadata.difficulty} />
          {metadata.topics.map((t) => (
            <TopicChip key={t} topic={t} />
          ))}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {metadata.title}
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{metadata.description}</p>
        <Link
          href={`/practice/${metadata.slug}`}
          className="mt-5 inline-block rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          Start Practice
        </Link>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">Prompt</h2>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
          <Markdown source={question.promptMdx} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
          Expected concepts
        </h2>
        <ul className="flex flex-wrap gap-1.5">
          {metadata.concepts.map((c) => (
            <li
              key={c}
              className="rounded-md bg-indigo-50 px-2 py-1 text-xs text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
            >
              {c}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">Schema</h2>
        <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-relaxed text-slate-100 ring-1 ring-slate-800 ring-inset">
          <code>{schemaSql}</code>
        </pre>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
          Sample data
        </h2>
        <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-relaxed text-slate-100 ring-1 ring-slate-800 ring-inset">
          <code>{seedSql}</code>
        </pre>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Additional hidden fixtures are applied during validation to test edge cases.
        </p>
      </section>
    </main>
  );
}
