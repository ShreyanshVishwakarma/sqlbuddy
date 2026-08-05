"use client";

import { useTheme } from "@/hooks/use-theme";

/**
 * Applies the persisted theme on the client. The initial paint is governed by the
 * inline script in the <head> (see globals.css / layout); this hook keeps the toggle
 * and OS-preference changes in sync afterwards.
 */
export function ThemeScript() {
  // Empty component: theme application is driven by useTheme in client pages.
  useTheme();
  return null;
}
