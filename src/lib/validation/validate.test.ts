import { describe, expect, it } from "vitest";
import initSqlJs from "sql.js";
import type { FixturePackage, QuestionPackage } from "@/content/types";
import { validateSubmission, type FixtureDb, type QueryResult } from "./validate";
import { loadAllFixtures, loadQuestion } from "@/content/loader";
import { nodeLoader } from "@/content/node-loader";

// A real sql.js-backed hook set so the validator is exercised end-to-end,
// including actual SQL execution and result comparison.
async function createHooks() {
  const SQL = await initSqlJs({
    // locateFile is required in Node (no document.currentScript).
    locateFile: () => require.resolve("sql.js/dist/sql-wasm.wasm"),
  });

  return {
    createDatabase(): FixtureDb {
      const db = new SQL.Database();
      return {
        async exec(sql: string): Promise<void> {
          db.exec(sql);
        },
        async runQuery(sql: string): Promise<QueryResult> {
          const res = db.exec(sql);
          if (res.length === 0) return { columns: [], rows: [] };
          return {
            columns: res[0].columns,
            rows: res[0].values.map((r) =>
              r.map((c) => (c === undefined ? null : c)),
            ) as QueryResult["rows"],
          };
        },
      };
    },
  };
}

function questionFixtures(pkg: QuestionPackage, fixtures: FixturePackage[]): FixturePackage[] {
  return fixtures.filter((f) => f.metadata.id === pkg.metadata.id);
}

describe("validateSubmission (integration)", () => {
  it("passes the reference SQL against every fixture of every question", async () => {
    const hooks = await createHooks();
    const fixtures = await loadAllFixtures(nodeLoader);
    const questions = [...new Set(fixtures.map((f) => f.metadata.id))].map((id) =>
      loadQuestion(fixtures.find((f) => f.metadata.id === id)!.metadata.slug, nodeLoader),
    );

    for (const question of questions) {
      const qFixtures = questionFixtures(question, fixtures);
      const result = await validateSubmission(question, qFixtures, question.referenceSql, hooks);
      expect(result.passed, `reference should pass for ${question.metadata.slug}`).toBe(true);
      expect(result.passedCount).toBe(qFixtures.length);
    }
  });

  it("fails a clearly wrong answer", async () => {
    const hooks = await createHooks();
    const fixtures = await loadAllFixtures(nodeLoader);
    const question = loadQuestion("second-highest-salary", nodeLoader);
    const result = await validateSubmission(
      question,
      questionFixtures(question, fixtures),
      "SELECT 1",
      hooks,
    );
    expect(result.passed).toBe(false);
    expect(result.passedCount).toBe(0);
    expect(result.totalCount).toBe(question.metadata.fixtures.length);
  });

  it("rejects a DELETE when only reads are allowed", async () => {
    const hooks = await createHooks();
    const fixtures = await loadAllFixtures(nodeLoader);
    const question = loadQuestion("second-highest-salary", nodeLoader);
    const result = await validateSubmission(
      question,
      questionFixtures(question, fixtures),
      "DELETE FROM employee",
      hooks,
    );
    expect(result.passed).toBe(false);
    expect(result.disallowedType).toBe("DELETE");
    expect(result.error).toContain("not allowed");
  });

  it("reports how many fixtures passed without revealing fixture contents", async () => {
    const hooks = await createHooks();
    const fixtures = await loadAllFixtures(nodeLoader);
    const question = loadQuestion("second-highest-salary", nodeLoader);
    // A constant wrong on every fixture.
    const partial = "SELECT 999 AS second_highest_salary";
    const result = await validateSubmission(
      question,
      questionFixtures(question, fixtures),
      partial,
      hooks,
    );
    expect(result.passed).toBe(false);
    expect(result.passedCount).toBe(0);
    expect(result.totalCount).toBe(3);
    // Outcomes reference fixtures only by id/label, never by content.
    for (const o of result.outcomes) {
      expect(o.reason).not.toContain("INSERT");
      expect(o.reason).not.toContain("VALUES");
    }
  });
});
