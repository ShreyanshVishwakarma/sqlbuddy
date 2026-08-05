"use client";

import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { clearAllData } from "@/lib/store/db";
import { Button } from "@/components/ui";

type ThemeChoice = "system" | "light" | "dark";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);

  const options: { value: ThemeChoice; label: string; hint: string }[] = [
    { value: "system", label: "System", hint: "Follow your OS preference" },
    { value: "light", label: "Light", hint: "Always light" },
    { value: "dark", label: "Dark", hint: "Always dark" },
  ];

  const handleClear = async () => {
    await clearAllData();
    setCleared(true);
    setConfirming(false);
    setTimeout(() => setCleared(false), 4000);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Settings
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        All settings are stored locally in your browser. No account, no sync.
      </p>

      {/* Theme */}
      <section className="mt-8 rounded-xl border border-slate-200 p-6 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Appearance</h2>
        <div role="radiogroup" aria-label="Theme" className="mt-4 grid gap-3 sm:grid-cols-3">
          {options.map((opt) => (
            <button
              key={opt.value}
              role="radio"
              aria-checked={theme === opt.value}
              onClick={() => setTheme(opt.value)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                theme === opt.value
                  ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
              }`}
            >
              <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                {opt.label}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                {opt.hint}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Data */}
      <section className="mt-6 rounded-xl border border-rose-200 p-6 dark:border-rose-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Local data</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Deletes all drafts, progress, bookmarks, notes, and settings from this browser. This
          cannot be undone.
        </p>
        <div className="mt-4 flex items-center gap-3">
          {confirming ? (
            <>
              <Button variant="danger" onClick={() => void handleClear()}>
                Yes, delete everything
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Clear local data
            </Button>
          )}
        </div>
        {cleared && (
          <p
            role="status"
            className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400"
          >
            All local data cleared.
          </p>
        )}
      </section>
    </main>
  );
}
