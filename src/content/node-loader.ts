import { readFileSync, readdirSync, existsSync } from "node:fs";
import type { ContentFileLoader } from "./loader";

/**
 * Filesystem-backed loader used by server-rendered pages, tests, and the content
 * validation script. Kept in its own module so browser bundles never include
 * node:fs — client code only uses the bundled loaders in loader.ts.
 */
export const nodeLoader: ContentFileLoader = {
  readText: (p) => readFileSync(p, "utf8"),
  listDirectories: (p) =>
    readdirSync(p, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name),
  fileExists: (p) => existsSync(p),
};
