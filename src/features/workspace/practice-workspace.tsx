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

export function PracticeWorkspace({ question }: { question: QuestionPackage }) {
  return <SqlWorkspace question={question} />;
}

function WorkspaceSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
        <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="ml-auto h-8 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-8 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="grid flex-1 grid-cols-[320px_1fr]">
        <div className="border-r border-slate-200 p-4 dark:border-slate-800">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="flex flex-col">
          <div className="flex-1 bg-slate-100 dark:bg-slate-900" />
          <div className="h-52 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" />
        </div>
      </div>
    </div>
  );
}
