import { describe, expect, it } from "vitest";
import {
  detectStatementTypes,
  findDisallowedType,
  leadingKeyword,
  splitStatements,
} from "./statements";

describe("splitStatements", () => {
  it("splits on semicolons", () => {
    expect(splitStatements("SELECT 1; SELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
  });

  it("ignores semicolons inside string literals", () => {
    expect(splitStatements("SELECT 'a;b' AS v; SELECT 2")).toEqual([
      "SELECT 'a;b' AS v",
      "SELECT 2",
    ]);
  });

  it("ignores semicolons inside line comments", () => {
    const sql = "SELECT 1 -- comment; with semicolon\n; SELECT 2";
    expect(splitStatements(sql)).toEqual(["SELECT 1 -- comment; with semicolon", "SELECT 2"]);
  });

  it("ignores semicolons inside block comments", () => {
    const sql = "SELECT 1 /* a; b */; SELECT 2";
    expect(splitStatements(sql)).toEqual(["SELECT 1 /* a; b */", "SELECT 2"]);
  });

  it("handles doubled quotes in string literals", () => {
    expect(splitStatements("SELECT 'it''s; fine' AS x; SELECT 2")).toEqual([
      "SELECT 'it''s; fine' AS x",
      "SELECT 2",
    ]);
  });

  it("returns empty array for empty or comment-only input", () => {
    expect(splitStatements("")).toEqual([]);
    expect(splitStatements("  -- just a comment\n")).toEqual([]);
  });
});

describe("leadingKeyword", () => {
  it("extracts the first word", () => {
    expect(leadingKeyword("  SELECT * FROM t")).toBe("SELECT");
    expect(leadingKeyword("WITH x AS (SELECT 1) SELECT * FROM x")).toBe("WITH");
  });
});

describe("detectStatementTypes", () => {
  it("detects a plain SELECT", () => {
    expect(detectStatementTypes("SELECT * FROM employee")).toEqual(new Set(["SELECT"]));
  });

  it("detects WITH queries", () => {
    expect(detectStatementTypes("WITH t AS (SELECT 1) SELECT * FROM t")).toEqual(new Set(["WITH"]));
  });

  it("detects DML as its own type", () => {
    expect(detectStatementTypes("INSERT INTO t VALUES (1)")).toEqual(new Set(["INSERT"]));
    expect(detectStatementTypes("UPDATE t SET x = 1")).toEqual(new Set(["UPDATE"]));
    expect(detectStatementTypes("DELETE FROM t WHERE x = 1")).toEqual(new Set(["DELETE"]));
  });

  it("reports UNKNOWN for non-SQL keywords", () => {
    expect(detectStatementTypes("PRAGMA table_info(t)")).toEqual(new Set(["UNKNOWN"]));
    expect(detectStatementTypes("EXPLAIN SELECT 1")).toEqual(new Set(["UNKNOWN"]));
  });

  it("reports multiple statement types", () => {
    expect(detectStatementTypes("SELECT 1; DELETE FROM t")).toEqual(new Set(["SELECT", "DELETE"]));
  });
});

describe("findDisallowedType", () => {
  it("allows read-only queries when only SELECT/WITH are allowed", () => {
    expect(findDisallowedType("SELECT * FROM t", ["SELECT", "WITH"])).toBeNull();
    expect(
      findDisallowedType("WITH t AS (SELECT 1) SELECT * FROM t", ["SELECT", "WITH"]),
    ).toBeNull();
  });

  it("rejects DML when only reads are allowed", () => {
    expect(findDisallowedType("INSERT INTO t VALUES (1)", ["SELECT", "WITH"])).toBe("INSERT");
    expect(findDisallowedType("SELECT 1; UPDATE t SET x=1", ["SELECT", "WITH"])).toBe("UPDATE");
  });

  it("rejects unknown statement types", () => {
    expect(findDisallowedType("PRAGMA table_info(t)", ["SELECT", "WITH"])).toBe("UNKNOWN");
  });
});
