"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import type { EditorProps } from "@monaco-editor/react";

// Monaco is large (~3MB parsed); it is only loaded once the workspace mounts,
// never on the landing/catalogue/detail pages.
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full flex-col gap-2 p-4" aria-busy="true">
      <div className="bg-surface-muted h-4 w-32 animate-pulse rounded" />
      <div className="bg-surface-muted h-3 w-full animate-pulse rounded" />
      <div className="bg-surface-muted h-3 w-4/5 animate-pulse rounded" />
      <div className="bg-surface-muted h-3 w-2/3 animate-pulse rounded" />
    </div>
  ),
});

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  disabled?: boolean;
}

/**
 * Monaco SQL editor. Keyboard shortcuts:
 * - Ctrl/Cmd + Enter: run query
 * - Ctrl/Cmd + Shift + Enter: submit answer
 */
export function SqlEditor({ value, onChange, onRun, onSubmit, disabled }: SqlEditorProps) {
  // Keep the latest handlers in refs: Monaco commands are registered once in
  // onMount, so the closures they capture must never go stale (otherwise the
  // shortcut would call the first render's handler forever).
  const onRunRef = useRef(onRun);
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onRunRef.current = onRun;
    onSubmitRef.current = onSubmit;
  }, [onRun, onSubmit]);

  const handleEditorMount = useCallback<NonNullable<EditorProps["onMount"]>>(
    (editor, monaco) => {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current());
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () =>
        onSubmitRef.current(),
      );
      // Test hook: E2E tests set editor content deterministically through Monaco's
      // own API rather than synthesizing keystrokes (which Monaco can drop).
      (window as unknown as { __sqlEditorSetValue?: (v: string) => void }).__sqlEditorSetValue = (
        v: string,
      ) => {
        editor.setValue(v);
      };
    },
    [],
  );

  // onChange is called with the new value by the editor; keep a stable handler.
  const handleChange = useCallback(
    (newValue: string | undefined) => {
      if (newValue !== undefined) onChange(newValue);
    },
    [onChange],
  );

  // Global fallback so the shortcut also works when the editor isn't focused
  // (e.g. while typing notes). Monaco's own command already covers the focused
  // case, so ignore events originating inside the editor to avoid double-firing.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || !e.shiftKey || e.key !== "Enter") return;
      if ((e.target as HTMLElement | null)?.closest?.(".monaco-editor")) return;
      if (disabled) return;
      e.preventDefault();
      onSubmitRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled]);

  return (
    <div className="h-full w-full" aria-label="SQL editor">
      <MonacoEditor
        height="100%"
        defaultLanguage="sql"
        theme="vs-dark"
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          fontSize: 13,
          fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbersMinChars: 3,
          tabSize: 2,
          renderLineHighlight: "line",
          automaticLayout: true,
          padding: { top: 8, bottom: 8 },
          wordWrap: "on",
          readOnly: disabled,
          ariaLabel: "SQL editor",
          // No autocompletion/suggestion popups: they steal keystrokes and make
          // automated typing (and fast human typing) unreliable.
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          parameterHints: { enabled: false },
        }}
      />
    </div>
  );
}
