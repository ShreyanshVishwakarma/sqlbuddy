import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

/** Difficulty badge with stable, accessible colors. */
export function DifficultyBadge({ difficulty }: { difficulty: "easy" | "medium" | "hard" }) {
  const styles: Record<string, string> = {
    easy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30",
    medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30",
    hard: "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tracking-wide uppercase ring-1 ring-inset ${styles[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}

/** Topic chip used across catalogue, detail, and dashboard pages. */
export function TopicChip({ topic }: { topic: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200 ring-inset dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
      {topic}
    </span>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  children: ReactNode;
}

export function Button({ variant = "secondary", className = "", children, ...rest }: ButtonProps) {
  const variants: Record<string, string> = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600 disabled:bg-indigo-600/50",
    secondary:
      "bg-slate-100 text-slate-900 hover:bg-slate-200 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:ring-slate-700 disabled:opacity-50",
    ghost:
      "bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50",
    danger:
      "bg-rose-600 text-white hover:bg-rose-500 focus-visible:outline-rose-600 disabled:bg-rose-600/50",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2" aria-label="SQL Prep Lab home">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
        SQL
      </span>
      <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        SQL Prep Lab
      </span>
    </Link>
  );
}
