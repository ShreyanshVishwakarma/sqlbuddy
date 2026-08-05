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
    <main className="grain mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link
          href="/questions"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ← All questions
        </Link>
      </nav>

      <header className="mb-10">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={metadata.difficulty} />
          {metadata.topics.map((t) => (
            <TopicChip key={t} topic={t} />
          ))}
        </div>
        <h1 className="text-foreground text-4xl font-bold tracking-tight">{metadata.title}</h1>
        <p className="text-muted-foreground mt-3 max-w-xl leading-relaxed">
          {metadata.description}
        </p>
        <Link
          href={`/practice/${metadata.slug}`}
          className="bg-accent text-accent-foreground shadow-tinted hover:bg-accent-strong mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
        >
          Start practice
          <span aria-hidden>→</span>
        </Link>
      </header>

      <section className="mb-10">
        <h2 className="text-foreground mb-4 text-lg font-semibold tracking-tight">Prompt</h2>
        <div className="border-border bg-surface shadow-tinted rounded-xl border p-6">
          <Markdown source={question.promptMdx} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-foreground mb-4 text-lg font-semibold tracking-tight">
          Expected concepts
        </h2>
        <ul className="flex flex-wrap gap-1.5">
          {metadata.concepts.map((c) => (
            <li
              key={c}
              className="bg-accent-soft text-accent rounded-md px-2 py-1 text-xs font-medium"
            >
              {c}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-foreground mb-4 text-lg font-semibold tracking-tight">Schema</h2>
        <pre className="bg-code text-foreground ring-border-strong overflow-x-auto rounded-xl p-5 text-xs leading-relaxed ring-1 ring-inset">
          <code>{schemaSql}</code>
        </pre>
      </section>

      <section>
        <h2 className="text-foreground mb-4 text-lg font-semibold tracking-tight">Sample data</h2>
        <pre className="bg-code text-foreground ring-border-strong overflow-x-auto rounded-xl p-5 text-xs leading-relaxed ring-1 ring-inset">
          <code>{seedSql}</code>
        </pre>
        <p className="text-muted mt-3 text-xs">
          Additional hidden fixtures are applied during validation to test edge cases.
        </p>
      </section>
    </main>
  );
}
