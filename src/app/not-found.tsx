import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grain flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-accent font-mono text-sm font-semibold tracking-widest uppercase">404</p>
      <h1 className="text-foreground text-3xl font-bold tracking-tight">Question not found</h1>
      <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
        The question you are looking for does not exist or may have been removed.
      </p>
      <Link
        href="/questions"
        className="bg-accent text-accent-foreground hover:bg-accent-strong mt-2 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
      >
        Browse all questions
        <span aria-hidden>→</span>
      </Link>
    </main>
  );
}
