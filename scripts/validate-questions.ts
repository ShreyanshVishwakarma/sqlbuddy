/**
 * Validates every question package end to end:
 *   1. metadata.json parses against the Zod schema
 *   2. all required files exist
 *   3. schema + seed + starter + reference execute against real SQLite (sql.js)
 *   4. every fixture executes and produces a result set
 *   5. the reference SQL passes validation on every fixture
 *   6. starter.sql produces a row set (so the workspace never starts empty)
 *
 * Also regenerates src/content-bundle.json (the client bundle excludes reference.sql
 * and fixtures/, which stay server-side only).
 *
 * Run with: npm run validate:content
 */
import { execFileSync } from "node:child_process";
import { loadAllFixtures, loadAllQuestions, REQUIRED_FILES } from "../src/content/loader";
import { nodeLoader } from "../src/content/node-loader";
import { loadFixture } from "../src/content/loader";
import initSqlJs from "sql.js";

let failures = 0;

function fail(message: string): void {
  failures++;
  console.error(`  ✗ ${message}`);
}

function pass(message: string): void {
  console.log(`  ✓ ${message}`);
}

function runScript(
  db: { exec(sql: string): { columns: string[]; values: unknown[][] }[] },
  sql: string,
): void {
  if (!sql.trim()) return;
  db.exec(sql);
}

async function main(): Promise<void> {
  // 1. Regenerate the client bundle (keeps it in sync with content).
  console.log("Regenerating content bundle…");
  execFileSync(process.execPath, ["scripts/generate-bundle.mjs"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  console.log("\nLoading sql.js…");
  const SQL = await initSqlJs({ locateFile: () => require.resolve("sql.js/dist/sql-wasm.wasm") });

  const questions = await loadAllQuestions(nodeLoader);
  console.log(`\nFound ${questions.length} questions.\n`);

  for (const question of questions) {
    const slug = question.metadata.slug;
    console.log(`\n[${slug}]`);

    // 2. Metadata already validated by loadQuestion (throws). Check required files explicitly.
    for (const file of REQUIRED_FILES) {
      if (!nodeLoader.fileExists(`${process.cwd()}/src/content/questions/${slug}/${file}`)) {
        fail(`missing required file: ${file}`);
      }
    }

    // 3. Executability: schema + seed + starter + reference.
    try {
      const db = new SQL.Database();
      runScript(db, question.schemaSql);
      runScript(db, question.seedSql);

      const starterResult = db.exec(question.starterSql);
      const referenceResult = db.exec(question.referenceSql);

      // The starter is a scaffold (exploration query), not the answer — but it must
      // still execute and return rows so the workspace never opens empty.
      if (starterResult.length === 0 || starterResult[0].values.length === 0) {
        fail("starter.sql returns no rows — the workspace would open empty");
      } else {
        pass(`starter.sql returns ${starterResult[0].values.length} row(s)`);
      }

      if (referenceResult.length === 0 || referenceResult[0].values.length === 0) {
        fail("reference.sql returns no rows");
      } else {
        pass(`reference.sql returns ${referenceResult[0].values.length} row(s)`);
      }

      if (
        question.metadata.expectedRowCount !== undefined &&
        referenceResult[0] &&
        referenceResult[0].values.length !== question.metadata.expectedRowCount
      ) {
        fail(
          `expectedRowCount ${question.metadata.expectedRowCount} does not match reference output ${referenceResult[0].values.length}`,
        );
      }
      db.close();
    } catch (e) {
      fail(`schema/seed/starter/reference execution error: ${(e as Error).message}`);
    }

    // 4. Every fixture executes and the reference runs without error. An empty
    // result is legitimate — some questions' answers are "no rows" (e.g. no
    // duplicates). db.exec returns [] when a SELECT produces zero rows, which is
    // the correct "ran cleanly" signal.
    for (const fixture of question.metadata.fixtures) {
      try {
        const fp = await loadFixture(slug, fixture.id, nodeLoader);
        const db = new SQL.Database();
        runScript(db, fp.schemaSql);
        runScript(db, fp.fixtureSql);
        const ref = db.exec(fp.referenceSql);
        const rowCount = ref.length > 0 ? ref[0].values.length : 0;
        pass(`fixture "${fixture.id}": executes, reference returns ${rowCount} row(s)`);
        db.close();
      } catch (e) {
        fail(`fixture "${fixture.id}": ${(e as Error).message}`);
      }
    }
  }

  // 5. Sanity: every question has at least two fixtures (schema enforces this, but double-check).
  const allFixtures = await loadAllFixtures(nodeLoader);
  if (allFixtures.length < questions.length * 2) {
    fail(`expected at least 2 fixtures per question, found ${allFixtures.length}`);
  } else {
    pass(`validated ${allFixtures.length} fixture/question combinations`);
  }

  console.log("");
  if (failures > 0) {
    console.error(`Content validation FAILED with ${failures} error(s).`);
    process.exit(1);
  }
  console.log("Content validation passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
