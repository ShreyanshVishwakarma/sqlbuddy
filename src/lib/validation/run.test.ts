import { describe, expect, it } from "vitest";
import { splitScriptStatements } from "./run";

describe("splitScriptStatements", () => {
  it("splits on semicolons", () => {
    expect(splitScriptStatements("SELECT 1; SELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
  });

  it("keeps semicolons inside string literals", () => {
    expect(splitScriptStatements("INSERT INTO t VALUES ('a;b'); SELECT 1")).toEqual([
      "INSERT INTO t VALUES ('a;b')",
      "SELECT 1",
    ]);
  });

  it("drops a trailing comment-only chunk after the final semicolon", () => {
    const sql = "INSERT INTO t VALUES (1); -- orphan order: belongs to nobody";
    expect(splitScriptStatements(sql)).toEqual(["INSERT INTO t VALUES (1)"]);
  });

  it("does not treat quotes inside comments as string delimiters", () => {
    const sql =
      "INSERT INTO t VALUES (1); -- two employees named 'Alice'\nINSERT INTO u VALUES (2);";
    // The comment belongs to the already-emitted first statement and is dropped,
    // so the following statement splits cleanly.
    expect(splitScriptStatements(sql)).toEqual([
      "INSERT INTO t VALUES (1)",
      "INSERT INTO u VALUES (2)",
    ]);
  });

  it("drops inline comments that end up at the start of a chunk", () => {
    // A comment before a semicolon means the following chunk starts clean.
    const sql = "INSERT INTO t VALUES (1) -- note\n; INSERT INTO u VALUES (2); -- tail";
    expect(splitScriptStatements(sql)).toEqual([
      "INSERT INTO t VALUES (1) -- note",
      "INSERT INTO u VALUES (2)",
    ]);
  });

  it("drops block-comment-only chunks", () => {
    expect(splitScriptStatements("SELECT 1; /* nothing here */")).toEqual(["SELECT 1"]);
  });

  it("returns empty for comment-only input", () => {
    expect(splitScriptStatements("-- just a comment")).toEqual([]);
    expect(splitScriptStatements("")).toEqual([]);
  });
});
