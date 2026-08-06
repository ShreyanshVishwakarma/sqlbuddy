import { test, expect, type Page } from "@playwright/test";

/** Replaces the Monaco editor content with the given SQL via Monaco's own API. */
async function setEditorSql(page: Page, sql: string) {
  await page.waitForFunction(
    () =>
      (window as unknown as { __sqlEditorSetValue?: unknown }).__sqlEditorSetValue !== undefined,
  );
  await page.evaluate((s) => {
    (window as unknown as { __sqlEditorSetValue: (v: string) => void }).__sqlEditorSetValue(s);
  }, sql);
}

/** Runs the editor's current content and waits for the run to settle. */
async function runCurrentQuery(page: Page) {
  await page.getByRole("button", { name: "Run ▸" }).click();
  await expect(page.getByText(/rows?/).first()).toBeVisible({ timeout: 15000 });
}

test.describe("catalogue", () => {
  test("navigates to the question catalogue and filters", async ({ page }) => {
    await page.goto("/questions");

    await expect(page.getByRole("heading", { name: "Questions" })).toBeVisible();
    await expect(page.getByText("Second Highest Salary")).toBeVisible();

    // Search narrows the list.
    await page.getByLabel("Search questions").fill("customers");
    await expect(page.getByText("Customers Without Orders")).toBeVisible();
    await expect(page.getByText("Second Highest Salary")).toBeHidden();

    // Difficulty filter.
    await page.getByLabel("Search questions").fill("");
    await page.getByRole("button", { name: "hard" }).click();
    await expect(page.getByText("Top Three Per Category")).toBeVisible();
    await expect(page.getByText("Second Highest Salary")).toBeHidden();
  });
});

test.describe("question detail page", () => {
  test("shows prompt, schema, and start practice CTA", async ({ page }) => {
    await page.goto("/questions/second-highest-salary");

    await expect(
      page.getByRole("heading", { name: "Second Highest Salary" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Prompt" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Schema" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Start Practice" })).toBeVisible();
  });

  test("renders a not-found page for an unknown slug", async ({ page }) => {
    await page.goto("/questions/does-not-exist");
    await expect(page.getByText("Question not found")).toBeVisible();
  });
});

test.describe("practice workspace", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/practice/second-highest-salary");
    await expect(
      page.getByRole("heading", { name: "Second Highest Salary" }).first(),
    ).toBeVisible();
    await expect(page.getByText("SQLite ready")).toBeVisible({ timeout: 30000 });
  });

  test("runs the scaffold starter SQL and renders results", async ({ page }) => {
    // The starter is now a scaffold (SELECT * ...), not the answer.
    await runCurrentQuery(page);
    await expect(page.getByRole("cell", { name: "100" }).first()).toBeVisible();
  });

  test("toggles the answer into the editor and hides it again", async ({ page }) => {
    await page.getByRole("button", { name: "Answer" }).click();
    // The reference for second-highest-salary returns the scalar 90.
    await page.getByRole("button", { name: "Run ▸" }).click();
    await expect(page.getByRole("cell", { name: "90" }).first()).toBeVisible();
    // Run/Submit are disabled while the answer is showing.
    await expect(page.getByRole("button", { name: "Submit" })).toBeDisabled();

    await page.getByRole("button", { name: "Hide answer" }).click();
    // Draft is restored: the scaffold starter begins with SELECT id, name, salary.
    await expect(page.getByRole("textbox").first()).toBeVisible();
    await runCurrentQuery(page);
    await expect(page.getByRole("cell", { name: "100" }).first()).toBeVisible();
  });

  test("runs invalid SQL and shows the error UI", async ({ page }) => {
    await setEditorSql(page, "SELEC 1");
    await page.getByRole("button", { name: "Run ▸" }).click();
    await expect(page.getByText("SQL Error")).toBeVisible();
  });

  test("reset restores the original database", async ({ page }) => {
    // Mutate the DB via a write... allowed at run time (only submission gates DML).
    await setEditorSql(page, "DELETE FROM employee");
    await page.getByRole("button", { name: "Run ▸" }).click();
    await expect(page.getByText("0 rows")).toBeVisible();

    await page.getByRole("button", { name: "Reset" }).click();
    await setEditorSql(page, "SELECT COUNT(*) AS n FROM employee");
    await page.getByRole("button", { name: "Run ▸" }).click();
    await expect(page.getByRole("cell", { name: "5" }).first()).toBeVisible();
  });

  test("submits a correct solution and passes", async ({ page }) => {
    // Avoid "<" which keyboard.type can mangle; NOT IN + MAX is a valid second-highest.
    await setEditorSql(
      page,
      "SELECT MAX(salary) AS second_highest_salary FROM employee WHERE salary NOT IN (SELECT MAX(salary) FROM employee)",
    );
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText(/Passed/)).toBeVisible({ timeout: 30000 });
  });

  test("Ctrl+Shift+Enter submits from outside the editor", async ({ page }) => {
    await setEditorSql(page, "SELECT 999 AS second_highest_salary");
    // Focus lives in the notes textarea, not the Monaco editor.
    await page.getByLabel("Notes").click();
    await page.keyboard.press("Control+Shift+Enter");
    await expect(page.getByText(/Not quite/)).toBeVisible({ timeout: 30000 });
  });

  test("Ctrl+' runs the query without submitting", async ({ page }) => {
    await setEditorSql(page, "SELECT 42 AS answer");
    await page.getByLabel("Notes").click();
    await page.keyboard.press("Control+'");
    // It runs: the result cell renders.
    await expect(page.getByRole("cell", { name: "42" }).first()).toBeVisible({ timeout: 15000 });
    // It does not submit: no pass/fail verdict appears.
    await expect(page.getByText(/Passed|Not quite/)).toBeHidden();
  });

  test("submits an incorrect solution and fails without revealing fixtures", async ({ page }) => {
    await setEditorSql(page, "SELECT 999 AS second_highest_salary");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText(/Not quite/)).toBeVisible({ timeout: 30000 });
    // Fixture contents must not leak.
    await expect(page.getByText("INSERT INTO")).toBeHidden();
  });

  test("persists a draft across reload", async ({ page }) => {
    await setEditorSql(page, "SELECT id FROM employee ORDER BY id");
    await page.waitForTimeout(800); // debounce
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Second Highest Salary" }).first(),
    ).toBeVisible();
    // Verify the restored draft by running it: the query selects ids 1..5.
    await page.waitForSelector("text=SQLite ready", { timeout: 30000 });
    await runCurrentQuery(page);
    await expect(page.getByRole("cell", { name: "1" }).first()).toBeVisible();
  });
});

test.describe("dashboard", () => {
  test("shows local progress and a clear local data action", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText(/stored only in this browser/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" }).first()).toBeVisible();
  });
});
