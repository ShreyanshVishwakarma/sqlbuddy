"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSettings, saveSettings, type SettingsState } from "@/lib/store/db";

function applyTheme(theme: SettingsState["theme"]) {
  const root = document.documentElement;
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

/**
 * Theme state persisted to IndexedDB. Defaults to following the system preference,
 * with a manual override stored as "light" or "dark".
 */
export function useTheme() {
  const [theme, setTheme] = useState<SettingsState["theme"]>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void getSettings().then((s) => {
      if (!active) return;
      setTheme(s.theme);
      setLoaded(true);
      applyTheme(s.theme);
    });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      // When following system, live-update on OS changes.
      setTheme((current) => {
        if (current === "system") applyTheme("system");
        return current;
      });
    };
    media.addEventListener("change", onChange);
    return () => {
      active = false;
      media.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    if (loaded) applyTheme(theme);
  }, [theme, loaded]);

  const setThemePersisted = useCallback((next: SettingsState["theme"]) => {
    setTheme(next);
    void saveSettings({ theme: next });
  }, []);

  const resolved = useMemo(() => {
    if (!loaded) return "light";
    if (theme !== "system") return theme;
    return typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }, [theme, loaded]);

  return { theme, setTheme: setThemePersisted, resolved, loaded };
}
