"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
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
  const handleEditorMount = useCallback<NonNullable<EditorProps["onMount"]>>(
    (editor, monaco) => {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRun());
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () =>
        onSubmit(),
      );
      // Test hook: E2E tests set editor content deterministically through Monaco's
      // own API rather than synthesizing keystrokes (which Monaco can drop).
      (window as unknown as { __sqlEditorSetValue?: (v: string) => void }).__sqlEditorSetValue = (
        v: string,
      ) => {
        editor.setValue(v);
      };
    },
    [onRun, onSubmit],
  );

  // onChange is called with the new value by the editor; keep a stable handler.
  const handleChange = useCallback(
    (newValue: string | undefined) => {
      if (newValue !== undefined) onChange(newValue);
    },
    [onChange],
  );

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
