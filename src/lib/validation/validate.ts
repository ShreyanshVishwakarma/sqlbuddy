import type { FixturePackage, QuestionPackage } from "@/content/types";
import type { ValidationOptions } from "@/content/schema";
import { compareResults } from "./compare";
import { findDisallowedType } from "./statements";
import type { CellValue } from "@/lib/worker/protocol";

export interface FixtureOutcome {
  fixtureId: string;
  label: string;
  passed: boolean;
  /** Short reason, never containing fixture SQL content. */
  reason: string;
}

export interface ValidationResult {
  passed: boolean;
  /** How many fixtures passed, out of the total. */
  passedCount: number;
  totalCount: number;
  outcomes: FixtureOutcome[];
  /** Set when the learner SQL is not even allowed to run. */
  disallowedType?: string;
  error?: string;
}

export interface QueryResult {
  columns: string[];
  rows: CellValue[][];
}

/** A per-fixture database handle. All operations run on the worker thread. */
export interface FixtureDb {
  exec(sql: string): Promise<void>;
  runQuery(sql: string): Promise<QueryResult>;
}

export interface ValidatorHooks {
  /** Creates a fresh, empty in-memory SQLite database for a fixture. */
  createDatabase(): Promise<FixtureDb> | FixtureDb;
}

/**
 * Generic, question-agnostic validator.
 *
 * Each fixture gets a brand-new database: schema + fixture SQL, then the learner's
 * SQL and the trusted reference SQL are executed independently and their outputs are
 * compared according to the metadata's validation options. The learner SQL is
 * gated to the statement types the question permits.
 *
 * NOTE: fixtures and reference SQL are bundled into the client in this MVP, so a
 * determined user can inspect them. See README "Security limitations".
 */
export async function validateSubmission(
  question: QuestionPackage,
  fixtures: FixturePackage[],
  learnerSql: string,
  hooks: ValidatorHooks,
): Promise<ValidationResult> {
  const options: ValidationOptions = question.metadata.validation;

  const disallowed = findDisallowedType(learnerSql, options.allowedStatements);
  if (disallowed) {
    return {
      passed: false,
      passedCount: 0,
      totalCount: fixtures.length,
      outcomes: [],
      disallowedType: disallowed,
      error: `Statement type "${disallowed}" is not allowed for this question.`,
    };
  }

  const outcomes: FixtureOutcome[] = [];
  for (const fixture of fixtures) {
    outcomes.push(await runFixture(question, fixture, learnerSql, hooks));
  }

  const passedCount = outcomes.filter((o) => o.passed).length;
  return {
    passed: passedCount === outcomes.length,
    passedCount,
    totalCount: outcomes.length,
    outcomes,
  };
}

async function runFixture(
  question: QuestionPackage,
  fixture: FixturePackage,
  learnerSql: string,
  hooks: ValidatorHooks,
): Promise<FixtureOutcome> {
  const options = question.metadata.validation;
  const db = await hooks.createDatabase();
  const fail = (reason: string): FixtureOutcome => ({
    fixtureId: fixture.fixtureId,
    label: fixture.label,
    passed: false,
    reason,
  });

  try {
    await db.exec(fixture.schemaSql);
    await db.exec(fixture.fixtureSql);

    const actual = await db.runQuery(learnerSql);
    const expected = await db.runQuery(fixture.referenceSql);

    const comparison = compareResults(actual, expected, {
      orderMatters: options.orderMatters,
      columnNamesMatter: options.columnNamesMatter,
    });

    return {
      fixtureId: fixture.fixtureId,
      label: fixture.label,
      passed: comparison.match,
      reason: comparison.match
        ? "Output matches the reference."
        : `Output differs: ${comparison.detail ?? "no detail"}`,
    };
  } catch (e) {
    return fail(`Query failed to run: ${(e as Error).message}`);
  }
}
