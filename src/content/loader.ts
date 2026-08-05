import path from "node:path";
import { QuestionMetadataSchema } from "./schema";
import type { FixturePackage, QuestionPackage } from "./types";
import contentBundle from "../content-bundle.json";
import validationBundle from "../validation-bundle.json";

/** Directory key used by both loaders. For the filesystem loader this is an
 * absolute path; the bundled loader strips it as a logical prefix. */
function contentDirPath(): string {
  return typeof window === "undefined" && typeof process !== "undefined"
    ? path.join(process.cwd(), "src", "content", "questions")
    : "src/content/questions";
}
const CONTENT_DIR = contentDirPath();

/** Maps a loader-relative path (e.g. "second-highest-salary/schema.sql") to the
 * bundle key form for the current platform. */
function bundleKey(p: string): string {
  // Bundle keys always use forward slashes; normalize Windows separators.
  return p.split(path.sep).join("/");
}

export class ContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentError";
  }
}

export interface ContentFileLoader {
  readText(filePath: string): string;
  listDirectories(dir: string): string[];
  fileExists(filePath: string): boolean;
}

/**
 * The default loader is chosen by environment at call time:
 * - server render / scripts → nodeLoader (filesystem, from ./node-loader)
 * - browser → bundledLoader (JSON bundles embedded in the client)
 * node-loader is imported lazily via a dynamic import so the client bundle never
 * statically depends on node:fs.
 */
async function defaultLoader(): Promise<ContentFileLoader> {
  if (typeof window === "undefined" && typeof process !== "undefined") {
    return (await import("./node-loader")).nodeLoader;
  }
  return bundledLoader;
}

type Bundle = Record<string, string>;

/** Bundled (inline) loader used by the browser when the app is prerendered/static. */
export const bundledLoader: ContentFileLoader = {
  readText: (p) => {
    const map = contentBundle as Bundle;
    const key = stripContentPrefix(bundleKey(p));
    if (!(key in map)) throw new ContentError(`Missing bundled content: ${key}`);
    return map[key];
  },
  listDirectories: (p) => {
    const map = contentBundle as Bundle;
    const prefix = stripContentPrefix(bundleKey(p));
    const withSlash = prefix === "" ? "" : prefix.endsWith("/") ? prefix : `${prefix}/`;
    const dirs = new Set<string>();
    for (const key of Object.keys(map)) {
      if (key.startsWith(withSlash)) {
        const rest = key.slice(withSlash.length);
        const top = rest.split("/")[0];
        if (top) dirs.add(top);
      }
    }
    return [...dirs].sort();
  },
  fileExists: (p) => {
    const map = contentBundle as Bundle;
    const key = stripContentPrefix(bundleKey(p));
    if (key in map) return true;
    // Root directory always "exists" when the bundle is non-empty.
    if (key === "") return Object.keys(map).length > 0;
    const withSlash = key.endsWith("/") ? key : `${key}/`;
    return Object.keys(map).some((k) => k.startsWith(withSlash));
  },
};

/** Removes the leading "src/content/questions/" prefix from a path for bundle lookup. */
function stripContentPrefix(p: string): string {
  const prefix = "src/content/questions";
  if (p === prefix || p === `${prefix}/`) return "";
  if (p.startsWith(`${prefix}/`)) return p.slice(prefix.length + 1);
  return p;
}

/**
 * Loader for the validation bundle (reference.sql + fixtures/). Used only by the
 * browser-side validation runner. This content ships to the client — see the README
 * "Security limitations" section.
 */
export const validationBundleLoader: ContentFileLoader = {
  readText: (p) => {
    const map = validationBundle as Bundle;
    const key = stripContentPrefix(bundleKey(p));
    if (!(key in map)) throw new ContentError(`Missing validation content: ${key}`);
    return map[key];
  },
  listDirectories: (p) => {
    const map = validationBundle as Bundle;
    const prefix = stripContentPrefix(bundleKey(p));
    const withSlash = prefix === "" ? "" : prefix.endsWith("/") ? prefix : `${prefix}/`;
    const dirs = new Set<string>();
    for (const key of Object.keys(map)) {
      if (key.startsWith(withSlash)) {
        const rest = key.slice(withSlash.length);
        const top = rest.split("/")[0];
        if (top) dirs.add(top);
      }
    }
    return [...dirs].sort();
  },
  fileExists: (p) => {
    const map = validationBundle as Bundle;
    const key = stripContentPrefix(bundleKey(p));
    if (key in map) return true;
    if (key === "") return Object.keys(map).length > 0;
    const withSlash = key.endsWith("/") ? key : `${key}/`;
    return Object.keys(map).some((k) => k.startsWith(withSlash));
  },
};

export const REQUIRED_FILES = [
  "metadata.json",
  "prompt.mdx",
  "schema.sql",
  "seed.sql",
  "starter.sql",
  "reference.sql",
] as const;

function resolveQuestionDir(loader: ContentFileLoader, dir: string): string {
  const full = path.join(CONTENT_DIR, dir);
  if (!loader.fileExists(path.join(full, "metadata.json"))) {
    throw new ContentError(`Question directory has no metadata.json: ${full}`);
  }
  return full;
}

