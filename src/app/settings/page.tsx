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
    <main className="grain mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-accent mb-3 text-xs font-semibold tracking-widest uppercase">Settings</p>
      <h1 className="text-foreground text-4xl font-bold tracking-tight">Preferences</h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Everything here is stored locally in your browser. No account, no sync.
      </p>

      {/* Theme */}
      <section className="border-border bg-surface shadow-tinted mt-10 rounded-xl border p-6">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">Appearance</h2>
        <div role="radiogroup" aria-label="Theme" className="mt-4 grid gap-3 sm:grid-cols-3">
          {options.map((opt) => (
            <button
              key={opt.value}
              role="radio"
              aria-checked={theme === opt.value}
              onClick={() => setTheme(opt.value)}
              className={`rounded-lg p-4 text-left transition-all duration-150 ${
                theme === opt.value
                  ? "bg-accent-soft ring-accent ring-2"
                  : "bg-surface-muted ring-border hover:ring-border-strong ring-1 ring-inset"
              }`}
            >
              <span className="text-foreground block text-sm font-medium">{opt.label}</span>
              <span className="text-muted-foreground mt-0.5 block text-xs">{opt.hint}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Data */}
      <section className="border-danger/30 bg-danger-soft mt-6 rounded-xl border p-6">
        <h2 className="text-danger text-lg font-semibold tracking-tight">Local data</h2>
        <p className="text-muted-foreground mt-1 text-sm">
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
          <p role="status" className="text-success mt-3 text-sm font-medium">
            All local data cleared.
          </p>
        )}
      </section>
    </main>
  );
}
