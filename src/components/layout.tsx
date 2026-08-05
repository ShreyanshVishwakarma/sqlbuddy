"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./ui";

const navLinks = [
  { href: "/questions", label: "Questions" },
  { href: "/dashboard", label: "Dashboard" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="border-border bg-background/85 sticky top-0 z-30 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1">
          {navLinks.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                  active
                    ? "text-foreground bg-surface-muted"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/settings"
            aria-label="Settings"
            className="text-muted-foreground hover:bg-surface-muted hover:text-foreground ml-1 flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M8 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 1.8a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4ZM8 0c.7 0 1.2.5 1.2 1.1v.8a6.4 6.4 0 0 1 2.6 1l.7-.4c.7-.4 1.4-.1 1.6.5l.3.8c.2.6-.2 1.2-.8 1.5l-.7.4a6.6 6.6 0 0 1 0 2l.7.4c.6.3 1 1 .8 1.5l-.3.8c-.2.6-1 .9-1.6.5l-.7-.4a6.4 6.4 0 0 1-2.6 1v.8c0 .6-.5 1.1-1.2 1.1s-1.2-.5-1.2-1.1v-.8a6.4 6.4 0 0 1-2.6-1l-.7.4c-.7.4-1.4.1-1.6-.5l-.3-.8c-.2-.6.2-1.2.8-1.5l.7-.4a6.6 6.6 0 0 1 0-2l-.7-.4C.6 6.4.2 5.7.4 5.2l.3-.8c.2-.6 1-.9 1.6-.5l.7.4a6.4 6.4 0 0 1 2.6-1v-.8C5.6.5 6.1 0 6.8 0h1.2Z"
                fill="currentColor"
              />
            </svg>
            <span className="sr-only">Settings</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-border border-t py-8">
      <div className="text-muted mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs sm:flex-row sm:px-6">
        <p>sqlbuddy — practice SQL interviews entirely in your browser.</p>
        <nav aria-label="Footer" className="flex items-center gap-4">
          <Link
            href="/settings"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <span aria-hidden className="text-border-strong">
            ·
          </span>
          <span className="text-muted">All queries run locally · no sign-up</span>
        </nav>
      </div>
    </footer>
  );
}
