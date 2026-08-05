import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-success-soft text-success ring-success/25",
  medium: "bg-warning/10 text-warning ring-warning/25",
  hard: "bg-danger-soft text-danger ring-danger/25",
};

/** Difficulty badge with desaturated, accessible colors. */
export function DifficultyBadge({ difficulty }: { difficulty: "easy" | "medium" | "hard" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ring-1 ring-inset ${DIFFICULTY_STYLES[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}

/** Topic chip — quiet, lowercase, single-gray family. */
export function TopicChip({ topic }: { topic: string }) {
  return (
    <span className="text-muted-foreground bg-surface-muted ring-border inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset">
      {topic}
    </span>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "link";
  children: ReactNode;
}

export function Button({ variant = "secondary", className = "", children, ...rest }: ButtonProps) {
  const variants: Record<string, string> = {
    primary:
      "bg-accent text-accent-foreground hover:bg-accent-strong active:scale-[0.98] disabled:opacity-50",
    secondary:
      "bg-surface text-foreground hover:bg-surface-muted ring-1 ring-inset ring-border-strong active:scale-[0.98] disabled:opacity-50",
    ghost:
      "bg-transparent text-muted-foreground hover:bg-surface-muted hover:text-foreground active:scale-[0.98] disabled:opacity-50",
    danger: "bg-danger text-white hover:opacity-90 active:scale-[0.98] disabled:opacity-50",
    link: "bg-transparent text-accent hover:text-accent-strong hover:underline disabled:opacity-50",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Brand mark — squircle, gradient-free, tabular wordmark. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5" aria-label="SQL Prep Lab home">
      <span className="bg-accent text-accent-foreground shadow-tinted flex h-7 w-7 items-center justify-center rounded-lg text-[13px] font-bold transition-transform duration-200 group-hover:-rotate-3">
        SQL
      </span>
      <span className="text-foreground text-[15px] font-semibold tracking-tight">SQL Prep Lab</span>
    </Link>
  );
}
