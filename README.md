# SQL Prep Lab

Practice SQL interview questions with a **real SQLite database that runs entirely in your browser**. No backend, no sign-up, no accounts — every query you write executes locally via SQLite compiled to WebAssembly, and your drafts and progress persist only in your browser's IndexedDB.

## Why SQLite WASM in the browser?

Interview practice is interactive: you write SQL, run it, and see results immediately. Doing that on a server would mean:

- a backend, network latency, and per-request costs for every keystroke of practice;
- a way for your SQL to touch someone else's infrastructure;
- privacy concerns about what you type and where it goes.

SQL Prep Lab sidesteps all of that. The **entire SQLite engine ships to the browser as WebAssembly** and runs inside a dedicated Web Worker. Queries never leave the device, latency is zero, and the app deploys as static files on Vercel with no Functions and no database.

## Local-first architecture

```
┌────────────────────────────┐   postMessage (typed protocol)   ┌─────────────────────────────┐
│  Main thread (React/Next)  │ ───────────────────────────────▶ │  SQLite Web Worker (sql.js) │
│  · Monaco editor           │ ◀─────────────────────────────── │  · initializeQuestion       │
│  · Result grid             │     requestId-correlated replies │  · executeQuery             │
│  · Schema explorer         │                                  │  · resetDatabase            │
│  · Validation runner       │                                  │  · getSchema/previewTable   │
└────────────────────────────┘                                  └─────────────────────────────┘
        │
        ▼
  IndexedDB (idb) — drafts, attempts, completion, bookmarks, notes, theme
```

- **Questions are file-based** under `src/content/questions/` and version-controlled.
- Each question gets an **isolated in-memory SQLite database** per practice session, reconstructed from SQL files on reset. No full database is ever persisted.
- All SQL execution happens on a **Worker thread** — the UI never freezes, and a runaway query can be killed by terminating and recreating the worker.
- Monaco and the SQLite WASM are **lazy-loaded**; the landing page, catalogue, and question detail pages ship neither.

## Tech stack

