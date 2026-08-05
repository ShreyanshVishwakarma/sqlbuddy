"use client";

import { useMemo, type ReactNode } from "react";

function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="bg-code text-foreground ring-border-strong my-3 overflow-x-auto rounded-lg p-3 text-xs leading-relaxed ring-1 ring-inset">
      <code>{children}</code>
    </pre>
  );
}

/**
 * Minimal Markdown/MDX renderer for question prompts. Handles the subset used in
 * content: headings, paragraphs, lists, inline code, tables, and fenced code
 * blocks. Kept deliberately tiny and dependency-free; prompts are author-controlled.
 */
export function Markdown({ source }: { source: string }) {
  const nodes = useMemo(() => renderBlocks(source), [source]);
  return <div className="prose-sql space-y-3 text-sm leading-relaxed">{nodes}</div>;
}

type TextBlock = { kind: "p" | "ul" | "ol" | "h1" | "h2" | "h3"; content: string };
type CodeBlockData = { kind: "code"; lang: string; content: string };
type TableBlock = { kind: "table"; rows: string[][] };
type Block = TextBlock | CodeBlockData | TableBlock;

function parseBlocks(source: string): Block[] {
  const lines = source.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1];
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ kind: "code", lang, content: code.join("\n") });
      continue;
    }
    if (line.trim() === "") {
      i++;
      continue;
    }
    if (line.startsWith("|")) {
      // table: consecutive | lines
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i]
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
        rows.push(cells);
        i++;
      }
      blocks.push({ kind: "table", rows });
      continue;
    }
    // headings
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: `h${heading[1].length}` as TextBlock["kind"], content: heading[2] });
      i++;
      continue;
    }
    // lists (consecutive - items)
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", content: items.join("\n") });
      continue;
    }
    // ordered lists
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", content: items.join("\n") });
      continue;
    }
    // paragraphs: accumulate consecutive non-special lines
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^```/.test(lines[i]) &&
      !lines[i].trim().startsWith("|") &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ kind: "p", content: para.join("\n") });
  }
  return blocks;
}

function inline(text: string, key: number): ReactNode[] {
  // Replace `code` spans and **bold** with simple spans.
  const out: ReactNode[] = [];
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  parts.forEach((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      out.push(
        <code
          key={`${key}-${idx}`}
          className="bg-surface-muted text-accent rounded px-1 py-0.5 text-[0.85em]"
        >
          {part.slice(1, -1)}
        </code>,
      );
    } else if (part.startsWith("**") && part.endsWith("**") && part.length > 3) {
      out.push(<strong key={`${key}-${idx}`}>{part.slice(2, -2)}</strong>);
    } else {
      out.push(<span key={`${key}-${idx}`}>{part}</span>);
    }
  });
  return out;
}

function renderBlocks(source: string): ReactNode {
  const blocks = parseBlocks(source);
  let key = 0;
  return blocks.map((block) => {
    key++;
    switch (block.kind) {
      case "code":
        return <CodeBlock key={key}>{block.content}</CodeBlock>;
      case "table": {
        const [header, , ...rows] = block.rows;
        return (
          <div key={key} className="ring-border overflow-x-auto rounded-lg ring-1 ring-inset">
            <table className="w-full border-collapse text-left text-xs tabular-nums">
              <thead>
                <tr>
                  {header.map((h, i) => (
                    <th
                      key={i}
                      className="border-border bg-surface-muted text-foreground border-b px-2 py-1.5 font-semibold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="odd:bg-surface even:bg-surface-muted/60">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="border-border/60 text-muted-foreground border-b px-2 py-1.5"
                      >
                        {inline(cell, ri * 100 + ci)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      case "h1":
        return (
          <h1 key={key} className="text-foreground text-xl font-bold tracking-tight">
            {inline(block.content, key)}
          </h1>
        );
      case "h2":
        return (
          <h2 key={key} className="text-foreground text-lg font-semibold tracking-tight">
            {inline(block.content, key)}
          </h2>
        );
      case "h3":
        return (
          <h3 key={key} className="text-foreground text-base font-semibold">
            {inline(block.content, key)}
          </h3>
        );
      case "ul":
        return (
          <ul key={key} className="text-muted-foreground list-disc space-y-1 pl-5">
            {block.content.split("\n").map((item, i) => (
              <li key={i}>{inline(item, key * 100 + i)}</li>
            ))}
          </ul>
        );
      case "ol":
        return (
          <ol key={key} className="text-muted-foreground list-decimal space-y-1 pl-5">
            {block.content.split("\n").map((item, i) => (
              <li key={i}>{inline(item, key * 100 + i)}</li>
            ))}
          </ol>
        );
      default:
        return (
          <p key={key} className="text-muted-foreground">
            {inline(block.content, key)}
          </p>
        );
    }
  });
}
