"use client";

import nextDynamic from "next/dynamic";
import type { QuestionPackage } from "@/content/types";

// Client wrapper around the interactive workspace. The dynamic import with
// ssr: false is only legal in a Client Component; the server page renders this
// wrapper, which defers Monaco + SQLite WASM entirely to the browser.
const SqlWorkspace = nextDynamic(
  () => import("@/features/workspace/workspace").then((m) => m.SqlWorkspace),
  {
    ssr: false,
    loading: () => <WorkspaceSkeleton />,
  },
);

interface PracticeWorkspaceProps {
  question: QuestionPackage;
  nextSlug: string | null;
}

export function PracticeWorkspace({ question, nextSlug }: PracticeWorkspaceProps) {
  return <SqlWorkspace question={question} nextSlug={nextSlug} />;
}

function WorkspaceSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="border-border bg-surface flex items-center gap-3 border-b px-4 py-2.5">
        <div className="bg-surface-muted h-4 w-20 animate-pulse rounded" />
        <div className="bg-surface-muted h-4 w-48 animate-pulse rounded" />
        <div className="bg-surface-muted ml-auto h-8 w-24 animate-pulse rounded" />
        <div className="bg-surface-muted h-8 w-20 animate-pulse rounded" />
      </div>
      <div className="grid flex-1 grid-cols-[320px_1fr]">
        <div className="border-border bg-surface border-r p-4">
          <div className="bg-surface-muted h-3 w-24 animate-pulse rounded" />
          <div className="bg-surface-muted mt-3 h-3 w-full animate-pulse rounded" />
          <div className="bg-surface-muted mt-2 h-3 w-5/6 animate-pulse rounded" />
        </div>
        <div className="bg-surface flex flex-col">
          <div className="bg-surface-muted/60 flex-1" />
          <div className="border-border bg-surface h-52 border-t" />
        </div>
      </div>
    </div>
  );
}
