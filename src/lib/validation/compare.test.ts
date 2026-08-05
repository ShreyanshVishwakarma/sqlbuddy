import { describe, expect, it } from "vitest";
import {
  cellsEqual,
  compareColumns,
  compareResults,
  normalizeCell,
  numberToCanonical,
} from "./compare";

describe("normalizeCell", () => {
  it("keeps NULL distinct from empty string", () => {
    expect(normalizeCell(null)).toBeNull();
    expect(normalizeCell(undefined)).toBeNull();
    expect(normalizeCell("")).toBe("");
    expect(cellsEqual(null, "")).toBe(false);
    expect(cellsEqual(null, 0)).toBe(false);
    expect(cellsEqual("", 0)).toBe(false);
  });

  it("normalizes number representations", () => {
    expect(normalizeCell(100)).toBe(normalizeCell(100.0));
    expect(normalizeCell(100)).toBe(normalizeCell("100"));
    expect(normalizeCell(100)).toBe(normalizeCell("1e2"));
    expect(normalizeCell("100.5")).toBe(normalizeCell(100.5));
  });

  it("does not treat 0.1+0.2 as a text-matching problem", () => {
    expect(cellsEqual(0.1 + 0.2, 0.3)).toBe(true);
  });

  it("trims insignificant whitespace on strings", () => {
    expect(normalizeCell("  alice ")).toBe("alice");
    expect(cellsEqual(" alice ", "alice")).toBe(true);
  });

  it("rejects non-numeric strings from numeric normalization", () => {
    expect(normalizeCell("123abc")).toBe("123abc");
    expect(cellsEqual("123abc", 123)).toBe(false);
  });

  it("normalizes negative zero to zero", () => {
    expect(numberToCanonical(-0)).toBe(0);
    expect(cellsEqual(-0, 0)).toBe(true);
  });
});

describe("compareColumns", () => {
  it("requires same column count even when names don't matter", () => {
    expect(compareColumns(["a", "b"], ["a"], { columnNamesMatter: false }).match).toBe(false);
  });

  it("ignores column names when columnNamesMatter is false", () => {
    expect(compareColumns(["a", "b"], ["x", "y"], { columnNamesMatter: false }).match).toBe(true);
  });

  it("compares column names case-insensitively when they matter", () => {
    expect(compareColumns(["Name"], ["name"], { columnNamesMatter: true }).match).toBe(true);
    expect(compareColumns(["Name"], ["Salary"], { columnNamesMatter: true }).match).toBe(false);
  });
});

describe("compareResults — unordered", () => {
  const opts = { orderMatters: false, columnNamesMatter: false };

  it("treats different row order as equal", () => {
    const a = { columns: ["x"], rows: [[1], [2]] };
    const b = { columns: ["x"], rows: [[2], [1]] };
    expect(compareResults(a, b, opts).match).toBe(true);
  });

  it("treats duplicate rows with multiset semantics", () => {
    // Two identical rows must not collapse: [1,1] vs [1] differs.
    const a = { columns: ["x"], rows: [[1], [1]] };
    const b = { columns: ["x"], rows: [[1]] };
    expect(compareResults(a, b, opts).match).toBe(false);

    const c = { columns: ["x"], rows: [[1], [1]] };
    const d = { columns: ["x"], rows: [[1], [1]] };
    expect(compareResults(c, d, opts).match).toBe(true);
  });

  it("distinguishes NULL from empty string and zero", () => {
    expect(
      compareResults({ columns: ["x"], rows: [[null]] }, { columns: ["x"], rows: [[""]] }, opts)
        .match,
    ).toBe(false);
    expect(
      compareResults({ columns: ["x"], rows: [[null]] }, { columns: ["x"], rows: [[0]] }, opts)
        .match,
    ).toBe(false);
    expect(
      compareResults({ columns: ["x"], rows: [[null]] }, { columns: ["x"], rows: [[null]] }, opts)
        .match,
    ).toBe(true);
  });

  it("matches identical datasets regardless of row order", () => {
    const a = {
      columns: ["a", "b"],
      rows: [
        [1, "x"],
        [2, "y"],
        [1, "x"],
      ],
    };
    const b = {
      columns: ["a", "b"],
      rows: [
        [1, "x"],
        [1, "x"],
        [2, "y"],
      ],
    };
    expect(compareResults(a, b, opts).match).toBe(true);
  });
});

describe("compareResults — ordered", () => {
  const opts = { orderMatters: true, columnNamesMatter: false };

  it("requires exact row order", () => {
    const a = { columns: ["x"], rows: [[1], [2]] };
    const b = { columns: ["x"], rows: [[2], [1]] };
    expect(compareResults(a, b, opts).match).toBe(false);
  });

  it("accepts identical order", () => {
    const a = { columns: ["x"], rows: [[1], [2]] };
    const b = { columns: ["x"], rows: [[1], [2]] };
    expect(compareResults(a, b, opts).match).toBe(true);
  });

  it("rejects when row count differs", () => {
    const a = { columns: ["x"], rows: [[1]] };
    const b = { columns: ["x"], rows: [[1], [2]] };
    expect(compareResults(a, b, opts).match).toBe(false);
  });
});

describe("compareResults — aliases", () => {
  it("allows differing column aliases when columnNamesMatter is false", () => {
    const a = { columns: ["second_highest_salary"], rows: [[90]] };
    const b = { columns: ["whatever"], rows: [[90]] };
    expect(compareResults(a, b, { orderMatters: false, columnNamesMatter: false }).match).toBe(
      true,
    );
  });

  it("rejects differing aliases when columnNamesMatter is true", () => {
    const a = { columns: ["name"], rows: [["Alice"]] };
    const b = { columns: ["employee_name"], rows: [["Alice"]] };
    expect(compareResults(a, b, { orderMatters: false, columnNamesMatter: true }).match).toBe(
      false,
    );
  });
});
