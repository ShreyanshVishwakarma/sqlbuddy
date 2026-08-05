import { z } from "zod";

/** Allowed SQL statement types that a learner query may be checked against. */
export const StatementTypeSchema = z.enum(["SELECT", "WITH", "INSERT", "UPDATE", "DELETE"]);
export type StatementType = z.infer<typeof StatementTypeSchema>;

export const DifficultySchema = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof DifficultySchema>;

/**
 * Per-question validation rules. These live in content so the generic validator
 * never hard-codes question-specific logic.
 */
export const ValidationOptionsSchema = z
  .object({
    /** Whether output row order must match the reference exactly. */
    orderMatters: z.boolean(),
    /** Whether column names/aliases must match the reference. */
    columnNamesMatter: z.boolean(),
    /** Statement types the learner is allowed to execute when submitting. */
    allowedStatements: z.array(StatementTypeSchema).min(1),
    /** Maximum execution time in milliseconds before a query is killed. */
    maxExecutionTimeMs: z.number().int().positive().max(30000),
    /** Maximum rows returned before the result is considered truncated. */
    maxOutputRows: z.number().int().positive().max(1000),
  })
  .strict();

export const FixtureSchema = z
  .object({
    /** Stable id used for display only (e.g. "duplicates"). */
    id: z.string().min(1),
    /** Human label shown after submission, without exposing fixture contents. */
    label: z.string().min(1),
    /** File name of the fixture SQL under the question's fixtures/ directory. */
    file: z.string().min(1),
    /** Short note for content authors about what edge case the fixture covers. */
    description: z.string().optional(),
  })
  .strict();

export const QuestionMetadataSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be URL-safe"),
    title: z.string().min(1),
    difficulty: DifficultySchema,
    topics: z.array(z.string().min(1)).min(1),
    description: z.string().min(1),
    /** SQL concepts this question exercises (shown on the detail page). */
    concepts: z.array(z.string()).default([]),
    /** How many rows the reference result should contain (informational). */
    expectedRowCount: z.number().int().nonnegative().optional(),
    validation: ValidationOptionsSchema,
    fixtures: z.array(FixtureSchema).min(2),
  })
  .strict();

export type QuestionMetadata = z.infer<typeof QuestionMetadataSchema>;
export type ValidationOptions = z.infer<typeof ValidationOptionsSchema>;
export type Fixture = z.infer<typeof FixtureSchema>;
