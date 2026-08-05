/**
 * Generates src/content-bundle.json and src/validation-bundle.json from the
 * question content on disk.
 *
 * content-bundle.json  → everything the client needs to render questions (metadata,
 *                        prompts, schema, seed, starter). NO reference/fixtures.
 * validation-bundle.json → reference.sql + fixtures/ per question, used ONLY by the
 *                        browser-side validation runner.
 *
 * Run via `npm run validate:content` (which also validates everything end to end)
 * or directly: node scripts/generate-bundle.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(root, "src", "content", "questions");

const EXCLUDED_DIRS = new Set(["fixtures"]);
const EXCLUDED_FILES = new Set(["reference.sql"]);

if (!existsSync(contentDir)) {
  console.error(`Questions directory not found: ${contentDir}`);
  process.exit(1);
}

const contentBundle = {};
const validationBundle = {};
const dirs = readdirSync(contentDir, { withFileTypes: true }).filter((d) => d.isDirectory());

for (const dir of dirs) {
  const base = path.join(contentDir, dir.name);
  for (const file of readdirSync(base, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(file.name)) {
      // collect fixtures recursively
      const fixtureBase = path.join(base, file.name);
      for (const fx of readdirSync(fixtureBase, { withFileTypes: true })) {
        if (fx.isFile()) {
          validationBundle[path.join(dir.name, "fixtures", fx.name)] = readFileSync(
            path.join(fixtureBase, fx.name),
            "utf8",
          );
        }
      }
      continue;
    }
    if (!file.isFile()) continue;
    const rel = path.join(dir.name, file.name);
    if (
      EXCLUDED_FILES.has(file.name) ||
      file.name === "metadata.json" ||
      file.name === "schema.sql"
    ) {
      // reference.sql + metadata.json + schema.sql + fixtures/ feed the validation runner.
      validationBundle[rel] = readFileSync(path.join(base, file.name), "utf8");
      // metadata.json + schema.sql are also needed to render questions in the browser.
      contentBundle[rel] = readFileSync(path.join(base, file.name), "utf8");
      continue;
    }
    contentBundle[rel] = readFileSync(path.join(base, file.name), "utf8");
  }
}

const contentOut = path.join(root, "src", "content-bundle.json");
const validationOut = path.join(root, "src", "validation-bundle.json");
writeFileSync(contentOut, JSON.stringify(contentBundle, null, 2) + "\n");
writeFileSync(validationOut, JSON.stringify(validationBundle, null, 2) + "\n");
console.log(
  `Wrote ${contentOut} with ${Object.keys(contentBundle).length} files from ${dirs.length} questions.`,
);
console.log(
  `Wrote ${validationOut} with ${Object.keys(validationBundle).length} validation-only files.`,
);
