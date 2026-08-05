import type { StatementType } from "@/content/schema";

/**
 * Splits a SQL script into individual statements, respecting single-quoted strings,
 * double-quoted identifiers, and both line and block comments. SQLite's tokenizer
 * treats these as opaque, so a plain split on ";" is unsafe.
 */
export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      current += ch;
      if (ch === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        current += "*/";
        i += 2;
      } else {
        current += ch;
        i++;
      }
      continue;
    }
    if (inSingle) {
      current += ch;
      if (ch === "'") {
        // '' is an escaped quote inside a string literal
        if (next === "'") {
          current += "'";
          i += 2;
          continue;
        }
        inSingle = false;
      }
      i++;
      continue;
    }
    if (inDouble) {
      current += ch;
      if (ch === '"') {
        if (next === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inDouble = false;
      }
      i++;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      current += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      current += ch;
      i++;
      continue;
    }
    if (ch === "-" && next === "-") {
      inLineComment = true;
      current += "--";
      i += 2;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      current += "/*";
      i += 2;
      continue;
    }
    if (ch === ";") {
      if (hasRealContent(current)) statements.push(current.trim());
      current = "";
      i++;
      continue;
    }
    current += ch;
    i++;
  }

  if (hasRealContent(current)) statements.push(current.trim());
  return statements;
}

/** True when the text contains anything besides whitespace and SQL comments. */
function hasRealContent(text: string): boolean {
  // Strip comments, then check for a non-space remainder.
  const stripped = text
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
  return stripped.length > 0;
}

/** Returns the leading keyword of a statement (upper-cased), or null if none. */
export function leadingKeyword(statement: string): string | null {
  const match = statement.trim().match(/^([a-zA-Z_]+)/);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Detects which statement types a script uses. Each distinct leading keyword is
 * reported; a statement whose leading keyword is not a known SQL keyword is
 * reported as "UNKNOWN" so callers can reject it explicitly.
 */
export function detectStatementTypes(sql: string): Set<StatementType | "UNKNOWN"> {
  const types = new Set<StatementType | "UNKNOWN">();
  for (const stmt of splitStatements(sql)) {
    const kw = leadingKeyword(stmt);
    if (!kw) continue; // empty or comment-only
    const normalized = kw.toUpperCase();
    if (
      normalized === "SELECT" ||
      normalized === "WITH" ||
      normalized === "INSERT" ||
      normalized === "UPDATE" ||
      normalized === "DELETE"
    ) {
      types.add(normalized as StatementType);
    } else {
      types.add("UNKNOWN");
    }
  }
  return types;
}

/**
 * Returns the first disallowed statement type (for error messages), or null when
 * every statement is allowed.
 */
export function findDisallowedType(
  sql: string,
  allowed: readonly StatementType[],
): StatementType | "UNKNOWN" | null {
  const allowedSet = new Set(allowed);
  for (const type of detectStatementTypes(sql)) {
    if (!allowedSet.has(type as StatementType)) return type;
  }
  return null;
}
