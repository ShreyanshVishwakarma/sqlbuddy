"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SIDEBAR = 260;
const MAX_SIDEBAR_RATIO = 0.6; // of the container width
const STEP = 16;
const STORAGE_KEY = "sqlbuddy:workspace:sidebar-width";
const DEFAULT_SIDEBAR = 340;

interface ResizableSplitProps {
  /** Side panel content. */
  side: React.ReactNode;
  /** Main panel content. */
  main: React.ReactNode;
  /** Accessible label for the resize handle. */
  handleLabel: string;
}

/**
 * Two-pane layout with a draggable divider. The side panel width is clamped,
 * persisted to localStorage, and adjustable via mouse/touch drag, double-click
 * (reset), and arrow keys (focus the handle).
 */
export function ResizableSplit({ side, main, handleLabel }: ResizableSplitProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_SIDEBAR;
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(stored) && stored >= MIN_SIDEBAR ? stored : DEFAULT_SIDEBAR;
  });
  const draggingRef = useRef(false);
  const widthRef = useRef(width);
  widthRef.current = width;

  const clamp = useCallback((w: number) => {
    const container = containerRef.current;
    const max = container ? Math.floor(container.clientWidth * MAX_SIDEBAR_RATIO) : DEFAULT_SIDEBAR;
    return Math.min(Math.max(w, MIN_SIDEBAR), Math.max(max, MIN_SIDEBAR));
  }, []);

  // Persist on drag end (and on keyboard change) so we don't write on every move.
  const persist = useCallback((w: number) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(w));
    } catch {
      // Storage may be unavailable (private mode); layout still works.
    }
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const next = clamp(e.clientX - rect.left);
      widthRef.current = next;
      setWidth(next);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.classList.remove("select-none");
      document.body.style.cursor = "";
      persist(widthRef.current);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [clamp, persist]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    // Prevent text selection and iframe (Monaco) capturing the pointer.
    document.body.classList.add("select-none");
    document.body.style.cursor = "col-resize";
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = clamp(width + (e.key === "ArrowRight" ? STEP : -STEP));
      setWidth(next);
      persist(next);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setWidth(DEFAULT_SIDEBAR);
      persist(DEFAULT_SIDEBAR);
    }
  };

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1">
      <aside
        className="bg-surface border-border min-h-0 shrink-0 overflow-y-auto border-r"
        style={{ width }}
      >
        {side}
      </aside>

      {/* Drag handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={handleLabel}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onDoubleClick={() => {
          setWidth(DEFAULT_SIDEBAR);
          persist(DEFAULT_SIDEBAR);
        }}
        onKeyDown={handleKeyDown}
        className="border-border hover:bg-accent focus-visible:bg-accent group w-1.5 shrink-0 cursor-col-resize border-r bg-transparent transition-colors focus:outline-none"
      >
        <span
          aria-hidden
          className="bg-accent/0 group-hover:bg-accent/40 group-focus-visible:bg-accent/40 mx-auto block h-full w-0.5 transition-colors"
        />
      </div>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">{main}</main>
    </div>
  );
}
