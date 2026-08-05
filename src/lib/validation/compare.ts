export type Cell = string | number | null;

export interface CompareOptions {
  orderMatters: boolean;
  columnNamesMatter: boolean;
}

export interface NormalizationOptions {
  /** Normalize numeric representations (e.g. 100 vs 100.0) when true. */
  normalizeNumbers: boolean;
}

/**
 * Normalizes a single cell so that logically-identical values compare equal:
 * - NULL stays a distinct sentinel (never conflated with "" or 0)
 * - numbers are canonicalized (100, 100.0, "100", "1e2" all normalize to the same
 *   numeric string when normalizeNumbers is on)
 * - strings are trimmed of insignificant whitespace
 */
export function normalizeCell(
  value: unknown,
  opts: NormalizationOptions = { normalizeNumbers: true },
): Cell {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    if (!opts.normalizeNumbers) return value;
    return String(numberToCanonical(value));
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  const text = String(value);
  const trimmed = text.trim();
  if (opts.normalizeNumbers && trimmed !== "") {
    const num = tryParseNumber(trimmed);
    if (num !== null) return String(numberToCanonical(num));
  }
  return trimmed;
}

/**
 * SQLite may return the same logical number in several shapes (INTEGER 1, REAL 1.0,
 * text "1"). We canonicalize via a fixed formatting that avoids floating point noise
 * (e.g. 0.1+0.2) while preserving genuine decimals.
 */
export function numberToCanonical(value: number): number {
  if (Object.is(value, -0)) return 0;
  // Round to 12 significant digits to absorb binary float noise; values with more
  // precision (e.g. rates) keep their meaningful digits.
  const rounded = Number(value.toPrecision(12));
  return rounded === 0 ? 0 : rounded;
}

function tryParseNumber(text: string): number | null {
  // A conservative numeric check: optional sign, digits, optional fraction/exponent.
  // This deliberately rejects hex, "NaN", and "Infinity" strings.
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Renders a normalized cell back to a display-safe string (test diagnostics only). */
export function cellToString(cell: Cell): string {
  if (cell === null) return "NULL";
  return String(cell);
}

/** Two cells are equal iff their normalized forms are identical. */
export function cellsEqual(
  a: unknown,
  b: unknown,
  opts: NormalizationOptions = { normalizeNumbers: true },
): boolean {
  const na = normalizeCell(a, opts);
  const nb = normalizeCell(b, opts);
  if (na === null || nb === null) return na === nb;
  return na === nb;
}

/**
 * Compares the shape of two column lists. When columnNamesMatter is false, only the
 * number of columns must match (names are allowed to differ). Column *count* always
 * matters — a result with a different arity is a different result.
 */
export function compareColumns(
  actual: readonly string[],
  expected: readonly string[],
  opts: Pick<CompareOptions, "columnNamesMatter">,
): { match: boolean; detail?: string } {
  if (actual.length !== expected.length) {
    return { match: false, detail: `Expected ${expected.length} column(s), got ${actual.length}` };
  }
  if (opts.columnNamesMatter) {
    for (let i = 0; i < actual.length; i++) {
      if (normalizeColumnName(actual[i]) !== normalizeColumnName(expected[i])) {
        return {
          match: false,
          detail: `Column "${actual[i]}" does not match expected "${expected[i]}"`,
        };
      }
    }
  }
  return { match: true };
}

function normalizeColumnName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Multiset count of a normalized row. */
function buildRowCounts(
  rows: readonly (readonly unknown[])[],
  opts: NormalizationOptions,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = JSON.stringify(row.map((c) => normalizeCell(c, opts)));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function compareRowLists(
  actual: readonly (readonly unknown[])[],
  expected: readonly (readonly unknown[])[],
  opts: NormalizationOptions,
): { match: boolean; detail?: string } {
  const actualCounts = buildRowCounts(actual, opts);
  const expectedCounts = buildRowCounts(expected, opts);
  if (actualCounts.size !== expectedCounts.size) {
    return {
      match: false,
      detail: `Distinct row count differs (actual ${actualCounts.size}, expected ${expectedCounts.size})`,
    };
  }
  for (const [key, expectedCount] of expectedCounts) {
    const actualCount = actualCounts.get(key);
    if (actualCount !== expectedCount) {
      return {
        match: false,
        detail:
          "Row sets differ (a row present in one result is missing or duplicated in the other)",
      };
    }
  }
  return { match: true };
}

/**
 * Compares two result sets according to the question's validation rules.
 * - duplicate rows are compared with multiset semantics (never collapsed)
 * - NULL is distinct from "" and from 0
 * - when orderMatters is false, row order is ignored
 * - when orderMatters is true, rows must appear in the exact same sequence
 * - when columnNamesMatter is false, column aliases may differ (column count still
 *   must match)
 */
export function compareResults(
  actual: { columns: readonly string[]; rows: readonly (readonly unknown[])[] },
  expected: { columns: readonly string[]; rows: readonly (readonly unknown[])[] },
  opts: CompareOptions,
): { match: boolean; detail?: string } {
  const colCheck = compareColumns(actual.columns, expected.columns, opts);
  if (!colCheck.match) return colCheck;

  if (opts.orderMatters) {
    if (actual.rows.length !== expected.rows.length) {
      return {
        match: false,
        detail: `Row count differs (actual ${actual.rows.length}, expected ${expected.rows.length})`,
      };
    }
    for (let i = 0; i < actual.rows.length; i++) {
      if (!rowEquals(actual.rows[i], expected.rows[i])) {
        return { match: false, detail: `Row ${i + 1} differs` };
      }
    }
    return { match: true };
  }

  return compareRowLists(actual.rows, expected.rows, { normalizeNumbers: true });
}

function rowEquals(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!cellsEqual(a[i], b[i])) return false;
  }
  return true;
}
