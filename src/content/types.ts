import type { QuestionMetadata } from "./schema";

/** A fully loaded question package (metadata + SQL + markdown prompt). */
export interface QuestionPackage {
  metadata: QuestionMetadata;
  /** Directory name used to locate the package on disk (e.g. "second-highest-salary"). */
  dir: string;
  promptMdx: string;
  schemaSql: string;
  seedSql: string;
  starterSql: string;
  referenceSql: string;
  /** Fixture SQL keyed by fixture id (from metadata.fixtures[].file). */
  fixtureSql: Record<string, string>;
}

export interface FixturePackage {
  metadata: QuestionMetadata;
  fixtureId: string;
  /** Human label from metadata (used only in outcome reporting). */
  label: string;
  schemaSql: string;
  fixtureSql: string;
  referenceSql: string;
}