| Concern           | Choice                                                    |
| ----------------- | --------------------------------------------------------- |
| Framework         | Next.js 16 (App Router), static-first                     |
| Language          | TypeScript, strict mode                                   |
| SQL engine        | [sql.js](https://sql.js.org/) (SQLite → WebAssembly)      |
| SQL execution     | Dedicated Web Worker (`new Worker(new URL(...))`)         |
| Editor            | Monaco via `@monaco-editor/react` (lazy-loaded)           |
| Persistence       | IndexedDB via [idb](https://github.com/jakearchibald/idb) |
| Validation schema | Zod                                                       |
| Styling           | Tailwind CSS v4                                           |
| Unit tests        | Vitest                                                    |
| E2E tests         | Playwright                                                |
| Lint / format     | ESLint (next config) + Prettier                           |
| Deploy            | Vercel (static)                                           |

## Local setup

```bash
npm install        # install dependencies
npm run dev        # start the dev server at http://localhost:3000
```

> The WASM binary is served from `public/sql-wasm/sql-wasm-v1.wasm` and lazy-loaded by the worker. No build step is needed for it.

## Development commands

| Command                           | Purpose                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`                     | Start the dev server                                                           |
| `npm run build`                   | Production build (all routes SSG)                                              |
| `npm run start`                   | Serve the production build                                                     |
| `npm run lint`                    | ESLint                                                                         |
| `npm run format` / `format:check` | Prettier write / check                                                         |
| `npm run typecheck`               | `tsc --noEmit`                                                                 |
| `npm run test`                    | Vitest unit tests                                                              |
| `npm run test:e2e`                | Playwright end-to-end tests                                                    |
| `npm run validate:content`        | Validate all question content end-to-end (also regenerates the client bundles) |

## Application routes

| Route               | Description                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `/`                 | Product landing page — explains local execution, CTA to questions                                  |
| `/questions`        | Searchable/filterable catalogue (difficulty, topic, keyword)                                       |
| `/questions/[slug]` | Static SEO-friendly question detail page (prompt, schema, sample data). Loads **no** Monaco/SQLite |
| `/practice/[slug]`  | Full interactive workspace (client-only, lazy-loaded runtime)                                      |
| `/dashboard`        | Local progress dashboard (completion, topics, bookmarks, recent)                                   |
| `/settings`         | Theme, notes, "Clear local data" with confirmation                                                 |

## How questions are authored

Each question lives in its own directory:

```
src/content/questions/<slug>/
  metadata.json     # Zod-validated metadata (see schema below)
  prompt.mdx        # Markdown prompt (rendered by a tiny built-in renderer)
  schema.sql        # CREATE TABLE statements
  seed.sql          # visible sample data (shown to the learner)
  starter.sql       # initial editor content
  reference.sql     # trusted solution (never shown to the learner)
  fixtures/         # extra datasets, each an edge case for validation
    base.sql
    duplicates.sql
    ...
```

### metadata.json

```jsonc
{
  "id": "second-highest-salary", // stable id
  "slug": "second-highest-salary", // URL-safe slug
  "title": "Second Highest Salary",
  "difficulty": "easy", // easy | medium | hard
  "topics": ["Subqueries", "NULL handling"],
  "description": "Return the second-highest distinct salary.",
  "concepts": ["SELECT", "DISTINCT"], // shown on the detail page
  "expectedRowCount": 1, // informational sanity check
  "validation": {
    "orderMatters": false, // row order ignored when false
    "columnNamesMatter": false, // aliases may differ when false
    "allowedStatements": ["SELECT", "WITH"], // read-only questions reject DML
    "maxExecutionTimeMs": 5000, // per-query timeout
    "maxOutputRows": 10, // output cap for the result grid
  },
  "fixtures": [
    { "id": "base", "file": "base.sql", "label": "Basic dataset" },
    { "id": "duplicates", "file": "duplicates.sql", "label": "Duplicate salaries" },
  ],
}
```

`metadata.json` is validated against `src/content/schema.ts` (Zod, strict) at load time and by `npm run validate:content`.

### Question catalogue (20 questions)

| Question                                  | Difficulty | Concepts                       |
| ----------------------------------------- | ---------- | ------------------------------ |
| Duplicate Emails                          | easy       | GROUP BY, HAVING               |
| Employees Earning More Than Their Manager | easy       | Self join                      |
| Active Users Per Day                      | easy       | COUNT(DISTINCT)                |
| Customers Without Orders                  | easy       | LEFT JOIN / NOT EXISTS         |
| Second Highest Salary                     | easy       | Subqueries, NULL handling      |
| Rising Temperature                        | easy       | LAG / self join                |
| Nth Highest Salary                        | medium     | DENSE_RANK, aggregate wrapper  |
| Rank Scores                               | medium     | DENSE_RANK vs RANK             |
| Departments by Average Salary             | medium     | GROUP BY, HAVING, subqueries   |
| Consecutive Login Days                    | medium     | Gaps and islands               |
| Longest Login Streak                      | medium     | Gaps and islands, MAX          |
| Running Total                             | medium     | SUM OVER, window frames        |
| Rolling Average Sales                     | medium     | AVG OVER, ROWS BETWEEN         |
| First and Last Order Per Customer         | medium     | FIRST_VALUE / ROW_NUMBER pivot |
| Latest Event Per User                     | medium     | ROW_NUMBER per partition       |
| Percentage of Total Sales                 | medium     | SUM OVER ()                    |
| Pivot Quarterly Sales                     | medium     | Conditional aggregation        |
| Monthly Sales Ranking                     | medium     | DENSE_RANK, PARTITION BY       |
| Orders Gap Analysis                       | medium     | LAG, date arithmetic           |
| Top Three Per Category                    | hard       | DENSE_RANK with ties           |

## How validation works

When a learner submits, the browser-side validator:

1. **Gates statement types** — a question permitting only `SELECT`/`WITH` rejects `INSERT`/`UPDATE`/`DELETE`/`PRAGMA`/etc. before anything runs. Detection is a small SQL lexer that respects string literals and comments.
2. **Isolates each fixture** — a fresh in-memory SQLite database is created, schema + fixture SQL are applied.
3. **Runs learner SQL and trusted reference SQL** independently.
4. **Compares outputs** per the question's metadata rules:
   - duplicate rows use **multiset semantics** (never collapsed);
   - `NULL` is distinct from `""` and from `0`;
   - numeric representations (`100`, `100.0`, `1e2`) are canonicalized safely;
   - row order is ignored unless `orderMatters`;
   - column aliases may differ unless `columnNamesMatter`.
5. **Returns a structured result** — pass/fail, fixtures passed count, and per-fixture reasons that never include fixture contents.

The reference SQL and fixtures are kept in a clearly isolated validation layer (`src/content/loader.ts` → `validation-bundle.json`), separate from the rendering content bundle.

### 🔒 Security limitation: client-side fixtures are not secret

Because this MVP validates **in the browser**, the reference SQL and fixtures ship to the client as part of the JS bundle. A determined user can open DevTools and read every "hidden" test. This is fine for a practice tool, but **do not use this app to host paid/secret assessments** — truly hidden validation requires a server, which is a documented future-roadmap item.

## Local persistence

IndexedDB (via `idb`) stores, per question: draft SQL, attempt count, completion state, last-opened timestamp, bookmark, and optional notes — plus the theme preference. Drafts autosave with a debounce, and a question is marked complete only after **all** fixtures pass on a submission. The dashboard reads exclusively from this local state, and the Settings page can clear it (with confirmation).

## SQLite dialect notes

The engine is SQLite (via sql.js). Common interview dialects differ in a few places:

- **Date functions**: use `strftime('%Y-%m', date_col)` instead of `DATE_TRUNC` / `DATE_FORMAT`.
- **Day difference**: `CAST(julianday(a) - julianday(b) AS INTEGER)` instead of PostgreSQL's `date - date`.
- **No `generate_series`** by default, no `FILTER (WHERE ...)` (use `CASE WHEN` + `SUM`).
- `ORDER BY` with `NULL`s sorts NULLs first in ASC — mind the fixture expectations.
- **Window functions** (`ROW_NUMBER`, `RANK`, `DENSE_RANK`, `LAG`, `SUM() OVER`) are supported.
- The seed/fixture/reference SQL in this repo is authored for SQLite.

## Deployment to Vercel

The app is fully static-friendly: every route is statically generated, no server-side database or filesystem is used, and `npm run build` needs no secrets.

1. Push this repository to GitHub.
2. In Vercel, **Import Project** → select the repo.
3. Vercel auto-detects the **Next.js** framework and the build command (`npm run build`). No env vars are required.
4. Click **Deploy**.

Cache headers for the versioned static assets and the WASM binary are configured in `next.config.ts` (`Cache-Control: public, max-age=31536000, immutable`). There are **no Vercel Functions** — `vercel.json` only pins the framework.

### Environment variables

The MVP needs **none**. See `.env.example`. If you later add telemetry or integrations, prefix browser-visible values with `NEXT_PUBLIC_`.

## Testing

- **Unit** (`npm run test`): Zod metadata validation, statement-type detection, result normalization, ordered/unordered comparison, duplicate and NULL behavior, and an integration test that runs the reference SQL through real sql.js against every fixture.
- **Content** (`npm run validate:content`): parses every metadata file, checks required files, executes schema/seed/starter/reference against real SQLite, executes every fixture, verifies the reference passes on each, and regenerates the client bundles.
- **E2E** (`npm run test:e2e`): catalogue navigation + filtering, question detail, not-found, run valid SQL, run invalid SQL, reset, submit pass/fail, and draft persistence across reload.

CI (`.github/workflows/ci.yml`) runs lint → typecheck → content validation → unit tests → build on every PR, plus the Playwright suite.

## Future roadmap

- **Optional authentication + progress sync** — move drafts/progress to an account-backed store.
- **Secure server-side validation** — run fixtures on the server so hidden tests are actually hidden (requires a backend).
- **PostgreSQL / MySQL dialect tracks** — syntax translation and dialect-specific engines (e.g. PGlite).
- **Question authoring dashboard** — a UI for creating questions without editing files.
- **Hints and explanations** — per-question hint tiers and solution walkthroughs.
