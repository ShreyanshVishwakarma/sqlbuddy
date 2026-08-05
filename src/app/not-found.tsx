import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-semibold tracking-wider text-indigo-500 uppercase">404</p>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Question not found</h1>
      <p className="max-w-sm text-sm text-slate-600 dark:text-slate-300">
        The question you are looking for does not exist or may have been removed.
      </p>
      <Link
        href="/questions"
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
      >
        Browse all questions
      </Link>
    </main>
  );
}