function parseMetadata(raw: string, dir: string): QuestionPackage["metadata"] {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw new ContentError(`Invalid JSON in ${dir}/metadata.json: ${(e as Error).message}`);
  }
  const parsed = QuestionMetadataSchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new ContentError(`Invalid metadata for ${dir}:\n${issues}`);
  }
  return parsed.data;
}

/** Load and validate a single question package from disk. */
export function loadQuestion(dir: string, loader: ContentFileLoader): QuestionPackage {
  const base = resolveQuestionDir(loader, dir);
  const read = (file: string) => {
    const p = path.join(base, file);
    if (!loader.fileExists(p)) throw new ContentError(`Missing required file: ${p}`);
    return loader.readText(p);
  };
  // The client content bundle deliberately omits reference.sql + fixtures/; only the
  // server-side loader (and validation) requires them.
  const readOptional = (file: string): string => {
    const p = path.join(base, file);
    return loader.fileExists(p) ? loader.readText(p) : "";
  };

  const metadata = parseMetadata(read("metadata.json"), dir);
  const fixtureSql: Record<string, string> = {};
  for (const fixture of metadata.fixtures) {
    const p = path.join(base, "fixtures", fixture.file);
    if (loader.fileExists(p)) fixtureSql[fixture.id] = loader.readText(p);
  }

  return {
    metadata,
    dir,
    promptMdx: read("prompt.mdx"),
    schemaSql: read("schema.sql"),
    seedSql: read("seed.sql"),
    starterSql: read("starter.sql"),
    referenceSql: readOptional("reference.sql"),
    fixtureSql,
  };
}

/** Resolves the environment-appropriate loader when none is supplied. */
async function resolveLoader(loader?: ContentFileLoader): Promise<ContentFileLoader> {
  return loader ?? (await defaultLoader());
}

/** Load every question package in the content directory. */
export async function loadAllQuestions(loader?: ContentFileLoader): Promise<QuestionPackage[]> {
  const active = await resolveLoader(loader);
  if (!active.fileExists(CONTENT_DIR)) {
    throw new ContentError(`Questions directory not found: ${CONTENT_DIR}`);
  }
  const dirs = active.listDirectories(CONTENT_DIR);
  if (dirs.length === 0) throw new ContentError(`No question directories found in ${CONTENT_DIR}`);
  return dirs
    .map((dir) => loadQuestion(dir, active))
    .sort((a, b) => a.metadata.title.localeCompare(b.metadata.title));
}

export async function getQuestion(slug: string): Promise<QuestionPackage> {
  return (
    (await loadAllQuestions()).find((q) => q.metadata.slug === slug) ??
    (null as unknown as QuestionPackage)
  );
}

/** Load a single fixture's schema + fixture SQL + reference SQL for validation. */
export async function loadFixture(
  dir: string,
  fixtureId: string,
  loader?: ContentFileLoader,
): Promise<FixturePackage> {
  const active = await resolveLoader(loader);
  const pkg = await loadQuestion(dir, active);
  const fixtureMeta = pkg.metadata.fixtures.find((f) => f.id === fixtureId);
  const fixtureSql = fixtureMeta ? pkg.fixtureSql[fixtureId] : undefined;
  if (!fixtureMeta || !fixtureSql) {
    throw new ContentError(`Unknown fixture "${fixtureId}" for question "${dir}"`);
  }
  return {
    metadata: pkg.metadata,
    fixtureId,
    label: fixtureMeta.label,
    schemaSql: pkg.schemaSql,
    fixtureSql,
    referenceSql: pkg.referenceSql,
  };
}

/** Load all (question, fixture) pairs — used by tests and the validation script. */
export async function loadAllFixtures(loader?: ContentFileLoader): Promise<FixturePackage[]> {
  const active = await resolveLoader(loader);
  const questions = await loadAllQuestions(active);
  const results: FixturePackage[] = [];
  for (const q of questions) {
    for (const f of q.metadata.fixtures) {
      results.push(await loadFixture(q.dir, f.id, active));
    }
  }
  return results;
}

/**
 * Loads all fixture packages from the client validation bundle (metadata.json +
 * reference.sql + fixtures/ only). The validation bundle deliberately omits
 * prompts/schema/seed/starter — this loader does not need them.
 */
export function loadValidationFixtures(
  loader: ContentFileLoader = validationBundleLoader,
): FixturePackage[] {
  const dirs = loader.listDirectories(CONTENT_DIR);
  const packages: FixturePackage[] = [];
  for (const dir of dirs) {
    const base = path.join(CONTENT_DIR, dir);
    const metadata = parseMetadata(loader.readText(path.join(base, "metadata.json")), dir);
    for (const fixture of metadata.fixtures) {
      const fixturePath = path.join(base, "fixtures", fixture.file);
      const referencePath = path.join(base, "reference.sql");
      packages.push({
        metadata,
        fixtureId: fixture.id,
        label: fixture.label,
        schemaSql: loader.readText(path.join(base, "schema.sql")) ?? "",
        fixtureSql: loader.readText(fixturePath),
        referenceSql: loader.readText(referencePath),
      });
    }
  }
  return packages;
}
