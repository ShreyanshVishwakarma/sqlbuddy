import { describe, expect, it } from "vitest";
import { QuestionMetadataSchema } from "./schema";

const validMetadata = {
  id: "second-highest-salary",
  slug: "second-highest-salary",
  title: "Second Highest Salary",
  difficulty: "easy",
  topics: ["Subqueries", "NULL handling"],
  description: "Return the second-highest distinct salary.",
  concepts: ["SELECT", "DISTINCT"],
  validation: {
    orderMatters: false,
    columnNamesMatter: false,
    allowedStatements: ["SELECT", "WITH"],
    maxExecutionTimeMs: 5000,
    maxOutputRows: 10,
  },
  fixtures: [
    { id: "base", file: "base.sql", label: "Basic" },
    { id: "dups", file: "duplicates.sql", label: "Duplicates" },
  ],
};

describe("QuestionMetadataSchema", () => {
  it("accepts a fully valid metadata object", () => {
    const parsed = QuestionMetadataSchema.safeParse(validMetadata);
    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid slug", () => {
    expect(QuestionMetadataSchema.safeParse({ ...validMetadata, slug: "Bad Slug!" }).success).toBe(
      false,
    );
    expect(QuestionMetadataSchema.safeParse({ ...validMetadata, slug: "UPPER" }).success).toBe(
      false,
    );
  });

  it("rejects an invalid difficulty", () => {
    expect(
      QuestionMetadataSchema.safeParse({ ...validMetadata, difficulty: "impossible" }).success,
    ).toBe(false);
  });

  it("rejects missing required fields", () => {
    const rest = { ...validMetadata } as Record<string, unknown>;
    delete rest.title;
    expect(QuestionMetadataSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an empty topics list", () => {
    expect(QuestionMetadataSchema.safeParse({ ...validMetadata, topics: [] }).success).toBe(false);
  });

  it("rejects fewer than two fixtures", () => {
    const oneFixture = { ...validMetadata, fixtures: [validMetadata.fixtures[0]] };
    expect(QuestionMetadataSchema.safeParse(oneFixture).success).toBe(false);
  });

  it("rejects disallowed statement type values", () => {
    expect(
      QuestionMetadataSchema.safeParse({
        ...validMetadata,
        validation: { ...validMetadata.validation, allowedStatements: ["DROP"] },
      }).success,
    ).toBe(false);
  });

  it("rejects out-of-range execution time and output rows", () => {
    expect(
      QuestionMetadataSchema.safeParse({
        ...validMetadata,
        validation: { ...validMetadata.validation, maxExecutionTimeMs: 0 },
      }).success,
    ).toBe(false);
    expect(
      QuestionMetadataSchema.safeParse({
        ...validMetadata,
        validation: { ...validMetadata.validation, maxOutputRows: 5000 },
      }).success,
    ).toBe(false);
  });

  it("rejects unknown top-level keys", () => {
    expect(QuestionMetadataSchema.safeParse({ ...validMetadata, hacker: true }).success).toBe(
      false,
    );
  });

  it("rejects unknown fixture keys", () => {
    const parsed = QuestionMetadataSchema.safeParse({
      ...validMetadata,
      fixtures: [{ ...validMetadata.fixtures[0], surprise: 1 }],
    });
    expect(parsed.success).toBe(false);
  });
});
