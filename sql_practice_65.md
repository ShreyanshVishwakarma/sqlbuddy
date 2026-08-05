# SQL Interview Practice — 65 Questions with Hints & Solutions

A portable, interview-focused bank of SQL problems with **hints**, **solutions**, and **edge-case notes** (row grain, duplicates, NULLs, ties) for every question. Each problem states the **grain** of every intermediate result — the level of detail a row represents (e.g., one row per employee, one row per order) — so you can reason about `JOIN` fan-out, `GROUP BY` output, and window-partition output the way interviewers expect.

**How to use this file**

- Work top-down: read the question, attempt it, then reveal the hint only if stuck, and finally compare with the solution.
- If you only have a few minutes, hit the starred **core classics** first (Q1–Q13, Q24, Q36) — those are the highest-frequency asks.
- Solutions target **PostgreSQL/MySQL** syntax; dialect notes are called out where they matter (SQL Server, BigQuery, SQLite).

**Navigation**

| Block                                                                                                 | Questions | Block                                                                                        | Questions |
| ----------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------- | --------- |
| [1–13: Window & Core Classics](#part-1---q1q13-window--core-classics)                                 | 1–13      | [40–52: Grouping, Ranking & Analytics](#part-4---q40q52-grouping-ranking--analytics)         | 40–52     |
| [14–26: Joins, Dates & Conditional Logic](#part-2---q14q26-joins-dates--conditional-logic)            | 14–26     | [53–65: Subqueries, Optimization & Schema](#part-5---q53q65-subqueries-optimization--schema) | 53–65     |
| [27–39: Advanced Patterns & Concept Questions](#part-3---q27q39-advanced-patterns--concept-questions) | 27–39     |                                                                                              |           |

---

## Part 1 - Q1–Q13: Window & Core Classics

### Q1. Second Highest Salary ⭐

> **Prompt:** Write a query for "Second Highest Salary". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Microsoft | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window / subquery | **Difficulty:** easy

**Schema**

```sql
CREATE TABLE employee (
    id       INT PRIMARY KEY,
    salary   INT           -- NULL is allowed (no one has a NULL salary in practice, but handle it)
);
```

**Question to answer:** Return the second-highest distinct salary. If it doesn't exist, return `NULL`.

<details>
<summary><b>Hint</b></summary>

Two classic strategies:

1. **Distinct + OFFSET:** List distinct salaries in descending order, skip the highest, take the next one. If there are fewer than 2 distinct salaries you get no row — wrap in an aggregate so you return `NULL` instead of an empty result.
2. **Window function:** Assign `DENSE_RANK()` over `salary DESC` (dense rank so ties don't skip values) and keep the row with rank = 2.

If the problem means _nth distinct salary_, you need `DENSE_RANK` — plain `RANK` would skip when there are ties, and `ROW_NUMBER` would give a different answer when multiple employees share the top salary.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of CTE: one row per distinct salary value.
-- Grain of final result: zero or one row (a single scalar).
WITH distinct_salaries AS (
    SELECT DISTINCT salary
    FROM employee
    WHERE salary IS NOT NULL
)
SELECT MAX(salary) AS second_highest_salary
FROM distinct_salaries
WHERE salary < (SELECT MAX(salary) FROM distinct_salaries);
```

Window version (returns `NULL` automatically because the subquery in `SELECT` evaluates to `NULL` when no row matches):

```sql
-- Grain: one row per distinct salary, ranked; final: one row.
SELECT MAX(salary) AS second_highest_salary
FROM (
    SELECT salary,
           DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM employee
    WHERE salary IS NOT NULL
) ranked
WHERE rnk = 2;
```

`OFFSET` alternative (note: empty result, not `NULL`, when there is no 2nd-highest):

```sql
SELECT DISTINCT salary AS second_highest_salary
FROM employee
ORDER BY salary DESC
LIMIT 1 OFFSET 1;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **No second-highest (fewer than 2 distinct salaries):** the `MAX(...)` / window wrappers return `NULL`; the bare `OFFSET` version returns zero rows — decide which your interviewer wants.
- **Ties at the top:** `100, 100, 90` — the second-highest is `90`, not `100`. `DENSE_RANK` handles this; `ROW_NUMBER` would wrongly pick `100`.
- **Duplicates:** the `DISTINCT`/dense-rank approach treats equal salaries as one value, which is the standard interview meaning of "second highest salary".
- **NULLs:** ignore them (`WHERE salary IS NOT NULL`); in SQL, `NULL` sorts first in ascending order in PostgreSQL/MySQL, so excluding it prevents "highest = NULL" surprises.

</details>

---

### Q2. Top Three Salaries by Department ⭐

> **Prompt:** Write a query for "Top Three Salaries by Department". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE employee (
    id            INT PRIMARY KEY,
    name          VARCHAR(100),
    salary        INT,
    department_id INT
);

CREATE TABLE department (
    id   INT PRIMARY KEY,
    name VARCHAR(100)
);
```

**Question to answer:** Return the top **three** salaries per department. If several employees tie for third place, include them all (a "dense top 3").

<details>
<summary><b>Hint</b></summary>

Rank employees _within_ each department using `DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC)`. "Top three" with ties included is exactly `rnk <= 3`. Use `DENSE_RANK`, not `ROW_NUMBER` — `ROW_NUMBER` would arbitrarily drop tied employees, and plain `RANK` would skip rank values so you might return more than the intended number of rows (also valid, but usually not what's asked). The final `JOIN` to `department` is a pure lookup — it does not change grain.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of ranked CTE: one row per employee (window rows = source rows, no fan-out).
-- Grain of final result: one row per employee who is in the top 3 of their department.
WITH ranked AS (
    SELECT e.id, e.name, e.salary, e.department_id,
           DENSE_RANK() OVER (
               PARTITION BY e.department_id
               ORDER BY e.salary DESC
           ) AS rnk
    FROM employee e
)
SELECT d.name AS department, r.name, r.salary
FROM ranked r
JOIN department d ON d.id = r.department_id
WHERE r.rnk <= 3
ORDER BY d.name, r.salary DESC;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Ties:** four employees on 100/90/90/80 — `DENSE_RANK` gives 1,2,2,3, so both 90s and the 80 come back (5 rows). `ROW_NUMBER` would return only 3 rows and silently drop one of the 90s.
- **Departments with fewer than 3 employees:** the query naturally returns what exists — no padding with `NULL` rows needed unless the interviewer asks for exactly 3 slots (then add a row-numbered `LEFT JOIN` against a numbers table).
- **Departments with no employees:** not present in the result at all (`INNER JOIN` semantics). Use `LEFT JOIN` from `department` if they want those listed.
- **NULL salaries:** `DENSE_RANK` places NULLs first in a `DESC` ordering in PostgreSQL — filter or `COALESCE` if NULLs should not rank.
- **Duplicate employees (same id listed twice):** grain is one row per employee because you rank at `employee` level and partition by department.

</details>

---

### Q3. Employees Earning More Than Managers ⭐

> **Prompt:** Write a query for "Employees Earning More Than Managers". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Meta | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Self join | **Difficulty:** easy

**Schema**

```sql
CREATE TABLE employee (
    id         INT PRIMARY KEY,
    name       VARCHAR(100),
    salary     INT,
    manager_id INT   -- NULL for the CEO / top-level employees
);
```

**Question to answer:** Find employees whose salary is greater than their direct manager's salary.

<details>
<summary><b>Hint</b></summary>

An employee's manager is another row in the **same** table → self join. Join `employee e` to `employee m` on `e.manager_id = m.id`, then filter `e.salary > m.salary`. The join is on the unique primary key `m.id`, so it cannot fan out — grain stays one row per employee.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of joined CTE: one row per employee (manager side is 0..1 rows because manager_id is FK-ish to id).
-- Grain of final result: one row per qualifying employee.
SELECT e.name AS employee, e.salary AS employee_salary,
       m.name AS manager,   m.salary AS manager_salary
FROM employee e
JOIN employee m ON m.id = e.manager_id
WHERE e.salary > m.salary;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **CEO / employees with `manager_id IS NULL`:** the `JOIN` drops them (no matching manager). If you want them visible, `LEFT JOIN` and compare — the NULL manager comparison yields `NULL`, which filters out under `WHERE e.salary > m.salary` anyway (NULL comparisons are not true).
- **Manager missing from table (dangling `manager_id`):** inner join drops the employee; `LEFT JOIN` keeps them with `m.*` NULL.
- **Equal salaries:** `>` excludes ties — the question says "more than", so equal is correctly excluded. Watch for interviewers who intend "at least".
- **Self-referencing row (`manager_id = id`):** impossible in practice; a `LEFT JOIN` guard `e.id <> m.id` is cheap insurance if data is dirty.
- **No duplicates introduced:** the join key is the unique `employee.id`, so there's no fan-out risk.

</details>

---

### Q4. Customers Who Never Order ⭐

> **Prompt:** Write a query for "Customers Who Never Order". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Microsoft | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** LEFT JOIN / anti-join | **Difficulty:** easy

**Schema**

```sql
CREATE TABLE customers (
    id   INT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE orders (
    id          INT PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id)
);
```

**Question to answer:** List customers who have never placed an order.

<details>
<summary><b>Hint</b></summary>

This is an **anti-join** — keep customers with _no_ matching order. Two idiomatic forms:

1. `LEFT JOIN` + `WHERE orders.id IS NULL`.
2. `NOT EXISTS` subquery (usually the clearest and often the fastest because it can stop at the first match).

Watch the join-key: `LEFT JOIN orders o ON o.customer_id = c.id` — if you accidentally put the predicate in the `WHERE` of the join clause it still works, but a NULL `customer_id` in orders would then falsely match; use `ON o.customer_id = c.id` (equality with NULL is never true, so NULL order rows can't match).
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of LEFT JOIN: one row per customer (0..1 order rows per customer here; if a customer could have
-- many orders this becomes one row per (customer, order) — hence the NULL-filter anti-join form).
-- Grain of final result: one row per customer with zero orders.
-- Form 1: LEFT JOIN / anti-join
SELECT c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;

-- Form 2: NOT EXISTS (same grain: one row per customer with no orders)
SELECT c.name
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.customer_id = c.id
);
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Customer with many orders:** the `LEFT JOIN` form fans out to one row per order; the NULL filter collapses it back to zero rows for that customer — final result is still correct, but on big tables that fan-out is why `NOT EXISTS` is often preferred.
- **Duplicate customers (same name, different ids):** each id is evaluated separately — both names appear, which is usually correct ("customers" = distinct ids).
- **Orders with `customer_id = NULL`:** can never match `o.customer_id = c.id` (NULL comparison), so they don't falsely rescue a customer — good. They also don't break anything.
- **Empty customers table:** returns no rows (trivially correct).
- **Ties / ordering:** no ordering implied; add `ORDER BY c.id` or `name` for deterministic output.

</details>

---

### Q5. Consecutive Logins

> **Prompt:** Write a query for "Consecutive Logins". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Meta · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE logins (
    user_id  INT,
    login_at DATE,   -- one row per (user, day) after dedup
    PRIMARY KEY (user_id, login_at)
);
```

**Question to answer:** Find users who logged in on **3 or more consecutive days**.

<details>
<summary><b>Hint</b></summary>

This is the classic "consecutive days" pattern:

1. **Dedupe** to one row per (user, day) — otherwise a user with two logins the same day breaks the streak math.
2. **Number the days** per user: `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_at)`.
3. **Subtract the row number from the date:** `login_at - rn`. Consecutive days produce the **same** subtracted value (the "island" key).
4. Group by (user, island key) and count; keep groups with `count >= 3`.

Why this works: if dates are consecutive, date − row_number is constant; a gap shifts the constant.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of deduped CTE: one row per (user, day).
-- Grain of numbered CTE: one row per (user, day) with a per-user sequence number.
-- Grain of final result: one row per (user, consecutive-run) that is at least 3 days long.
WITH deduped AS (
    SELECT DISTINCT user_id, login_at
    FROM logins
),
numbered AS (
    SELECT user_id, login_at,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_at) AS rn
    FROM deduped
),
islands AS (
    SELECT user_id, login_at - rn AS grp   -- PostgreSQL: date - int = date
    FROM numbered
)
SELECT user_id, COUNT(*) AS consecutive_days
FROM islands
GROUP BY user_id, grp
HAVING COUNT(*) >= 3;

-- MySQL: DATE_SUB(login_at, INTERVAL rn DAY) instead of login_at - rn
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Duplicate same-day logins:** dedupe first or the island math breaks (two rows on day 1 → rn jumps → false gap).
- **Multiple streaks per user:** grouping by (user, grp) returns one row per streak — the result above lists all streaks of ≥ 3 days; if only the _longest_ streak per user is wanted, wrap in `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY COUNT(*) DESC)`.
- **Exactly 3 days:** `HAVING COUNT(*) >= 3` includes exactly-3 (the stated requirement).
- **NULL dates:** excluded by any row with NULL `login_at` in the `DISTINCT`/ordering path — filter explicitly if data can be dirty.
- **Ties on dates within a user:** impossible after `DISTINCT`; that's why dedupe precedes `ROW_NUMBER`.
- **Grain:** every intermediate stays at one row per (user, day); only the final `GROUP BY` collapses to per-streak.

</details>

---

### Q6. Running Total ⭐

> **Prompt:** Write a query for "Running Total". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE sales (
    id         INT PRIMARY KEY,
    sale_date  DATE,
    amount     NUMERIC(10,2),
    account_id INT
);
```

**Question to answer:** Compute a running total of sales over time, **per account**.

<details>
<summary><b>Hint</b></summary>

Use a **window frame**: `SUM(amount) OVER (PARTITION BY account_id ORDER BY sale_date, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`. Add `id` (or any unique key) to the `ORDER BY` as a tiebreaker so the running total is deterministic when two sales share a date. The window function does not change grain — output stays one row per sale, with a cumulative column added.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain: one row per sale, with an added cumulative column.
SELECT id, account_id, sale_date, amount,
       SUM(amount) OVER (
           PARTITION BY account_id
           ORDER BY sale_date, id
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS running_total
FROM sales
ORDER BY account_id, sale_date, id;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Ties on sale_date:** without a tiebreaker (`id`), the ordering — and therefore the running total — is nondeterministic across equal dates.
- **NULL amounts:** `SUM` ignores NULLs, so the running total silently skips them. Decide whether to `COALESCE(amount, 0)`.
- **Multiple accounts:** `PARTITION BY account_id` resets the running total per account. Omitting the partition gives a global running total — a common interview trap.
- **Duplicate rows (same id twice):** each row is summed separately — the running total counts both. That matches "sum of all sale rows"; dedupe first if it shouldn't.
- **Empty partition / zero sales:** a partition with no rows contributes no output rows — the running total is only defined per existing row.

</details>

---

### Q7. Deduplicate Rows

> **Prompt:** Write a query for "Deduplicate Rows". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Microsoft | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE events (
    id         INT,          -- NOT unique here: the table has true duplicates
    user_id    INT,
    event_type VARCHAR(50),
    created_at TIMESTAMP
);
```

**Question to answer:** Remove duplicate rows from `events` — a row is a duplicate when `id, user_id, event_type, created_at` all match another row — keeping exactly one copy of each.

<details>
<summary><b>Hint</b></summary>

Assign `ROW_NUMBER() OVER (PARTITION BY id, user_id, event_type, created_at ORDER BY ...)` and keep only rows with number 1. To **keep** duplicates use a CTE + `DELETE WHERE rn > 1`; to **view** de-duplicated data, wrap in `SELECT ... WHERE rn = 1`. If there's a natural "keep the newest" rule, order by `created_at DESC` (or a surrogate key) inside the partition instead of picking arbitrarily.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of numbered CTE: one row per source row, with a per-duplicate-group sequence number.
-- Grain of final result: one row per unique (id, user_id, event_type, created_at) combination.

-- View without duplicates:
WITH numbered AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY id, user_id, event_type, created_at
        ORDER BY created_at DESC   -- keep newest copy; any deterministic key works
    ) AS rn
    FROM events
)
SELECT id, user_id, event_type, created_at
FROM numbered
WHERE rn = 1;

-- Delete duplicates permanently (PostgreSQL/MySQL/SQL Server all support this form):
WITH numbered AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY id, user_id, event_type, created_at
        ORDER BY created_at DESC
    ) AS rn
    FROM events
)
DELETE FROM events
WHERE (id, user_id, event_type, created_at) IN (
    SELECT id, user_id, event_type, created_at FROM numbered WHERE rn > 1
);
-- Simpler, where supported: DELETE FROM numbered WHERE rn > 1;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **True duplicate rows vs duplicate keys:** partition on the _whole logical key_ (all business columns), not just the id, unless id is meant to be unique.
- **Ties in the ordering:** two exact duplicates have identical `created_at`, so `ROW_NUMBER` ordering ties break arbitrarily — harmless, because the copies are identical.
- **NULLs:** `PARTITION BY` groups NULLs together (NULL = NULL for grouping purposes), so rows with NULL columns still dedupe correctly.
- **Which copy to keep:** if all columns are identical the choice doesn't matter; if only a subset defines the duplicate, `ORDER BY` decides (e.g., newest `created_at`).
- **Grain:** the numbered CTE is one row per source row (no fan-out); the delete removes every row with `rn > 1`, leaving exactly one per group.

</details>

---

### Q8. Department Median Salary

> **Prompt:** Write a query for "Department Median Salary". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Google · Amazon | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window / percentile | **Difficulty:** hard

**Schema**

```sql
CREATE TABLE employee (
    id            INT PRIMARY KEY,
    name          VARCHAR(100),
    salary        INT,
    department_id INT
);
```

**Question to answer:** Return the median salary per department (median = the middle value when ordered; for an even count, the average of the two middle values).

<details>
<summary><b>Hint</b></summary>

Three approaches, from simplest to most explicit:

1. **Percentile function (PostgreSQL):** `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary)` — continuous median (averages the two middles on even counts).
2. **Row counting trick:** for each row, compute `ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary)` and the partition size; keep rows where the row number is `(n+1)/2` (floor) or `(n+2)/2` (ceil), then average.
3. **Two-row approach:** the median is `AVG(salary)` of the rows at positions `FLOOR((n+1)/2)` and `CEIL((n+1)/2)`.

Watch ties: if salaries repeat, the row-position approach still works because it keys on position, not value.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Simplest: PERCENTILE_CONT (continuous median, PostgreSQL / SQL Server / BigQuery)
-- Grain of final result: one row per department.
SELECT department_id,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) AS median_salary
FROM employee
WHERE salary IS NOT NULL
GROUP BY department_id;

-- Explicit row-position version (works everywhere), one row per employee in the CTE:
WITH ranked AS (
    SELECT department_id, salary,
           ROW_NUMBER() OVER (
               PARTITION BY department_id ORDER BY salary
           ) AS rn,
           COUNT(*) OVER (PARTITION BY department_id) AS n
    FROM employee
    WHERE salary IS NOT NULL
)
-- Grain of final result: one row per department (AVG collapses the 1–2 middle rows).
SELECT department_id, AVG(salary) AS median_salary
FROM ranked
WHERE rn IN (FLOOR((n + 1) / 2.0), CEIL((n + 1) / 2.0))
GROUP BY department_id;

-- MySQL has no PERCENTILE_CONT: simulate with a correlated subquery counting how many salaries are <= each salary.
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Even count (4 employees):** positions 2 and 3 are averaged — `FLOOR((4+1)/2)=2`, `CEIL((4+1)/2)=3`. `PERCENTILE_CONT` does the same; `PERCENTILE_DISC` would return only one value (position 3 in a 4-set, or the lower middle) — know which your interviewer means.
- **Ties in salary:** both approaches are position-based, so ties can't distort the median (each salary gets its own row number even when values repeat).
- **Odd count:** both middle-row approaches collapse to a single row; `AVG` of one value is that value.
- **NULL salaries:** exclude them (`WHERE salary IS NOT NULL`) — medians over NULLs are undefined.
- **Department with 0 or 1 employee:** `PERCENTILE_CONT` over 1 row = that salary; 0 rows → `NULL` (or no row, depending on dialect).
- **Grain:** the ranked CTE is one row per employee (window rows = source rows); the final `GROUP BY` collapses to per-department.

</details>

---

### Q9. Gaps and Islands

> **Prompt:** Write a query for "Gaps and Islands". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Google · Meta | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window | **Difficulty:** hard

**Schema**

```sql
CREATE TABLE visits (
    user_id    INT,
    visit_date DATE,
    PRIMARY KEY (user_id, visit_date)
);
```

**Question to answer:** For each user, group consecutive visit dates into contiguous "islands" and return each island's start date, end date, and length. (The complement — finding the gaps — follows from the same island grouping.)

<details>
<summary><b>Hint</b></summary>

The canonical trick: **date minus row number**. For consecutive dates, `visit_date - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY visit_date)` is a constant per island; a gap changes the value, which splits the islands. Then group by (user, island key) and take `MIN`, `MAX`, `COUNT`. Dedupe (one row per user/day) before numbering if the source can contain duplicate dates.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of numbered CTE: one row per (user, day) with a per-user sequence number.
-- Grain of islands CTE: one row per (user, day) tagged with its island key.
-- Grain of final result: one row per (user, contiguous island).
WITH deduped AS (
    SELECT DISTINCT user_id, visit_date
    FROM visits
),
numbered AS (
    SELECT user_id, visit_date,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY visit_date) AS rn
    FROM deduped
)
SELECT user_id,
       MIN(visit_date) AS island_start,
       MAX(visit_date) AS island_end,
       COUNT(*)        AS island_length
FROM numbered
GROUP BY user_id, visit_date - rn            -- PostgreSQL; MySQL: DATE_SUB(visit_date, INTERVAL rn DAY)
ORDER BY user_id, island_start;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Duplicate dates:** dedupe first; otherwise the same calendar day gets two row numbers and the island key drifts.
- **Single-day islands:** `MIN = MAX`, length 1 — correctly returned as their own island.
- **Users with no visits:** absent from the result (islands only exist where data exists).
- **NULL dates:** excluded — filter if needed.
- **Multiple islands per user:** each (user, island key) group is one output row; order by start date for readability.
- **Grain:** intermediates are one row per (user, day); only the final `GROUP BY` collapses to per-island.

</details>

---

### Q10. Monthly Retention ⭐

> **Prompt:** Write a query for "Monthly Retention". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Meta | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** CTE + dates | **Difficulty:** hard

**Schema**

```sql
CREATE TABLE activity (
    user_id   INT,
    event_date DATE,   -- one row per user activity on a day
    event_type VARCHAR(50)
);
```

**Question to answer:** Compute a classic **monthly retention** metric — for each cohort month (a user's first activity month), the fraction of those users still active in each subsequent month.

<details>
<summary><b>Hint</b></summary>

1. **Cohort month per user:** `MIN(DATE_TRUNC('month', event_date))` grouped by user — the user's first activity month.
2. **Active month per user:** `DISTINCT` month of each activity.
3. Join the two, then count distinct users per (cohort_month, active_month) and divide by the cohort size.

Two numbers are expected: the **absolute** retained user count per (cohort, month) and the **retention rate** (cohort size in the denominator). Watch duplicates — a user active 5 times in one month must count once, so `COUNT(DISTINCT user_id)` is required.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of cohorts CTE: one row per user (their first month).
-- Grain of monthly CTE: one row per (user, month) they were active.
-- Grain of joined CTE: one row per (user, cohort_month, active_month) — a user-month in its cohort.
-- Grain of final result: one row per (cohort_month, active_month).
WITH cohorts AS (
    SELECT user_id, MIN(DATE_TRUNC('month', event_date)) AS cohort_month
    FROM activity
    GROUP BY user_id
),
monthly AS (
    SELECT DISTINCT user_id, DATE_TRUNC('month', event_date) AS active_month
    FROM activity
),
joined AS (
    SELECT c.cohort_month, m.active_month, m.user_id
    FROM cohorts c
    JOIN monthly m ON m.user_id = c.user_id
),
cohort_sizes AS (
    SELECT cohort_month, COUNT(DISTINCT user_id) AS cohort_size
    FROM cohorts
    GROUP BY cohort_month
)
SELECT j.cohort_month, j.active_month, cs.cohort_size,
       COUNT(DISTINCT j.user_id) AS retained_users,
       ROUND(COUNT(DISTINCT j.user_id) * 100.0 / cs.cohort_size, 2) AS retention_pct
FROM joined j
JOIN cohort_sizes cs USING (cohort_month)
GROUP BY j.cohort_month, j.active_month, cs.cohort_size
ORDER BY j.cohort_month, j.active_month;

-- MySQL: DATE_FORMAT(event_date, '%Y-%m-01') in place of DATE_TRUNC.
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Multiple activities per user per month:** `COUNT(DISTINCT user_id)` everywhere — never `COUNT(*)`, or a user counts multiple times.
- **Month 0 (the cohort month):** retention in the cohort month itself is always 100% (everyone in the cohort was active) — include it as a sanity check row.
- **Gap months:** a user active in Jan and Mar appears only for those months — retention is not "continuous"; there's simply no row for Feb (or an explicit 0 if you prefer a dense month grid, which needs a calendar/generate_series join).
- **Cohort size drift:** always denominator = users first active in the cohort month, regardless of their later activity.
- **Users with no activity:** not in the table, so not in any cohort.
- **Ties:** none structurally; ordering by (cohort_month, active_month) makes output deterministic.

</details>

---

### Q11. Nth Highest Salary ⭐

> **Prompt:** Write a query for "Nth Highest Salary". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Microsoft | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE employee (
    id     INT PRIMARY KEY,
    salary INT
);
```

**Question to answer:** Return the Nth highest **distinct** salary (N is a parameter). Return `NULL` if it doesn't exist.

<details>
<summary><b>Hint</b></summary>

Generalize Q1. `DENSE_RANK() OVER (ORDER BY salary DESC)` on distinct salaries, keep rank = N, and use an aggregate wrapper (`MAX`) so an empty result becomes `NULL`. Watch the tie semantics: "Nth highest salary" in interviews means Nth highest _distinct_ value; if ties should count as separate positions, switch to `ROW_NUMBER`. Putting the `WHERE rnk = N` filter in a subquery is required — you can't reference the window alias in `WHERE` at the same level.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of distinct CTE: one row per distinct salary value.
-- Grain of ranked CTE: one row per distinct salary with a rank.
-- Grain of final result: a single scalar (NULL if no Nth exists).
WITH distinct_salaries AS (
    SELECT DISTINCT salary FROM employee WHERE salary IS NOT NULL
),
ranked AS (
    SELECT salary,
           DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM distinct_salaries
)
SELECT MAX(salary) AS nth_highest_salary
FROM ranked
WHERE rnk = &N;   -- parameter; e.g., N = 2, 3, ...
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **N larger than the number of distinct salaries:** `MAX` over an empty set → `NULL`. Without the aggregate wrapper, the bare query returns no rows.
- **Ties at the top:** salaries 100, 100, 90 with N=2 → answer is 90. `ROW_NUMBER` would answer 100 (wrong for the distinct interpretation).
- **Duplicates:** handled by `DISTINCT` upstream.
- **NULLs:** excluded, so they can't rank.
- **Grain:** every intermediate is one row per distinct salary — no fan-out, no duplicate counting.

</details>

---

### Q12. Rank Scores ⭐

> **Prompt:** Write a query for "Rank Scores". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE scores (
    id    INT PRIMARY KEY,
    score DECIMAL(5,2)   -- tournament scores; ties are common
);
```

**Question to answer:** Rank the scores — ties share the same rank, and the next rank is the _next distinct score position_ (i.e., no gaps after ties: 100, 100, 90 → 1, 1, 2). This is exactly `DENSE_RANK`.

<details>
<summary><b>Hint</b></summary>

The requirement — ties share a rank, no gaps — is the textbook definition of **`DENSE_RANK()`**. `RANK()` would give 1,1,3 and `ROW_NUMBER()` gives 1,2,3; know all three and why each is chosen. `ORDER BY score DESC` for highest-first. The window function doesn't change grain: one output row per input row.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain: one row per score, with a rank column appended.
SELECT id, score,
       DENSE_RANK() OVER (ORDER BY score DESC) AS rank
FROM scores
ORDER BY rank, id;

-- Comparison of the three ranking functions:
SELECT id, score,
       ROW_NUMBER() OVER (ORDER BY score DESC) AS row_num,
       RANK()         OVER (ORDER BY score DESC) AS rnk,
       DENSE_RANK()   OVER (ORDER BY score DESC) AS dense_rnk
FROM scores
ORDER BY score DESC, id;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Ties:** identical scores must share a rank — `DENSE_RANK` is the only one of the three that does this _without_ gaps.
- **Score = NULL:** by default NULLs sort last in DESC order in PostgreSQL; whether a NULL score should be ranked is a business question — filter or `COALESCE` explicitly.
- **Duplicate rows (same id twice):** each row is ranked independently; dedupe first if the table shouldn't have duplicates.
- **Empty table:** returns no rows, trivially correct.
- **Deterministic ordering:** add a secondary `ORDER BY` (e.g., `id`) so output order is stable even when scores tie.

</details>

---

### Q13. Duplicate Emails ⭐

> **Prompt:** Write a query for "Duplicate Emails". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Microsoft | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** GROUP BY | **Difficulty:** easy

**Schema**

```sql
CREATE TABLE person (
    id    INT PRIMARY KEY,
    email VARCHAR(100)
);
```

**Question to answer:** List the emails that appear more than once.

<details>
<summary><b>Hint</b></summary>

Group by `email`, count per group, and keep groups with `COUNT(*) > 1`. That's the textbook `HAVING` filter — `HAVING` filters groups (post-aggregation), while `WHERE` filters rows (pre-aggregation). One row per distinct duplicate email.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of grouped intermediate: one row per distinct email, with a per-email row count.
-- Grain of final result: one row per email appearing more than once.
SELECT email
FROM person
GROUP BY email
HAVING COUNT(*) > 1;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Exactly two copies:** `COUNT(*) > 1` includes them (requirement is "more than once").
- **NULL email:** groups as its own bucket in standard SQL; if `NULL` shouldn't count as a duplicate email, add `WHERE email IS NOT NULL`.
- **Case sensitivity:** 'A@x.com' vs 'a@x.com' are different strings in most engines — apply `LOWER(email)` if case-insensitive dedup is intended.
- **Ties:** not meaningful here — output is one row per duplicate email.
- **Grain:** after `GROUP BY email` the grain is per distinct email; there's no fan-out anywhere.

</details>
## Part 2 - Q14–Q26: Joins, Dates & Conditional Logic

### Q14. Rising Temperature

> **Prompt:** Write a query for "Rising Temperature". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Self join / LAG | **Difficulty:** easy

**Schema**

```sql
CREATE TABLE weather (
    id         INT PRIMARY KEY,
    record_date DATE,
    temperature INT
);
```

**Question to answer:** Find all dates where the temperature was **higher than the previous day's** temperature (a single station, one record per day).

<details>
<summary><b>Hint</b></summary>

Two approaches:

1. **Self join on the previous day:** join `weather` to itself on `w2.record_date = w1.record_date - 1` (or `DATEADD`), then compare `w1.temperature > w2.temperature`. Grain note: the join is on a unique `record_date`, so it stays one row per day — no fan-out.
2. **`LAG()` window function:** `LAG(temperature) OVER (ORDER BY record_date)` gives the previous day's value; filter where today > yesterday. This avoids the join entirely and is the cleaner modern answer.

Watch out: if multiple stations or multiple records per day exist, the single `record_date` key breaks — you'd need `(station_id, record_date)`.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Approach 1: self join (grain stays one row per day because record_date is unique)
SELECT w1.id
FROM weather w1
JOIN weather w2 ON w2.record_date = w1.record_date - 1   -- PostgreSQL
-- MySQL: DATE_SUB(w1.record_date, INTERVAL 1 DAY)
WHERE w1.temperature > w2.temperature;

-- Approach 2: LAG (grain: one row per day with previous temperature attached)
WITH prev AS (
    SELECT id, record_date, temperature,
           LAG(temperature) OVER (ORDER BY record_date) AS prev_temp
    FROM weather
)
SELECT id
FROM prev
WHERE temperature > prev_temp;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **First row in the table:** `LAG` returns `NULL`; `NULL > x` is never true, so it's automatically excluded. In the self join there is no previous day, so no row joins.
- **Missing dates (gaps):** the self join only pairs _consecutive calendar days that both exist_ — a gap means no comparison across the gap, which is the standard interpretation of "previous day".
- **Equal temperatures:** `>` excludes equal — "higher than" is strictly greater.
- **Duplicates / multiple records per day:** both approaches assume one row per day; partition by station if data has more columns.
- **NULL temperature:** comparisons yield NULL → filtered out.
- **Ties on date:** impossible under the stated schema (unique date); a tiebreaker key is needed otherwise.

</details>

---

### Q15. Exchange Seats

> **Prompt:** Write a query for "Exchange Seats". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Microsoft | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** CASE / self join | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE seat (
    id     INT PRIMARY KEY,
    student VARCHAR(50)
);
```

**Question to answer:** Swap the student sitting in each seat with the student in the adjacent seat — `1↔2, 3↔4, ...`. If the total number of seats is odd, the last student stays in their seat.

<details>
<summary><b>Hint</b></summary>

Map each seat id to a target id with a formula, then join the seat table to itself on that mapping:

- Even id → target = id − 1
- Odd id → target = id + 1, **except** the last odd id when the count is odd (target = id, no swap)

Implement the mapping with a `CASE` inside the join condition, or compute a `new_id` column and self-join on it. A window-less, formula-based solution is what interviewers expect; it's O(1) per row and keeps the grain at one row per seat.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain: one row per seat, joined to exactly one partner seat (mapping is a bijection).
SELECT s1.id, COALESCE(s2.student, s1.student) AS student
FROM seat s1
LEFT JOIN seat s2
       ON s2.id = CASE
            WHEN s1.id % 2 = 1 AND s1.id = (SELECT MAX(id) FROM seat) THEN s1.id  -- odd & last: no swap
            WHEN s1.id % 2 = 1 THEN s1.id + 1
            ELSE s1.id - 1
          END
ORDER BY s1.id;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Odd total count:** the last (odd) id maps to itself — `COALESCE` keeps its own student via the self-join on itself.
- **Even total count:** every id maps to a real partner; `COALESCE` never fires.
- **Non-contiguous ids (e.g., 1,2,4):** the mapping assumes a contiguous sequence 1..n. If ids have gaps, first renumber with `ROW_NUMBER() OVER (ORDER BY id)`.
- **Duplicate students or seats:** ids are unique (PK), so no ambiguity.
- **Ties:** no ordering ties possible (unique id); `ORDER BY s1.id` gives the required seat order.
- **Grain:** the join is 1:1 (mapping is invertible), so no fan-out — a key thing to state when explaining.

</details>

---

### Q16. Tree Node Type

> **Prompt:** Write a query for "Tree Node Type". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** CASE / self join | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE tree (
    id     INT PRIMARY KEY,
    p_id   INT   -- parent id; NULL for the root
);
```

**Question to answer:** Label each node as `Root`, `Inner`, or `Leaf`:

- **Root:** `p_id IS NULL`
- **Leaf:** not a root, and no other row has this node as its parent
- **Inner:** not a root, and at least one other row has this node as its parent

<details>
<summary><b>Hint</b></summary>

You need two facts per node: its own `p_id`, and whether it _appears_ as a `p_id` anywhere else. The second fact is either a `LEFT JOIN` to a distinct list of parent ids or a `NOT EXISTS`/`EXISTS` pair. Prefer the `LEFT JOIN` against `SELECT DISTINCT p_id FROM tree` — it's set-based and reads clearly. Watch the join: a node that never appears as a parent must produce `NULL` on the right side.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of distinct-parents CTE: one row per distinct parent id.
-- Grain of final result: one row per node (the LEFT JOIN adds only a flag, no fan-out).
WITH parents AS (
    SELECT DISTINCT p_id AS id
    FROM tree
    WHERE p_id IS NOT NULL
)
SELECT t.id,
       CASE
           WHEN t.p_id IS NULL                       THEN 'Root'
           WHEN p.id IS NOT NULL                     THEN 'Inner'
           ELSE                                           'Leaf'
       END AS type
FROM tree t
LEFT JOIN parents p ON p.id = t.id
ORDER BY t.id;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Root with children:** root is still 'Root' — the CASE evaluates `p_id IS NULL` first, so it can't be mislabeled Inner.
- **Dangling parent (`p_id` pointing to a non-existent id):** the node is labeled Leaf by the join logic (nobody references it _and_ its parent doesn't exist). Flag for data-quality review in real life.
- **Cycle (A→B→A):** this labeler doesn't detect cycles; both would be Inner. Add cycle detection separately if the data can contain it.
- **Duplicate ids:** impossible — `id` is PK; the distinct-parents CTE removes duplicate parent references.
- **Self-parent (`p_id = id`):** a node referencing itself shows as Inner and would need a `t.id <> p.id` guard on dirty data.
- **Grain:** one row per node throughout; the `DISTINCT` parent list is what prevents the join from fanning out when a node has many children.

</details>

---

### Q17. Trips and Users Cancellation Rate

> **Prompt:** Write a query for "Trips and Users Cancellation Rate". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Meta | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Conditional aggregate | **Difficulty:** hard

**Schema**

```sql
CREATE TABLE trips (
    id            INT PRIMARY KEY,
    client_id     INT,      -- user who booked the trip
    driver_id     INT,
    city_id       INT,
    status        VARCHAR(20),   -- 'completed' | 'cancelled_by_driver' | 'cancelled_by_client'
    request_at    DATE
);

CREATE TABLE users (
    users_id INT PRIMARY KEY,
    banned   VARCHAR(10),   -- 'Yes' | 'No'
    role     VARCHAR(20)    -- 'client' | 'driver'
);
```

**Question to answer:** For each day in a requested range, compute the **cancellation rate** — cancelled trips ÷ total trips — but only among trips where **neither the client nor the driver is banned**.

<details>
<summary><b>Hint</b></summary>

1. Filter to unbanned clients and drivers first — two anti-joins or two `NOT EXISTS` (or a single join to `users` twice, once as client, once as driver).
2. Aggregate per day: `COUNT(*)` for total, `COUNT(*) FILTER (WHERE status <> 'completed')` (PostgreSQL) or `SUM(CASE WHEN ...) ` for cancelled.
3. The rate is a **conditional aggregate**, not a row filter — you must count both the numerator and denominator over the _same_ filtered row set.

Use `SUM(status <> 'completed')` carefully — booleans convert differently across dialects; the explicit `CASE WHEN` is portable.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of filtered CTE: one row per trip whose client AND driver are unbanned.
-- Grain of final result: one row per day in the range.
WITH valid_trips AS (
    SELECT t.id, t.status, t.request_at
    FROM trips t
    JOIN users c ON c.users_id = t.client_id AND c.banned = 'No'
    JOIN users d ON d.users_id = t.driver_id AND d.banned = 'No'
    WHERE t.request_at BETWEEN '2013-10-01' AND '2013-10-03'
)
SELECT request_at AS day,
       ROUND(
           SUM(CASE WHEN status <> 'completed' THEN 1 ELSE 0 END) * 1.0
           / COUNT(*),
           2
       ) AS cancellation_rate
FROM valid_trips
GROUP BY request_at
ORDER BY request_at;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Banned client or driver:** the row must be excluded from both numerator and denominator — that's why the filter happens before aggregation.
- **Day with zero trips:** `COUNT(*) = 0` → division by zero → NULL/error depending on dialect. Guard with `NULLIF(COUNT(*), 0)` if such days must appear (they'd need a calendar join).
- **Cancelled_by_client vs cancelled_by_driver:** the problem usually counts _all_ non-completed statuses as cancelled; if only client-cancelled counts, change the `CASE` condition.
- **Duplicate trip ids:** trips.id is PK — if not, dedupe first or rates inflate.
- **Rates with rounding:** `ROUND(x, 2)` per the LeetCode convention; state the precision you're returning.
- **Grain:** one row per trip through the joins (both joins are on the unique `users_id`), then one row per day after `GROUP BY`.

</details>

---

### Q18. User Activity by Day

> **Prompt:** Write a query for "User Activity by Day". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** GROUP BY | **Difficulty:** easy

**Schema**

```sql
CREATE TABLE activity (
    user_id   INT,
    event_date DATE,
    event_type VARCHAR(50)
);
```

**Question to answer:** For each date, report the number of **distinct active users** (a user is "active" on a day if they had at least one event).

<details>
<summary><b>Hint</b></summary>

Group by `event_date` and count **distinct** users: `COUNT(DISTINCT user_id)`. The `DISTINCT` is the whole point — a user with five events on one day must count once. The grouped output is one row per day.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of grouped intermediate: one row per (date) with a distinct-user count.
-- Grain of final result: one row per date that has any activity.
SELECT event_date, COUNT(DISTINCT user_id) AS active_users
FROM activity
GROUP BY event_date
ORDER BY event_date;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Multiple events per user per day:** `COUNT(DISTINCT user_id)` — using `COUNT(*)` would overcount.
- **Days with no activity:** absent from the result (no rows exist); join a calendar if you need zero-filled days.
- **NULL user_id or event_date:** NULL `user_id` is excluded by `COUNT(DISTINCT)` (NULLs aren't counted); NULL dates create a "NULL" group — filter if needed.
- **Different event types:** ignored unless you partition by event_type; the question asks for all activity.
- **Ties:** none structurally; ordering by date makes it deterministic.

</details>

---

### Q19. Market Share by Category

> **Prompt:** Write a query for "Market Share by Category". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Meta | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE products (
    product_id   INT PRIMARY KEY,
    product_name VARCHAR(100),
    category     VARCHAR(50)
);

CREATE TABLE sales (
    product_id INT NOT NULL REFERENCES products(product_id),
    amount     NUMERIC(10,2),
    sale_date  DATE
);
```

**Question to answer:** For each category, show each product's revenue **share of its category's total revenue** (as a percentage).

<details>
<summary><b>Hint</b></summary>

Two-step window pattern:

1. Aggregate sales to revenue per product (`GROUP BY product_id`).
2. Window `SUM(revenue) OVER (PARTITION BY category)` gives the category total on **every row** — then share = revenue / category_total.

The key insight: the window `SUM` with `PARTITION BY` (no `ORDER BY` frame) repeats the category total alongside each product row. Grain after step 1: one row per product; step 2 doesn't change grain.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of revenue CTE: one row per product (its total revenue).
-- Grain of final result: one row per product, with category share attached.
WITH revenue AS (
    SELECT s.product_id,
           p.category,
           SUM(s.amount) AS product_revenue
    FROM sales s
    JOIN products p ON p.product_id = s.product_id
    GROUP BY s.product_id, p.category
)
SELECT product_id, category, product_revenue,
       ROUND(product_revenue * 100.0
             / SUM(product_revenue) OVER (PARTITION BY category), 2) AS share_pct
FROM revenue
ORDER BY category, share_pct DESC;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Products with no sales:** absent after the inner `JOIN`; use `LEFT JOIN` + `COALESCE` if they must appear with 0 revenue (share 0%).
- **Category with one product:** share is 100% — correct.
- **Category total of 0** (e.g., refunds net to zero): division by zero → NULL; guard with `NULLIF` if needed.
- **Duplicate sales rows:** `SUM(amount)` counts them — dedupe first if the sales table can repeat.
- **Ties in share:** ordering by `share_pct DESC` is stable enough; add `product_id` as a final tiebreaker for determinism.
- **Grain:** revenue CTE is per product; the window `SUM` is a scalar broadcast per category, so grain never changes.

</details>

---

### Q20. Cohort Conversion

> **Prompt:** Write a query for "Cohort Conversion". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Google · Meta | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** CTE + aggregate | **Difficulty:** hard

**Schema**

```sql
CREATE TABLE users (
    user_id    INT PRIMARY KEY,
    signup_date DATE
);

CREATE TABLE orders (
    order_id  INT PRIMARY KEY,
    user_id   INT NOT NULL REFERENCES users(user_id),
    order_date DATE
);
```

**Question to answer:** Compute **cohort conversion** — for each signup cohort (week or month), the share of users who placed **at least one order** within a fixed window (e.g., 30 days of signing up). "Converted" is a **user-level** boolean, so duplicates don't multiply counts.

<details>
<summary><b>Hint</b></summary>

1. **Cohort key per user:** bucket `signup_date` (e.g., week-start or month) — `DATE_TRUNC('week', signup_date)`.
2. **Converted flag per user:** a user converts if any order exists with `order_date BETWEEN signup_date AND signup_date + 30 days` — use `EXISTS`, not a join, to keep one row per user.
3. Aggregate: `COUNT(DISTINCT user_id)` of converters ÷ `COUNT(DISTINCT user_id)` of the cohort.

The `EXISTS` subquery is the important pattern — a join to orders would fan out and you'd need extra dedup.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of cohort CTE: one row per user (cohort bucket + converted flag).
-- Grain of final result: one row per cohort.
WITH cohort_users AS (
    SELECT u.user_id,
           DATE_TRUNC('week', u.signup_date) AS cohort_week,
           EXISTS (
               SELECT 1
               FROM orders o
               WHERE o.user_id = u.user_id
                 AND o.order_date BETWEEN u.signup_date
                                      AND u.signup_date + INTERVAL '30 days'
           ) AS converted
    FROM users u
)
SELECT cohort_week,
       COUNT(*) FILTER (WHERE converted) AS converted_users,
       COUNT(*)                          AS cohort_size,
       ROUND(COUNT(*) FILTER (WHERE converted) * 100.0 / COUNT(*), 2) AS conversion_pct
FROM cohort_users
GROUP BY cohort_week
ORDER BY cohort_week;

-- MySQL: DATE_ADD(u.signup_date, INTERVAL 30 DAY); SUM(converted) instead of COUNT(*) FILTER.
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Multiple orders per user:** `EXISTS` short-circuits at the first matching order — one flag per user, so no overcounting.
- **Orders exactly on day 30:** `BETWEEN` is inclusive — decide and state the boundary semantics.
- **Signup and order on the same day:** included (day 0 ≤ 30).
- **Users with no orders:** `converted = false` — counted in the denominator only.
- **NULL signup_date:** excluded from the cohort — filter explicitly if data can be dirty.
- **Cohort with zero users:** impossible here (cohorts derive from existing users).
- **Grain discipline:** the cohort CTE must stay one row per user; any join to orders would need `DISTINCT` to preserve that grain.

</details>

---

### Q21. WHERE vs HAVING

> **Prompt:** Write a query for "What is the difference between WHERE and HAVING?". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** All | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** SQL clauses | **Difficulty:** easy

**Question to answer:** Explain the difference, and demonstrate with a query where each is the right tool.

<details>
<summary><b>Hint</b></summary>

`WHERE` filters **rows before** grouping/aggregation; `HAVING` filters **groups after** aggregation. They operate at different points in the logical execution order: `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY`. You can't reference aggregate results in `WHERE` (`WHERE COUNT(*) > 5` is illegal) — that's exactly what `HAVING` is for. `WHERE` can't use aliases defined in `SELECT`; `HAVING` can reference aggregate expressions. Both apply to the same join grain; the difference is _when_ the filter runs.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- WHERE filters individual sales rows (e.g., only large-ticket sales),
-- then GROUP BY + HAVING filter the resulting groups.
-- Grain of post-WHERE intermediate: one row per sale with amount >= 100.
-- Grain of post-GROUP BY intermediate: one row per department (sum of filtered sales).
-- Grain of final result: one row per department whose filtered total exceeds 1000.
SELECT department_id, SUM(amount) AS total
FROM sales
WHERE amount >= 100                 -- row-level filter, runs before grouping
GROUP BY department_id
HAVING SUM(amount) > 1000;          -- group-level filter, runs after aggregation
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Rows filtered by `WHERE` are gone before `HAVING`:** `HAVING SUM(amount) > 1000` above sums only rows with `amount >= 100`. If you instead put `amount >= 100` in a `HAVING` you'd get an error (`amount` is not an aggregate and not in the group key).
- **Both can appear together:** `WHERE` first narrows rows (cheap, index-friendly), then `HAVING` refines groups.
- **Performance:** push filters into `WHERE` whenever possible — filtering before aggregation reduces the data that must be grouped.
- **No `GROUP BY`:** `HAVING` still works (the whole table is one group); `WHERE` works on rows as usual.
- **NULLs in the filtered column:** `WHERE amount >= 100` drops NULLs (NULL comparison → not true); `HAVING` aggregates already ignore NULLs in `SUM`.

</details>

---

### Q22. INNER JOIN vs LEFT JOIN

> **Prompt:** Write a query for "INNER JOIN vs LEFT JOIN". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** All | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Joins | **Difficulty:** easy

**Question to answer:** Explain the difference with a query, including what happens to unmatched rows and how grain can change.

<details>
<summary><b>Hint</b></summary>

`INNER JOIN` keeps only matching rows; `LEFT JOIN` keeps **all** left-table rows, filling the right side with `NULL`s where there's no match. The conceptual model is a nested loop: for each left row, find matching right rows — 0 matches → dropped (INNER) or NULL-padded (LEFT); N matches → row multiplied (fan-out). The fan-out is the grain trap: one order with 3 line items turns 1 row into 3 rows.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of customers: one row per customer.
-- Grain of INNER JOIN result: one row per (customer, order) — customers with no orders disappear.
-- Grain of LEFT JOIN result: one row per customer; order columns are NULL when no order exists.
-- (If one customer had 3 orders, both joins yield 3 rows for that customer.)
SELECT c.name, o.id AS order_id, o.amount
FROM customers c
INNER JOIN orders o ON o.customer_id = c.id;   -- only customers with >= 1 order

SELECT c.name, o.id AS order_id, o.amount
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id;    -- all customers; NULL order columns if none
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Unmatched left row:** INNER hides it; LEFT shows it with NULLs on the right — that NULL column is how you detect "no match" (e.g., `WHERE o.id IS NULL` = anti-join).
- **Fan-out:** a left row matching N right rows appears N times in both joins. Filtering on right columns in `WHERE` after a `LEFT JOIN` (e.g., `WHERE o.amount > 10`) effectively converts it back to an INNER join — a classic bug.
- **NULL join keys:** `NULL = NULL` is never true, so NULL-keyed rows never match — they're kept by LEFT, dropped by INNER.
- **Duplicate right keys:** multiply rows; dedupe or aggregate (`GROUP BY`) to restore grain.
- **Performance:** INNER can use either side as the driving table and often beats LEFT, which must preserve every left row.

</details>

---

### Q23. Find the Second-Highest Salary

> **Prompt:** Write a query for "Find the second-highest salary". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Microsoft | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window / subquery | **Difficulty:** easy

> **Note:** Same problem as Q1. This is a repeat for spaced-repetition practice — attempt it without peeking, then compare your grain reasoning and edge-case handling.

**Schema**

```sql
CREATE TABLE employee (
    id     INT PRIMARY KEY,
    salary INT
);
```

**Question to answer:** Return the second-highest distinct salary, or `NULL` if it doesn't exist.

<details>
<summary><b>Hint</b></summary>

Refresh: distinct salaries sorted descending, skip the first, take the next. Wrap in an aggregate so a missing second-highest yields `NULL`, not an empty result. For ties, `DENSE_RANK` is your friend.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of distinct CTE: one row per distinct salary.
-- Grain of final result: one scalar row.
WITH distinct_salaries AS (
    SELECT DISTINCT salary FROM employee WHERE salary IS NOT NULL
)
SELECT MAX(salary) AS second_highest_salary
FROM distinct_salaries
WHERE salary < (SELECT MAX(salary) FROM distinct_salaries);
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- Same as Q1: no second-highest → `NULL`; ties (100,100,90) → 90; NULLs ignored; duplicates collapsed via `DISTINCT`.

</details>

---

### Q24. ROW_NUMBER vs RANK vs DENSE_RANK ⭐

> **Prompt:** Write a query for "ROW_NUMBER vs RANK vs DENSE_RANK". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Google · Amazon | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window functions | **Difficulty:** medium

**Question to answer:** Explain and demonstrate the three ranking functions — especially how each handles **ties** — and state when each is the right choice.

<details>
<summary><b>Hint</b></summary>

With scores `100, 100, 90`:

- `ROW_NUMBER()` → **1, 2, 3** — every row gets a unique number; ties broken arbitrarily (or by the `ORDER BY` tiebreaker). Use when you need _exactly N rows_ regardless of ties.
- `RANK()` → **1, 1, 3** — ties share the rank, then it _skips_ to reflect how many rows precede (competition ranking).
- `DENSE_RANK()` → **1, 1, 2** — ties share the rank, **no gaps** (dense competition ranking). Use for "top N **distinct** values" (Q2, Q11).

Grain note: all three return one output row per input row — only the assigned numbers differ.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain: one row per input row, with three ranking columns.
SELECT id, score,
       ROW_NUMBER() OVER (ORDER BY score DESC)              AS row_num,
       RANK()         OVER (ORDER BY score DESC)            AS rnk,
       DENSE_RANK()   OVER (ORDER BY score DESC)            AS dense_rnk
FROM scores
ORDER BY score DESC, id;

-- Expected output for scores (1,100),(2,100),(3,90):
-- id  score  row_num  rnk  dense_rnk
-- 1   100    1        1    1
-- 2   100    2        1    1
-- 3   90     3        3    2
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Choosing one:** "exactly top 3 rows" → `ROW_NUMBER` (but arbitrary on ties — add a tiebreaker); "top 3 values with ties" → `DENSE_RANK`; "competition ranking" (golf/leaderboards) → `RANK`.
- **`PARTITION BY` interplay:** ranks restart at 1 in every partition — per-department top 3 is `PARTITION BY department_id`.
- **NULL ordering:** default `ASC` puts NULLs first in PostgreSQL, last in MySQL — pin the `NULLS LAST` clause if it matters.
- **Tiebreaker:** without a unique secondary key, tied rows' numbers are nondeterministic — always add `ORDER BY ..., id` for stable output.

</details>

---

### Q25. Find Duplicate Records

> **Prompt:** Write a query for "Find duplicate records". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Microsoft | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** GROUP BY | **Difficulty:** easy

> **Note:** A variant of Q13 generalized to multiple columns — good spaced-repetition practice.

**Schema**

```sql
CREATE TABLE users (
    id    INT,
    email VARCHAR(100),
    phone VARCHAR(20)
);
```

**Question to answer:** Find `(email, phone)` combinations that appear in more than one row (i.e., true duplicate records, ignoring `id`).

<details>
<summary><b>Hint</b></summary>

Group by the business key (`email, phone`) and keep groups with `COUNT(*) > 1`. If you want the _actual duplicate rows_ (not just the keys), join back to the table. When the whole row must be identical, group by every column.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of grouped CTE: one row per distinct (email, phone) with a row count.
-- Grain of final result (keys only): one row per duplicated (email, phone).
SELECT email, phone, COUNT(*) AS cnt
FROM users
GROUP BY email, phone
HAVING COUNT(*) > 1;

-- Full duplicate rows: join the keys back (grain: one row per duplicate source row).
SELECT u.*
FROM users u
JOIN (
    SELECT email, phone
    FROM users
    GROUP BY email, phone
    HAVING COUNT(*) > 1
) d ON d.email = u.email AND d.phone = u.phone
ORDER BY u.email, u.phone;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **NULL in a key column:** groups together in the `GROUP BY` (NULL = NULL for grouping) — decide whether NULL keys should count as duplicates.
- **Partial duplicates:** same email, different phone → different groups, not flagged — correct for a composite key.
- **Triplicate+:** `COUNT(*) > 1` catches any count ≥ 2.
- **Which columns define "duplicate":** state it explicitly (here, email+phone; sometimes it's the full row).
- **Ties:** none — output is per group.
- **Grain:** the grouped CTE is one row per distinct key; the join-back is one row per duplicate _row_ (fan-out equals the duplicate multiplicity — that's expected here).

</details>

---

### Q26. Top Three Salaries in Each Department

> **Prompt:** Write a query for "Top three salaries in each department". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window | **Difficulty:** medium

> **Note:** Same problem as Q2 — re-attempt from memory before expanding the solution.

**Schema**

```sql
CREATE TABLE employee (
    id            INT PRIMARY KEY,
    name          VARCHAR(100),
    salary        INT,
    department_id INT
);

CREATE TABLE department (
    id   INT PRIMARY KEY,
    name VARCHAR(100)
);
```

**Question to answer:** Top three salaries per department, ties included.

<details>
<summary><b>Hint</b></summary>

`DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC)` then `rnk <= 3`. Revisit Q2's edge cases if you're unsure about ties.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of ranked CTE: one row per employee.
-- Grain of final result: one row per employee in their department's top 3 (ties included).
WITH ranked AS (
    SELECT e.id, e.name, e.salary, e.department_id,
           DENSE_RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS rnk
    FROM employee e
)
SELECT d.name AS department, r.name, r.salary
FROM ranked r
JOIN department d ON d.id = r.department_id
WHERE r.rnk <= 3
ORDER BY d.name, r.salary DESC;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- Identical to Q2: ties → more than 3 rows possible; small departments return what exists; `DENSE_RANK` (not `ROW_NUMBER`) is the tie-correct choice.

</details>
## Part 3 - Q27–Q39: Advanced Patterns & Concept Questions

### Q27. Employees Earning More Than Their Managers

> **Prompt:** Write a query for "Employees earning more than their managers". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Meta | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Self join | **Difficulty:** easy

> **Note:** Same problem as Q3 — attempt from memory, then verify your edge cases.

**Schema**

```sql
CREATE TABLE employee (
    id         INT PRIMARY KEY,
    name       VARCHAR(100),
    salary     INT,
    manager_id INT
);
```

**Question to answer:** Employees whose salary exceeds their direct manager's salary.

<details>
<summary><b>Hint</b></summary>

Self join on `manager_id = id`; the manager side is at most one row (join key is the PK), so grain stays one row per employee.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of join: one row per employee (0..1 manager rows).
-- Grain of final result: one row per qualifying employee.
SELECT e.name AS employee, e.salary AS employee_salary,
       m.name AS manager,   m.salary AS manager_salary
FROM employee e
JOIN employee m ON m.id = e.manager_id
WHERE e.salary > m.salary;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- Same as Q3: CEO (NULL manager) excluded; `>` excludes equal salaries; dangling manager ids drop the employee.

</details>

---

### Q28. Customers Who Never Placed an Order

> **Prompt:** Write a query for "Customers who never placed an order". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Microsoft | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Anti-join | **Difficulty:** easy

> **Note:** Same problem as Q4 — practice the anti-join from memory.

**Schema**

```sql
CREATE TABLE customers (
    id   INT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE orders (
    id          INT PRIMARY KEY,
    customer_id INT
);
```

**Question to answer:** Customers with zero orders.

<details>
<summary><b>Hint</b></summary>

Anti-join: `LEFT JOIN` + `WHERE o.id IS NULL`, or `NOT EXISTS`. The `LEFT JOIN` form fans out per order before the NULL filter collapses it — state that grain.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of LEFT JOIN: one row per (customer, order) — then filtered to customers with zero joined rows.
-- Grain of final result: one row per customer with no orders.
SELECT c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;

SELECT c.name
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- Same as Q4: many orders → fan-out (why NOT EXISTS is often preferred); NULL `customer_id` orders can't falsely match; empty table → no rows.

</details>

---

### Q29. Running Total by Account

> **Prompt:** Write a query for "Running total by account". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Meta · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window | **Difficulty:** medium

> **Note:** Same problem as Q6 — re-attempt, then compare.

**Schema**

```sql
CREATE TABLE transactions (
    id         INT PRIMARY KEY,
    account_id INT,
    amount     NUMERIC(10,2),
    txn_date   DATE
);
```

**Question to answer:** Cumulative sum of amount per account, ordered by date.

<details>
<summary><b>Hint</b></summary>

`SUM(amount) OVER (PARTITION BY account_id ORDER BY txn_date, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` — tiebreaker `id` keeps the order deterministic.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain: one row per transaction, with a cumulative column appended.
SELECT id, account_id, txn_date, amount,
       SUM(amount) OVER (
           PARTITION BY account_id
           ORDER BY txn_date, id
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS running_total
FROM transactions
ORDER BY account_id, txn_date, id;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- Same as Q6: tie dates need a tiebreaker; NULL amounts are skipped by `SUM`; partition resets per account.

</details>

---

### Q30. Seven-Day Rolling Average

> **Prompt:** Write a query for "Seven-day rolling average". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Uber | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE activity (
    user_id    INT,
    event_date DATE,
    value      NUMERIC(10,2)   -- e.g., sessions, spend, etc.
);
```

**Question to answer:** For each (user, date), the **7-day rolling average** of `value` — the average over the current day and the preceding 6 days. (PostgreSQL's `RANGE` frame includes tied dates automatically.)

<details>
<summary><b>Hint</b></summary>

Use a window frame on **rows**: `AVG(value) OVER (PARTITION BY user_id ORDER BY event_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`. Because the frame is row-based, dedupe to one row per (user, date) first — otherwise the 7-row window is really "7 events", not "7 days". If you want a true calendar 7-day window regardless of gaps, use `RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW` (supported in PostgreSQL, SQL Server; emulated via self-join elsewhere). The window keeps the grain at one row per source row.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Row-based 7-day window (requires one row per (user, day)):
WITH daily AS (
    SELECT user_id, event_date, AVG(value) AS day_value
    FROM activity
    GROUP BY user_id, event_date
)
SELECT user_id, event_date, day_value,
       ROUND(AVG(day_value) OVER (
           PARTITION BY user_id
           ORDER BY event_date
           ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
       ), 2) AS rolling_7day_avg
FROM daily
ORDER BY user_id, event_date;

-- True calendar window (handles gaps; PostgreSQL):
SELECT user_id, event_date, value,
       ROUND(AVG(value) OVER (
           PARTITION BY user_id
           ORDER BY event_date
           RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW
       ), 2) AS rolling_7day_avg
FROM activity;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Fewer than 7 days of history:** the frame just includes what exists — the average of 3 rows if only 3 days exist. State this behavior; some interviewers want `NULL` until day 7 (add a `COUNT(*) OVER (...) = 7` guard).
- **Duplicate (user, date) rows:** row-based windows would silently treat them as separate rows — dedupe first.
- **Gaps in dates:** row-based windows average the last 7 _rows_, which may span more than 7 calendar days; the `RANGE` form handles calendar gaps correctly.
- **NULL values:** `AVG` ignores them; the window count shrinks accordingly.
- **Ties on event_date:** dedupe removes them; otherwise tie order is nondeterministic without a tiebreaker.
- **Grain:** one output row per (user, date) in both variants.

</details>

---

### Q31. Gaps and Islands

> **Prompt:** Write a query for "Gaps and islands". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Google · Meta | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window | **Difficulty:** hard

> **Note:** Same problem as Q9 — attempt from memory first; focus on stating the grain at each CTE.

**Schema**

```sql
CREATE TABLE visits (
    user_id    INT,
    visit_date DATE,
    PRIMARY KEY (user_id, visit_date)
);
```

**Question to answer:** Per user, each contiguous run of consecutive dates → start, end, length.

<details>
<summary><b>Hint</b></summary>

`visit_date - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY visit_date)` is the island key; group and take MIN/MAX/COUNT.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of numbered CTE: one row per (user, day).
-- Grain of final result: one row per (user, contiguous island).
WITH numbered AS (
    SELECT user_id, visit_date,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY visit_date) AS rn
    FROM visits
)
SELECT user_id,
       MIN(visit_date) AS island_start,
       MAX(visit_date) AS island_end,
       COUNT(*)        AS island_length
FROM numbered
GROUP BY user_id, visit_date - rn
ORDER BY user_id, island_start;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- Same as Q9: dedupe before numbering if duplicates possible; single-day islands are valid (length 1); no visits → no rows.

</details>

---

### Q32. Monthly Retention Rate

> **Prompt:** Write a query for "Monthly retention rate". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Meta · Amazon | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** CTE + dates | **Difficulty:** hard

> **Note:** Same problem as Q10 — re-attempt before expanding.

**Schema**

```sql
CREATE TABLE activity (
    user_id   INT,
    event_date DATE
);
```

**Question to answer:** For each cohort month, the share of users still active in each later month.

<details>
<summary><b>Hint</b></summary>

Cohort month = `MIN(DATE_TRUNC('month', event_date))` per user; active months = distinct months; join, then `COUNT(DISTINCT user_id)` per (cohort, month) ÷ cohort size.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of cohorts: one row per user (first month).
-- Grain of monthly: one row per (user, active month).
-- Grain of final result: one row per (cohort_month, active_month).
WITH cohorts AS (
    SELECT user_id, MIN(DATE_TRUNC('month', event_date)) AS cohort_month
    FROM activity
    GROUP BY user_id
),
monthly AS (
    SELECT DISTINCT user_id, DATE_TRUNC('month', event_date) AS active_month
    FROM activity
),
cs AS (
    SELECT cohort_month, COUNT(DISTINCT user_id) AS size
    FROM cohorts GROUP BY cohort_month
)
SELECT c.cohort_month, m.active_month, cs.size,
       COUNT(DISTINCT m.user_id) AS retained,
       ROUND(COUNT(DISTINCT m.user_id) * 100.0 / cs.size, 2) AS retention_pct
FROM cohorts c
JOIN monthly m ON m.user_id = c.user_id
JOIN cs ON cs.cohort_month = c.cohort_month
GROUP BY c.cohort_month, m.active_month, cs.size
ORDER BY c.cohort_month, m.active_month;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- Same as Q10: `COUNT(DISTINCT user_id)` is mandatory; cohort month always shows ~100% (sanity check); gap months are absent rather than 0 unless you build a dense month grid.

</details>

---

### Q33. UNION vs UNION ALL

> **Prompt:** Write a query for "UNION vs UNION ALL". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** All | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Set operations | **Difficulty:** easy

**Question to answer:** Explain the difference and demonstrate with a query, including grain and NULL behavior.

<details>
<summary><b>Hint</b></summary>

- `UNION` concatenates two result sets **and removes duplicate rows** (set semantics — the result is a set).
- `UNION ALL` concatenates **without dedup** (bag semantics — preserves every row, including exact duplicates).

So the grain differs: `UNION` can only ever produce each distinct row once; `UNION ALL` produces the literal sum of rows from both sides. `UNION` also implies a sort/dedup step — `UNION ALL` is faster. NULLs: two rows that are both-NULL in every column are considered duplicates by `UNION` and collapsed; `NULL = NULL` is true for set-dedup purposes.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Both inputs: one row per customer / one row per lead (say, 5 and 3 rows).
-- UNION: up to 8 rows, duplicates collapsed — grain = distinct rows across both.
-- UNION ALL: exactly 8 rows, duplicates preserved — grain = every row from both.
SELECT id, email FROM customers
UNION
SELECT id, email FROM leads;

SELECT id, email FROM customers
UNION ALL
SELECT id, email FROM leads;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Column count/type compatibility:** both sides must have the same number of columns with compatible types; column _names_ come from the first query (alias there).
- **Duplicates within one side:** `UNION` dedupes _within_ each side too (the two sets are merged, then deduped); `UNION ALL` keeps them.
- **NULLs:** a row of all-NULLs is treated as a normal row — `UNION` collapses identical all-NULL rows; `UNION ALL` keeps each.
- **Ordering:** apply `ORDER BY` at the very end (after the last set); per-side ordering is lost unless wrapped in subqueries.
- **Performance:** use `UNION ALL` when you know the sides can't overlap (e.g., partitioned date ranges) — the optimizer skips the dedup pass.
- **Ties:** irrelevant — set semantics, not ordering semantics.

</details>

---

### Q34. How Do NULLs Behave in SQL?

> **Prompt:** Write a query for "How do NULLs behave in SQL?". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** All | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** NULL semantics | **Difficulty:** medium

**Question to answer:** Explain NULL semantics — comparisons, arithmetic, aggregation, grouping, and joins — and demonstrate each with queries.

<details>
<summary><b>Hint</b></summary>

NULL is "unknown", not a value. Cover six behaviors with tiny queries:

1. **Comparison:** `NULL = NULL` is `NULL` (unknown) → not true; use `IS NULL` / `IS NOT NULL`.
2. **Arithmetic:** `NULL + 5` is `NULL`; any expression touching NULL is NULL.
3. **Boolean logic:** `TRUE AND NULL` = `NULL`, `FALSE AND NULL` = `FALSE`; `NULL` in `WHERE`/`CASE WHEN` is treated as not-true.
4. **Aggregation:** `SUM`/`AVG`/`MIN`/`MAX` skip NULLs; `COUNT(*)` counts rows, `COUNT(col)` counts non-NULL col values.
5. **Grouping & set ops:** `GROUP BY` and `DISTINCT` treat all NULLs as one group; `UNION` collapses them.
6. **Joins & ordering:** `NULL = NULL` never matches in joins; default sort order of NULLs varies by dialect (first in PostgreSQL ASC, last in MySQL/SQL Server ASC).

</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- 1. Comparison: result is never TRUE — use IS [NOT] NULL
SELECT * FROM employee WHERE salary = NULL;      -- returns 0 rows (always!)
SELECT * FROM employee WHERE salary IS NULL;     -- correct

-- 2. Arithmetic: any NULL operand => NULL result
SELECT amount, amount * 1.1 AS taxed
FROM invoice;                                    -- NULL * 1.1 = NULL

-- 3. Aggregation: SUM/AVG/MIN/MAX ignore NULLs, COUNT(col) ignores NULLs, COUNT(*) doesn't
SELECT COUNT(*)            AS rows_total,     -- counts every row
       COUNT(salary)       AS rows_with_salary,
       SUM(salary)         AS sum_salary,     -- NULLs skipped
       AVG(salary)         AS avg_salary,     -- denominator = non-NULL count
       COALESCE(SUM(salary), 0) AS safe_sum   -- NULL when no non-NULL rows
FROM employee;

-- 4. Grouping: all NULLs form one group
SELECT department_id, COUNT(*)
FROM employee
GROUP BY department_id;                        -- NULL department is its own group

-- 5. Joins: NULL join keys never match
SELECT *
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id;    -- o.customer_id = NULL rows never join

-- 6. Ordering (PostgreSQL: NULLs first in ASC)
SELECT name, salary FROM employee
ORDER BY salary ASC NULLS LAST;                -- explicit control

-- Safety idiom: use COALESCE/NULLIF at boundaries
SELECT COALESCE(bonus, 0) AS bonus, NULLIF(amount, 0) AS nonzero_or_null FROM pay;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **`NOT IN` with NULLs:** `x NOT IN (1, 2, NULL)` is never true (equivalent to `x <> 1 AND x <> 2 AND x <> NULL`, which is UNKNOWN for every row) — a notorious trap; use `NOT EXISTS` instead.
- **`COUNT(*)` vs `COUNT(col)`:** the classic interview pivot — they differ exactly by NULL rows.
- **`AVG` vs `SUM/COUNT`:** `AVG(col)` ≠ `SUM(col)/COUNT(*)` when NULLs exist — `AVG` divides by the non-NULL count.
- **`COALESCE` evaluation order:** evaluates left to right, first non-NULL wins; `NULLIF(a,b)` returns NULL when `a = b`.
- **Ties:** irrelevant — but know how NULLs place in `ORDER BY` with `RANK`/`ROW_NUMBER` (dialect-dependent; pin with `NULLS FIRST/LAST`).

</details>

---

### Q35. How Do You Optimize a Slow Query?

> **Prompt:** Write a query for "How do you optimize a slow query?". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Optimization | **Difficulty:** medium

**Question to answer:** Give a systematic, queryable methodology for diagnosing and fixing a slow query.

<details>
<summary><b>Hint</b></summary>

Follow a discipline — measure first, then fix in order of impact:

1. **Measure:** `EXPLAIN ANALYZE` — find the actual bottleneck node (Seq Scan, Nested Loop, Hash, Sort, excessive rows).
2. **Verify row estimates vs actuals** — stale statistics drive bad plans; `ANALYZE`/`UPDATE STATISTICS`.
3. **Filter earlier:** push predicates into `WHERE`, apply filters inside joins, use `LIMIT` where applicable.
4. **Indexes:** add for `WHERE`, `JOIN` keys, and `ORDER BY`; keep them **sargable** (no functions on the indexed column).
5. **Reduce the working set:** select only needed columns; aggregate before joining big tables.
6. **Rewrite patterns:** replace correlated subqueries with joins, `IN` with `EXISTS`, avoid `SELECT *`.

</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Before: SELECT * with a function on the indexed column and a wide sort
SELECT *
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE DATE(o.created_at) = '2026-01-01'
ORDER BY o.total DESC;

-- After: sargable predicate, narrowed columns, index-backed order
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.created_at >= '2026-01-01' AND o.created_at < '2026-01-02'
ORDER BY o.total DESC;

-- Supporting index (order matters: equality column first, then the range/sort column):
CREATE INDEX idx_orders_customer_created
    ON orders (customer_id, created_at DESC, total DESC);

-- Diagnostic: locate the bottleneck node, check the actual row counts
EXPLAIN ANALYZE
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.created_at >= '2026-01-01' AND o.created_at < '2026-01-02'
ORDER BY o.total DESC;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **"It was fast yesterday":** check stats freshness and plan changes — re-`ANALYZE`; the plan itself may have flipped (parameter sniffing on SQL Server).
- **Index doesn't help a tiny table:** the planner rightly Seq Scans; don't add indexes where scans are cheaper.
- **Composite index column order:** lead with the equality column; range columns after — a `(created_at, customer_id)` index can't serve the `customer_id` equality well.
- **Over-indexing:** every index slows writes; drop unused ones (`pg_stat_user_indexes`, `sys.dm_db_index_usage_stats`).
- **N+1 in app code:** if the "query" is actually thousands of queries per page, fix the ORM batching — no SQL rewrite fixes that.
- **Correctness before speed:** the optimized query must return the same result — re-run both and diff.

</details>

---

### Q36. Find the Third-Highest Salary

> **Prompt:** Write a query for "Find the third-highest salary". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window | **Difficulty:** medium

> **Note:** Same pattern as Q11 with N = 3 — practice the generalization.

**Schema**

```sql
CREATE TABLE employee (
    id     INT PRIMARY KEY,
    salary INT
);
```

**Question to answer:** Third-highest distinct salary, or `NULL` if it doesn't exist.

<details>
<summary><b>Hint</b></summary>

`DENSE_RANK()` over distinct salaries DESC, keep rank = 3, wrap in `MAX` for the NULL fallback.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of distinct CTE: one row per distinct salary.
-- Grain of final result: one scalar row (NULL if fewer than 3 distinct salaries).
WITH distinct_salaries AS (
    SELECT DISTINCT salary FROM employee WHERE salary IS NOT NULL
)
SELECT MAX(salary) AS third_highest_salary
FROM (
    SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM distinct_salaries
) ranked
WHERE rnk = 3;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Fewer than 3 distinct salaries** (e.g., 90, 80): `MAX` over empty set → `NULL`.
- **Ties:** salaries 100, 100, 90, 80 → third distinct is 80; `DENSE_RANK` yields 1,1,2,3. `ROW_NUMBER` would return 90 — wrong here.
- **NULLs excluded** so they can't occupy a rank.
- **Grain:** one row per distinct salary at every intermediate step.

</details>

---

### Q37. Employees With the Same Salary

> **Prompt:** Write a query for "Employees with the same salary". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** GROUP BY / self join | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE employee (
    id     INT PRIMARY KEY,
    name   VARCHAR(100),
    salary INT
);
```

**Question to answer:** Find groups of employees who earn exactly the same salary (at least two employees per salary). Return the salary and the employees in each group.

<details>
<summary><b>Hint</b></summary>

Two shapes:

1. **Grouped (salaries only):** `GROUP BY salary HAVING COUNT(*) > 1` — one row per duplicated salary.
2. **Self join / window (with the names):** join employees on equal salary but different id, then dedupe; or use `COUNT(*) OVER (PARTITION BY salary)` and keep rows where the partition count > 1 — this keeps grain at one row per employee and is the cleanest.

Prefer the window version: no fan-out, no dedup needed.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Window version — grain stays one row per employee; no self-join fan-out.
SELECT id, name, salary
FROM (
    SELECT id, name, salary,
           COUNT(*) OVER (PARTITION BY salary) AS same_salary_count
    FROM employee
    WHERE salary IS NOT NULL
) t
WHERE same_salary_count > 1
ORDER BY salary, id;

-- Self join version (grain: one row per (employee, peer) pair — must dedupe, e.g., DISTINCT):
SELECT DISTINCT e1.id, e1.name, e1.salary
FROM employee e1
JOIN employee e2 ON e2.salary = e1.salary AND e2.id <> e1.id
ORDER BY e1.salary, e1.id;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Triplicates (three at 100k):** window version lists all three (partition count = 3); the self join produces 6 pairs — `DISTINCT` collapses to 3, but state that the raw join grain is one row per ordered pair.
- **Ties on salary:** the whole point — equal salaries group together.
- **NULL salaries:** excluded (NULL = NULL doesn't match in the join; `WHERE salary IS NOT NULL` in the window version) — decide whether NULL should form a "group".
- **No duplicate salaries:** empty result, trivially.
- **Grain:** window = one row per employee; self join = one row per (employee, peer) before dedup.

</details>

---

### Q38. Customers With Orders in Every Month

> **Prompt:** Write a query for "Customers with orders in every month". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** HAVING / calendar CTE | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE customers (
    id   INT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE orders (
    id          INT PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id),
    order_date  DATE
);
```

**Question to answer:** Customers who placed **at least one order in every calendar month** of a given year (say 2025 — all 12 months).

<details>
<summary><b>Hint</b></summary>

Two-part structure:

1. Build the 12-month calendar (`generate_series`, or a CTE with 12 rows) — the "expected" set.
2. Per customer, count **distinct** months with orders, and compare to 12: `COUNT(DISTINCT DATE_TRUNC('month', order_date)) = 12`.

The `DISTINCT` matters — a customer with 5 orders in January still has only 1 distinct month. Doing it via "month count = 12" avoids a calendar join entirely; the calendar approach is needed only when you must _prove_ coverage against a dynamic month list.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of monthly CTE: one row per (customer, month) with orders.
-- Grain of final result: one row per qualifying customer.
WITH customer_months AS (
    SELECT o.customer_id,
           COUNT(DISTINCT DATE_TRUNC('month', o.order_date)) AS months_with_orders
    FROM orders o
    WHERE o.order_date >= '2025-01-01' AND o.order_date < '2026-01-01'
    GROUP BY o.customer_id
)
SELECT c.id, c.name, cm.months_with_orders
FROM customers c
JOIN customer_months cm ON cm.customer_id = c.id
WHERE cm.months_with_orders = 12
ORDER BY c.id;

-- MySQL: DATE_FORMAT(o.order_date, '%Y-%m-01') instead of DATE_TRUNC.
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Multiple orders in one month:** `DISTINCT` months — never `COUNT(*)`.
- **Partial year:** if "every month" is measured over a shorter window (e.g., since signup), the target count must be computed from the calendar, not hard-coded 12.
- **Leap/Feb boundaries:** the `>= ... AND < ...` half-open range avoids `BETWEEN` off-by-one on `'2025-12-31'`.
- **Customers with zero orders:** excluded by the inner join — correct (they can't have all 12 months).
- **Ties:** not applicable; ordering by id for determinism.
- **Grain:** one row per (customer, month) in the CTE; one row per customer in the result.

</details>

---

### Q39. First and Last Order per Customer

> **Prompt:** Write a query for "First and last order per customer". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE orders (
    id          INT PRIMARY KEY,
    customer_id INT,
    order_date  DATE,
    amount      NUMERIC(10,2)
);
```

**Question to answer:** For each customer, show the date (and optionally amount) of their **first** and **last** order.

<details>
<summary><b>Hint</b></summary>

Two idioms:

1. **`FIRST_VALUE` / `LAST_VALUE`** with `RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` — without the full-frame clause, `LAST_VALUE` only sees the current row's frame (a classic gotcha). `FIRST_VALUE` doesn't need it, but keep it symmetric.
2. **`ROW_NUMBER()` twice** — one ascending, one descending — then self-join or pivot with `MAX(CASE ...)`. The `MAX(CASE ...)` pivot keeps grain at one row per customer.

Ties: if two orders share the customer's first date, add `id` (or any unique key) to the `ORDER BY` as a tiebreaker.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Approach 1: FIRST_VALUE / LAST_VALUE with explicit full frame.
-- Grain: one row per order with first/last info attached, then collapsed to one row per customer.
WITH tagged AS (
    SELECT customer_id, order_date, amount,
           FIRST_VALUE(order_date) OVER w AS first_order_date,
           LAST_VALUE(order_date)  OVER w AS last_order_date
    FROM orders
    WINDOW w AS (
        PARTITION BY customer_id
        ORDER BY order_date, id
        RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    )
)
SELECT customer_id,
       MAX(first_order_date) AS first_order_date,
       MAX(last_order_date)  AS last_order_date
FROM tagged
GROUP BY customer_id
ORDER BY customer_id;

-- Approach 2: row-number pivot (also one row per customer).
WITH ranked AS (
    SELECT customer_id, order_date,
           ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, id)      AS rn_asc,
           ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, id DESC) AS rn_desc
    FROM orders
)
SELECT customer_id,
       MAX(CASE WHEN rn_asc  = 1 THEN order_date END) AS first_order_date,
       MAX(CASE WHEN rn_desc = 1 THEN order_date END) AS last_order_date
FROM ranked
GROUP BY customer_id
ORDER BY customer_id;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Customer with exactly one order:** first = last — both approaches return the same date.
- **Ties on order_date:** without the `id` tiebreaker, which row is "first" is nondeterministic — always pin it.
- **`LAST_VALUE` frame trap:** without `UNBOUNDED FOLLOWING`, `LAST_VALUE` returns the current row's value — the single most common bug in this question.
- **NULL order_date:** excluded or treated as first/last depending on sort direction — filter explicitly.
- **Customers with no orders:** absent — `LEFT JOIN` from customers if they must appear with NULLs.
- **Grain:** the tagged/ranked CTEs stay one row per order; the final `GROUP BY` collapses to one row per customer (safe because first/last are aggregates over the partition).

</details>
## Part 4 - Q40–Q52: Grouping, Ranking & Analytics

### Q40. Latest Row per Group

> **Prompt:** Write a query for "Latest row per group". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** ROW_NUMBER | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE events (
    user_id    INT,
    event_time TIMESTAMP,
    event_type VARCHAR(50)
);
```

**Question to answer:** For each user, return their **most recent** event (the full row).

<details>
<summary><b>Hint</b></summary>

`ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY event_time DESC)` then keep `rn = 1`. If "latest" ties (same timestamp), pin a tiebreaker like a unique event id — otherwise the picked row is nondeterministic. Grain note: the numbered CTE is one row per event; the final filter keeps exactly one row per user.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of numbered CTE: one row per event with a per-user recency number.
-- Grain of final result: one row per user (their latest event).
WITH ranked AS (
    SELECT user_id, event_time, event_type,
           ROW_NUMBER() OVER (
               PARTITION BY user_id
               ORDER BY event_time DESC, event_id DESC   -- event_id: tiebreaker, add if it exists
           ) AS rn
    FROM events
)
SELECT user_id, event_time, event_type
FROM ranked
WHERE rn = 1;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Timestamp ties:** without a tiebreaker, `ROW_NUMBER` picks arbitrarily — always pin it (or use `DENSE_RANK` if you want _all_ tied-latest rows).
- **User with one event:** trivially their latest.
- **User with no events:** no row (they're not in the table).
- **NULL event_time:** sorts last in DESC? No — in PostgreSQL, NULLs sort first in DESC order, so a NULL time would win as "latest". Filter or use `NULLS LAST`.
- **Grain:** one row per event in the CTE; one row per user in the result. No fan-out anywhere.
- **Alternative "per group" idioms:** `DISTINCT ON (user_id) ... ORDER BY user_id, event_time DESC` in PostgreSQL achieves the same with simpler syntax — worth mentioning.

</details>

---

### Q41. Top Product by Revenue

> **Prompt:** Write a query for "Top product by revenue". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** GROUP BY / window | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE sales (
    id         INT PRIMARY KEY,
    product_id INT,
    amount     NUMERIC(10,2)
);
```

**Question to answer:** The single product with the highest total revenue. If several products tie for the top, decide (and state) whether to return all of them or exactly one.

<details>
<summary><b>Hint</b></summary>

1. Aggregate to revenue per product (`GROUP BY product_id`).
2. Rank products by revenue — `RANK() OVER (ORDER BY revenue DESC)` returns **all** ties at the top; `ROW_NUMBER()` returns exactly one. Pick per the requirement.

Grain: step 1 collapses sales rows to one row per product; step 2 keeps one row per product and just adds a rank.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of revenue CTE: one row per product.
-- Grain of final result: one row per top product (all tied leaders if using RANK).
WITH revenue AS (
    SELECT product_id, SUM(amount) AS total_revenue
    FROM sales
    GROUP BY product_id
),
ranked AS (
    SELECT product_id, total_revenue,
           RANK() OVER (ORDER BY total_revenue DESC) AS rnk
    FROM revenue
)
SELECT product_id, total_revenue
FROM ranked
WHERE rnk = 1;

-- Exactly one product, even with ties (add a deterministic tiebreaker):
--   ROW_NUMBER() OVER (ORDER BY total_revenue DESC, product_id) AS rn  ... WHERE rn = 1
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Tie at the top:** `RANK` returns both; `ROW_NUMBER` returns one — state which behavior you implemented.
- **Products with no sales:** absent (inner aggregate) — `LEFT JOIN` + `COALESCE(SUM(amount), 0)` if they must be eligible.
- **All revenue zero or negative:** the max is still well-defined; ties handled as above.
- **Duplicate sales rows:** `SUM(amount)` counts each row — dedupe first if the table can repeat (id is PK here, so it can't).
- **NULL amounts:** skipped by `SUM`; a product with all-NULL amounts sums to NULL, which `RANK` orders first/last per dialect — `COALESCE(SUM(amount), 0)` is the safe default.

</details>

---

### Q42. Percentage of Total Sales

> **Prompt:** Write a query for "Percentage of total sales". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE sales (
    id         INT PRIMARY KEY,
    region     VARCHAR(50),
    amount     NUMERIC(10,2)
);
```

**Question to answer:** For each sale (or each region), show the percentage it contributes to the **overall** total.

<details>
<summary><b>Hint</b></summary>

The window trick: `SUM(amount) OVER ()` — an empty frame computes the grand total and broadcasts it to every row. Then `amount * 100.0 / grand_total`. Note `SUM(amount) OVER ()` ≠ `SUM(amount) OVER (ORDER BY ...)` (that would be a running total) — the empty parentheses are the whole difference. Grain: one output row per input row (or per region if you aggregate first).
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Row-level share (grain: one row per sale, with grand-total share attached).
SELECT id, region, amount,
       ROUND(amount * 100.0 / SUM(amount) OVER (), 2) AS pct_of_total
FROM sales
ORDER BY region, id;

-- Region-level share (grain: one row per region).
SELECT region,
       ROUND(SUM(amount) * 100.0 / SUM(SUM(amount)) OVER (), 2) AS pct_of_total
FROM sales
GROUP BY region
ORDER BY pct_of_total DESC;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Grand total is 0 or NULL:** division by zero → error/NULL; guard with `NULLIF(SUM(amount) OVER (), 0)`.
- **NULL amounts:** skipped by both `SUM`s consistently, so percentages still sum to ~100 across non-NULL rows.
- **Negative amounts (refunds):** percentages can exceed 100 or go negative — mathematically consistent, but state it.
- **Rounding:** percentages may sum to 99.99–100.01 after `ROUND` — mention it if precision matters.
- **Empty table:** `SUM(...) OVER ()` is NULL → division yields NULL; no rows anyway.
- **Ties:** none structurally; ordering is cosmetic.

</details>

---

### Q43. Pivot Rows Into Columns

> **Prompt:** Write a query for "Pivot rows into columns". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Conditional aggregate | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE sales (
    year     INT,
    quarter  INT,     -- 1..4
    revenue  NUMERIC(10,2)
);
```

**Question to answer:** Pivot so each year is one row with one column per quarter: `year, q1_revenue, q2_revenue, q3_revenue, q4_revenue`.

<details>
<summary><b>Hint</b></summary>

Conditional aggregation is the portable pivot: `SUM(CASE WHEN quarter = 1 THEN revenue END) AS q1_revenue` per quarter, grouped by year. The `CASE` returns NULL for non-matching quarters and `SUM` ignores NULLs — so no ELSE branch is needed. (Some dialects have a native `PIVOT` — SQL Server — or `FILTER` — PostgreSQL — but the `CASE` idiom works everywhere and is the interview-safe answer.) Grain: one row per (year, quarter) in, one row per year out.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of grouped intermediate: one row per year (quarters folded into columns).
-- Grain of final result: one row per year.
SELECT year,
       SUM(CASE WHEN quarter = 1 THEN revenue END) AS q1_revenue,
       SUM(CASE WHEN quarter = 2 THEN revenue END) AS q2_revenue,
       SUM(CASE WHEN quarter = 3 THEN revenue END) AS q3_revenue,
       SUM(CASE WHEN quarter = 4 THEN revenue END) AS q4_revenue
FROM sales
GROUP BY year
ORDER BY year;

-- PostgreSQL equivalent with FILTER:
SELECT year,
       SUM(revenue) FILTER (WHERE quarter = 1) AS q1_revenue,
       SUM(revenue) FILTER (WHERE quarter = 2) AS q2_revenue,
       SUM(revenue) FILTER (WHERE quarter = 3) AS q3_revenue,
       SUM(revenue) FILTER (WHERE quarter = 4) AS q4_revenue
FROM sales
GROUP BY year
ORDER BY year;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Missing quarter for a year:** the `CASE` yields NULL → the column is NULL (or 0 with `COALESCE`/`ELSE 0`) — state your choice.
- **Multiple rows per (year, quarter):** `SUM` aggregates them all — correct for revenue.
- **Unknown quarter values (e.g., 5):** ignored by all four columns — validate or add an "other" column.
- **NULL revenue:** `SUM` skips; a quarter with only NULLs shows NULL.
- **Grain:** one row per year, regardless of how many quarter rows existed; the pivot is lossy only if a year is entirely absent.

</details>

---

### Q44. Unpivot Columns Into Rows

> **Prompt:** Write a query for "Unpivot columns into rows". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** UNION ALL / lateral | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE sales_wide (
    year      INT PRIMARY KEY,
    q1_revenue NUMERIC(10,2),
    q2_revenue NUMERIC(10,2),
    q3_revenue NUMERIC(10,2),
    q4_revenue NUMERIC(10,2)
);
```

**Question to answer:** Unpivot to long format: one row per (year, quarter).

<details>
<summary><b>Hint</b></summary>

The portable unpivot is `UNION ALL` over the four columns, each emitting a literal quarter label — **`UNION ALL`, not `UNION`**, because a year with equal quarter values must keep all four rows. (Native `UNPIVOT` exists in SQL Server/BigQuery; `VALUES` + `CROSS JOIN LATERAL` in PostgreSQL is the cleanest there.) Grain: one wide row in → four long rows out.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of each UNION branch: one row per (year, that quarter).
-- Grain of final result: one row per (year, quarter) — up to 4x the input rows.
SELECT year, 1 AS quarter, q1_revenue AS revenue FROM sales_wide
UNION ALL
SELECT year, 2 AS quarter, q2_revenue FROM sales_wide
UNION ALL
SELECT year, 3 AS quarter, q3_revenue FROM sales_wide
UNION ALL
SELECT year, 4 AS quarter, q4_revenue FROM sales_wide
ORDER BY year, quarter;

-- PostgreSQL: VALUES + CROSS JOIN LATERAL
SELECT s.year, q.quarter, q.revenue
FROM sales_wide s
CROSS JOIN LATERAL (
    VALUES (1, s.q1_revenue), (2, s.q2_revenue),
           (3, s.q3_revenue), (4, s.q4_revenue)
) AS q(quarter, revenue)
ORDER BY s.year, q.quarter;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Equal values across quarters:** `UNION ALL` keeps all rows; `UNION` would wrongly collapse them — the classic trap in this question.
- **NULL quarter values:** emitted as `(quarter, NULL)` rows — decide whether to keep or filter (`WHERE revenue IS NOT NULL`).
- **Row fan-out:** 1 wide row → exactly 4 long rows; state this multiplier in your grain answer.
- **Column order / naming:** the first `SELECT` determines output column names; literals must match types (int 1 vs 'Q1' string).
- **Ties:** not applicable — set/row semantics, not ordering.

</details>

---

### Q45. Find Missing Dates

> **Prompt:** Write a query for "Find missing dates". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Calendar CTE | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE sales (
    id        INT PRIMARY KEY,
    sale_date DATE
);
```

**Question to answer:** List the dates within a range (say Jan 1–Jan 10, 2026) on which **no sale occurred**.

<details>
<summary><b>Hint</b></summary>

The classic **calendar CTE + anti-join**:

1. Generate the full date sequence (`generate_series` in PostgreSQL; a recursive CTE or a numbers table elsewhere).
2. `LEFT JOIN` sales onto the calendar and keep dates with no matching sale — or `WHERE NOT EXISTS`.

Grain: the calendar is one row per date; after the anti-join, the result is one row per _missing_ date. If `sale_date` can repeat, dedupe before comparing, or use `NOT EXISTS` which is immune.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of calendar CTE: one row per calendar date in range.
-- Grain of final result: one row per date with zero sales.
WITH RECURSIVE calendar AS (
    SELECT DATE '2026-01-01' AS d
    UNION ALL
    SELECT d + 1 FROM calendar WHERE d < DATE '2026-01-10'
)
SELECT c.d AS missing_date
FROM calendar c
LEFT JOIN (
    SELECT DISTINCT sale_date FROM sales
    WHERE sale_date BETWEEN DATE '2026-01-01' AND DATE '2026-01-10'
) s ON s.sale_date = c.d
WHERE s.sale_date IS NULL
ORDER BY c.d;

-- PostgreSQL shorthand for the calendar: generate_series(DATE '2026-01-01', DATE '2026-01-10', INTERVAL '1 day')
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Duplicate sales on the same date:** the `DISTINCT` subquery (or `NOT EXISTS`) prevents a calendar date from being counted as "present" multiple times.
- **Range boundaries:** decide inclusive (`BETWEEN` / `<=`) vs exclusive and state it.
- **Large ranges:** a recursive CTE has a recursion depth limit (PostgreSQL ~100k by default — fine here); `generate_series` or a numbers-table join scales better.
- **NULL sale_date:** never matches the calendar — effectively a sale on an unknown date; filter if it matters.
- **Grain discipline:** calendar rows are the driving grain; sales can never add rows (each date matches at most the deduped sale list).

</details>

---

### Q46. Find Overlapping Intervals

> **Prompt:** Write a query for "Find overlapping intervals". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Self join | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE bookings (
    id        INT PRIMARY KEY,
    room_id   INT,
    start_at  TIMESTAMP,
    end_at    TIMESTAMP
);
```

**Question to answer:** Find pairs of bookings for the **same room** whose time ranges overlap.

<details>
<summary><b>Hint</b></summary>

Self join on the overlap predicate: two intervals `[a1, a2]` and `[b1, b2]` overlap iff `a1 < b2 AND b1 < a2` (strict inequality for "touch at an endpoint = not overlapping" — the standard convention; use `<=` if inclusive). Also require different ids to avoid pairing a booking with itself, and `a.id < b.id` to get each unordered pair once. The join key is `room_id`; the predicate is the overlap condition. Grain: one row per (booking, overlapping-booking) pair.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of join: one row per ordered overlapping pair (a, b) in the same room.
-- Grain of final result: one row per unordered pair (via a.id < b.id).
SELECT a.id AS booking_a, b.id AS booking_b, a.room_id,
       a.start_at AS a_start, a.end_at AS a_end,
       b.start_at AS b_start, b.end_at AS b_end
FROM bookings a
JOIN bookings b
  ON b.room_id = a.room_id
 AND b.id <> a.id
 AND a.id < b.id                    -- each unordered pair once
 AND a.start_at < b.end_at
 AND b.start_at < a.end_at;         -- strict overlap; use <= for inclusive
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Endpoint touching** (`[9:00–10:00]` and `[10:00–11:00]`): with strict `<`, not overlapping (the usual interpretation — a room can be reused on the hour). State the convention.
- **One interval fully inside another:** `a.start_at < b.end_at AND b.start_at < a.end_at` still true — correctly flagged.
- **Identical intervals:** flagged once per unordered pair — correct.
- **Zero-length intervals** (`start = end`): degenerate; decide whether they overlap anything.
- **NULL start/end:** comparisons yield NULL → not flagged; validate the data.
- **Duplicate bookings (same id twice):** the `id <> a.id` guard doesn't protect against _different_ rows with identical data — they legitimately overlap.
- **Fan-out:** each booking can pair with many others — the result grain is per pair, which can exceed the input row count (state that explicitly).

</details>

---

### Q47. Sessionize User Events

> **Prompt:** Write a query for "Sessionize user events". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Window / gaps-and-islands | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE events (
    user_id   INT,
    event_time TIMESTAMP,
    event_type VARCHAR(50)
);
```

**Question to answer:** Assign each event to a **session** — a new session starts when a user's gap to the previous event exceeds 30 minutes. Return each event with a session id.

<details>
<summary><b>Hint</b></summary>

This is gaps-and-islands over time:

1. `LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time)` → previous event time.
2. Flag a new session: `CASE WHEN event_time - prev > 30 min THEN 1 ELSE 0 END`.
3. `SUM(flag) OVER (PARTITION BY user_id ORDER BY event_time)` → cumulative session number; the `SUM` of a running counter makes each event inherit its session's number.

Grain stays one row per event — we're only attaching session ids. The session _boundaries_ can then be derived by grouping on (user, session).
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of lagged CTE: one row per event with the previous event time attached.
-- Grain of final result: one row per event with a per-user session number.
WITH lagged AS (
    SELECT user_id, event_time, event_type,
           LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) AS prev_time
    FROM events
),
flagged AS (
    SELECT user_id, event_time, event_type,
           CASE
               WHEN prev_time IS NULL THEN 1                                  -- first event starts session 1
               WHEN event_time - prev_time > INTERVAL '30 minutes' THEN 1     -- PostgreSQL; MySQL: TIMESTAMPDIFF(MINUTE, ...) > 30
               ELSE 0
           END AS new_session
    FROM lagged
)
SELECT user_id, event_time, event_type,
       SUM(new_session) OVER (PARTITION BY user_id ORDER BY event_time) AS session_id
FROM flagged
ORDER BY user_id, event_time;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **First event per user:** `prev_time IS NULL` → forced new session (1) — otherwise the first session would start at 0.
- **Exactly 30-minute gap:** `>` means 30:00 is _not_ a break; state the boundary convention (many use `>=`).
- **Two events at the same timestamp:** tie ordering needs a tiebreaker; order by `(event_time, event_id)` for determinism.
- **NULL event_time:** breaks the ordering chain — filter.
- **Grain:** one output row per input event; sessions are derived by the cumulative `SUM` window, not by grouping.
- **Deriving session metadata:** group by (user_id, session_id) and take MIN/MAX/COUNT for start/end/length.

</details>

---

### Q48. Longest Consecutive Login Streak

> **Prompt:** Write a query for "Longest consecutive login streak". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Gaps and islands | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE logins (
    user_id  INT,
    login_at DATE
);
```

**Question to answer:** For each user, the length of their **longest** run of consecutive login days.

<details>
<summary><b>Hint</b></summary>

Combine Q5's island technique with a final max: dedupe → number rows per user → island key = `login_at - rn` → count per island → `MAX(count)` per user. Grain: one row per (user, island) at the counting step, then one row per user at the end. If the source has multiple logins per day, dedup first or streaks silently break.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of deduped: one row per (user, day).
-- Grain of numbered: one row per (user, day) with per-user sequence number.
-- Grain of islands: one row per (user, island) with its length.
-- Grain of final result: one row per user (their longest streak).
WITH deduped AS (
    SELECT DISTINCT user_id, login_at FROM logins
),
numbered AS (
    SELECT user_id, login_at,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_at) AS rn
    FROM deduped
),
islands AS (
    SELECT user_id, login_at - rn AS grp, COUNT(*) AS streak_len
    FROM numbered
    GROUP BY user_id, login_at - rn        -- MySQL: DATE_SUB(login_at, INTERVAL rn DAY)
)
SELECT user_id, MAX(streak_len) AS longest_streak
FROM islands
GROUP BY user_id
ORDER BY user_id;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Same-day multiple logins:** `DISTINCT` first — mandatory for correct streak math.
- **Ties for longest streak** (two runs of 5 days): `MAX` returns 5 for the user — no ambiguity.
- **Users with a single login:** streak = 1 — correct.
- **Users with no logins:** absent from the result.
- **NULL login dates:** excluded; filter if dirty.
- **Grain:** the islands step is where rows collapse from per-day to per-run; the final step collapses per-user.

</details>

---

### Q49. Compare Current Row With Previous Row

> **Prompt:** Write a query for "Compare current row with previous row". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** LAG | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE sales (
    id        INT PRIMARY KEY,
    sale_date DATE,
    amount    NUMERIC(10,2)
);
```

**Question to answer:** For each sale, show the previous sale's amount and the day-over-day (row-over-row) difference.

<details>
<summary><b>Hint</b></summary>

`LAG(amount) OVER (ORDER BY sale_date, id)` fetches the previous row's value within the same window partition. The difference is `amount - prev_amount`. The first row's `LAG` is NULL — the difference is then NULL, not 0 (state that; use `COALESCE` if you want 0). Grain: one output row per input row.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain: one row per sale, with the previous sale's amount and the delta attached.
SELECT id, sale_date, amount,
       LAG(amount) OVER (ORDER BY sale_date, id)        AS prev_amount,
       amount - LAG(amount) OVER (ORDER BY sale_date, id) AS diff_from_prev
FROM sales
ORDER BY sale_date, id;

-- With explicit previous-value reuse (and an optional NULL->0 fill):
WITH prev AS (
    SELECT id, sale_date, amount,
           LAG(amount) OVER (ORDER BY sale_date, id) AS prev_amount
    FROM sales
)
SELECT id, sale_date, amount, prev_amount,
       COALESCE(amount - prev_amount, 0) AS diff_from_prev
FROM prev
ORDER BY sale_date, id;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **First row:** `prev_amount` NULL → diff NULL (or 0 with `COALESCE`) — be explicit.
- **Ties on sale_date:** the `id` tiebreaker fixes the ordering; without it, which row is "previous" is nondeterministic.
- **NULL amounts:** `amount - NULL` = NULL — the diff propagates NULL; decide on `COALESCE(amount, 0)` semantics.
- **Duplicates:** each row compares against its immediate predecessor in the sort order — duplicates are independent rows.
- **`LAG(amount, 2)`:** the second parameter skips N rows back — worth mentioning for "compare with two rows ago".

</details>

---

### Q50. Compare Current Row With Next Row

> **Prompt:** Write a query for "Compare current row with next row". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** LEAD | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE sales (
    id        INT PRIMARY KEY,
    sale_date DATE,
    amount    NUMERIC(10,2)
);
```

**Question to answer:** For each sale, show the **next** sale's amount and whether the current row is higher or lower than it.

<details>
<summary><b>Hint</b></summary>

Mirror of Q49 with `LEAD(amount) OVER (ORDER BY sale_date, id)`. The _last_ row's `LEAD` is NULL — handle explicitly. Use a `CASE` on `amount vs next_amount` for the higher/lower comparison, remembering that a NULL `next_amount` means "no next row", not "lower".
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain: one row per sale, with the next sale's amount and a comparison flag.
WITH nxt AS (
    SELECT id, sale_date, amount,
           LEAD(amount) OVER (ORDER BY sale_date, id) AS next_amount
    FROM sales
)
SELECT id, sale_date, amount, next_amount,
       CASE
           WHEN next_amount IS NULL THEN 'no next row'
           WHEN amount > next_amount THEN 'higher'
           WHEN amount < next_amount THEN 'lower'
           ELSE 'equal'
       END AS vs_next
FROM nxt
ORDER BY sale_date, id;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Last row:** `next_amount` NULL → label it, don't compare.
- **Ties on sale_date:** tiebreaker (`id`) required for a deterministic "next".
- **Equal adjacent amounts:** the `ELSE 'equal'` branch — don't forget it in the `CASE`.
- **`LEAD(amount, 2)`:** skip-ahead variant — mention it for "compare with the row after next".
- **NULL amounts:** comparisons with NULL yield NULL in the CASE? No — the `WHEN amount > next_amount` with NULL `next_amount` is handled first by the `IS NULL` branch; but if `amount` itself is NULL the CASE falls through to 'equal' — filter if that misleads.
- **Grain:** one output row per input row; no fan-out.

</details>

---

### Q51. Delete Duplicate Rows Safely

> **Prompt:** Write a query for "Delete duplicate rows safely". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** ROW_NUMBER / transaction | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE contacts (
    id    INT PRIMARY KEY,
    email VARCHAR(100),
    phone VARCHAR(20)
);
```

**Question to answer:** Delete duplicate contacts — same `email` — keeping exactly one row per email (prefer the one with the smallest `id`). Safely: verify, back up, then delete inside a transaction.

<details>
<summary><b>Hint</b></summary>

1. **Verify first:** count duplicates with `GROUP BY email HAVING COUNT(*) > 1`.
2. **Target rows:** `ROW_NUMBER() OVER (PARTITION BY email ORDER BY id)` — keep `rn = 1`, delete `rn > 1`. Ordering by `id` makes "keep the smallest id" deterministic.
3. **Back up:** `CREATE TABLE contacts_backup AS SELECT * FROM contacts;` before mutating.
4. **Delete inside a transaction** so you can roll back; re-run the duplicate count to confirm zero.

Deleting from a CTE (`DELETE FROM numbered WHERE rn > 1`) is supported in PostgreSQL/MySQL/SQL Server and is the cleanest "safe" form.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Step 0: back up (grain: same as contacts — a full snapshot).
CREATE TABLE contacts_backup AS SELECT * FROM contacts;

-- Step 1: confirm the scope of the problem (one row per duplicated email).
SELECT email, COUNT(*) FROM contacts GROUP BY email HAVING COUNT(*) > 1;

-- Step 2: preview which rows will be deleted (one row per duplicate beyond the first).
WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
    FROM contacts
)
SELECT * FROM numbered WHERE rn > 1;

-- Step 3: delete inside a transaction (PostgreSQL/MySQL/SQL Server allow DELETE on the CTE).
BEGIN;
WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
    FROM contacts
)
DELETE FROM contacts
WHERE id IN (SELECT id FROM numbered WHERE rn > 1);
-- or: DELETE FROM numbered WHERE rn > 1;
COMMIT;

-- Step 4: verify — should return 0 rows.
SELECT email, COUNT(*) FROM contacts GROUP BY email HAVING COUNT(*) > 1;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **NULL email:** `PARTITION BY email` groups NULLs together, so NULLs dedupe like a value — decide whether that's desired.
- **Ties on `id`:** ids are the PK, so no ties; if the "keep" key weren't unique, add a tiebreaker.
- **Foreign keys:** deleting rows may violate `REFERENCES` — check dependent tables or use `ON DELETE` actions.
- **Locking/concurrency:** run during low traffic or rely on the DB's row locks; a concurrent insert could re-create duplicates — add a unique index after cleanup.
- **Rollback safety:** if anything looks wrong between `BEGIN` and `COMMIT`, `ROLLBACK` — that's the whole point of the transaction.
- **Grain:** the numbered CTE is one row per contact; the delete removes every row except the `rn = 1` survivor per email.

</details>

---

### Q52. Find Median in SQL

> **Prompt:** Write a query for "Find median in SQL". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Percentile / window | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE measurements (
    id    INT PRIMARY KEY,
    value NUMERIC(10,2)
);
```

**Question to answer:** The median of `value` — middle value for odd counts, average of the two middles for even counts.

<details>
<summary><b>Hint</b></summary>

Fastest, portable-to-most-engines: `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value)` — _continuous_ percentile, which averages the two middles on even counts (that's the standard "median" definition). `PERCENTILE_DISC` returns an actual value from the data (the lower middle on even counts) — know the difference. The manual version: number rows and keep positions `FLOOR((n+1)/2)` and `CEIL((n+1)/2)` then average — one row per measurement in the CTE, one scalar out.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Simplest (PostgreSQL, SQL Server, BigQuery, Oracle):
-- Grain of final result: a single scalar.
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) AS median
FROM measurements
WHERE value IS NOT NULL;

-- Manual row-position version (works everywhere):
WITH ranked AS (
    SELECT value,
           ROW_NUMBER() OVER (ORDER BY value) AS rn,
           COUNT(*) OVER ()                   AS n
    FROM measurements
    WHERE value IS NOT NULL
)
SELECT AVG(value) AS median
FROM ranked
WHERE rn IN (FLOOR((n + 1) / 2.0), CEIL((n + 1) / 2.0));

-- MySQL (no PERCENTILE_CONT): the manual version above, or a self-join counting
-- values <= and >= each row.
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Even count (4 values):** both middles are averaged; the row-position filter matches exactly 2 rows and `AVG` collapses them.
- **Odd count:** both positions equal → 1 row → `AVG` of one value = the value itself.
- **Ties on value:** row positions are unique per row, so ties don't skew the median — each duplicate value gets its own `rn`.
- **NULL values:** excluded via `WHERE value IS NOT NULL`.
- **Empty table:** `PERCENTILE_CONT` returns NULL; the manual version returns NULL too (empty filter set).
- **`PERCENTILE_DISC` vs `PERCENTILE_CONT`:** DISC picks an existing value (lower middle on evens); CONT interpolates/averages — state which your dialect's "median" gives you.
- **Grain:** the ranked CTE is one row per measurement; the result collapses to one scalar.

</details>
## Part 5 - Q53–Q65: Subqueries, Optimization & Schema

### Q53. Conditional COUNT and SUM

> **Prompt:** Write a query for "Conditional COUNT and SUM". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** CASE / aggregate | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE orders (
    id         INT PRIMARY KEY,
    status     VARCHAR(20),     -- 'completed' | 'pending' | 'cancelled'
    amount     NUMERIC(10,2)
);
```

**Question to answer:** In a single pass over the table, count orders by status **and** sum amounts only for completed orders.

<details>
<summary><b>Hint</b></summary>

Conditional aggregation in one query:

- `SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)` counts completed orders (equivalently `COUNT(*) FILTER (WHERE ...)` in PostgreSQL).
- `SUM(CASE WHEN status = 'completed' THEN amount END)` sums completed amounts — the `ELSE NULL` means non-completed rows contribute NULL, which `SUM` skips.

Key nuance: `COUNT(CASE WHEN ... THEN 1 END)` vs `SUM(CASE WHEN ... THEN 1 ELSE 0 END)` — the former ignores NULL ELSE rows, the latter adds explicit zeros; both give the same count, but the mental model differs. Grain: one output row for the whole table (or per group if you add a `GROUP BY`).
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of grouped intermediate: one row per status (with counts and conditional sums).
-- Grain of final result: one row per status.
SELECT status,
       COUNT(*)                                                       AS total_orders,
       COUNT(CASE WHEN status = 'completed' THEN 1 END)               AS completed_count,
       SUM(CASE WHEN status = 'completed' THEN amount END)            AS completed_amount,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)          AS cancelled_count
FROM orders
GROUP BY status
ORDER BY status;

-- Whole-table version (one row out, no GROUP BY):
SELECT COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_count,
       SUM(CASE WHEN status = 'completed' THEN amount END) AS completed_amount
FROM orders;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Unknown status values:** excluded from every conditional column — add an `ELSE`/extra column if they must surface.
- **NULL status:** groups with NULL in the `GROUP BY` version; excluded from the completed/cancelled conditionals.
- **NULL amount on a completed order:** `SUM` skips it — the count and the sum can disagree; decide whether to `COALESCE(amount, 0)`.
- **Ties:** irrelevant — aggregation, not ordering.
- **Grain:** one row per status (or one scalar row); no fan-out.

</details>

---

### Q54. Correlated Subquery vs Join

> **Prompt:** Write a query for "Correlated subquery vs join". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Subquery | **Difficulty:** medium

**Question to answer:** Explain the difference between a correlated subquery and a join, and show the same result built both ways.

<details>
<summary><b>Hint</b></summary>

- **Correlated subquery:** a subquery that references the outer query's column — it must be **re-evaluated per outer row** (conceptually). Easy to read, but a per-row execution cost; the optimizer may or may not decorrelate it.
- **Join:** a single set-based operation; the planner can choose hash/merge/nested-loop strategies. Joins can **fan out** if the join key isn't unique on one side — a correlated subquery never multiplies rows.

The classic comparison task: "orders with their latest order date" (or "employees whose salary is above their department average") — show both forms produce identical results and identical grain.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Task: employees earning more than their department's average salary.
-- Grain of both results: one row per employee (no fan-out in either form).

-- Form 1: correlated subquery — average computed per employee row.
SELECT e.id, e.name, e.salary, e.department_id
FROM employee e
WHERE e.salary > (
    SELECT AVG(salary)
    FROM employee e2
    WHERE e2.department_id = e.department_id
);

-- Form 2: join to a pre-aggregated CTE — average computed once per department.
-- Grain of dept_avg CTE: one row per department.
WITH dept_avg AS (
    SELECT department_id, AVG(salary) AS avg_salary
    FROM employee
    GROUP BY department_id
)
SELECT e.id, e.name, e.salary, e.department_id
FROM employee e
JOIN dept_avg d ON d.department_id = e.department_id
WHERE e.salary > d.avg_salary;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Fan-out risk:** if `dept_avg` had duplicate department rows, the join would duplicate employees; the correlated form can't. The `GROUP BY department_id` guarantees uniqueness, so both are safe here.
- **NULL in the correlated comparison:** `salary > NULL` is NULL → row dropped — the same in the join form. Decide whether `AVG` should ignore NULLs (it does).
- **Departments with one employee:** `AVG` = that salary; `salary > avg` is false → correctly excluded.
- **Performance:** for large tables, the join usually wins (hash join, single aggregation pass); correlated subqueries can be fine when the optimizer decorrelates (PostgreSQL does this well).
- **Grain discipline:** state that both forms preserve one-row-per-employee.

</details>

---

### Q55. EXISTS vs IN

> **Prompt:** Write a query for "EXISTS vs IN". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Subquery | **Difficulty:** medium

**Question to answer:** Explain `EXISTS` vs `IN`, demonstrate the difference, and cover the NULL trap.

<details>
<summary><b>Hint</b></summary>

- `x IN (subquery)` tests membership; the subquery is evaluated once; duplicates in the subquery are irrelevant (membership is boolean).
- `EXISTS (subquery)` tests whether the subquery returns **at least one row**; it's a correlated predicate evaluated per outer row, and it short-circuits at the first match.

**The NULL trap:** `x NOT IN (1, 2, NULL)` is never true for any `x` — because `x NOT IN (NULL)` means `x <> NULL`, which is UNKNOWN. `NOT EXISTS` doesn't have this problem. This is the canonical "when to choose which" interview answer.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Task: customers who have placed an order — same grain (one row per customer) both ways.
SELECT c.id, c.name
FROM customers c
WHERE c.id IN (SELECT customer_id FROM orders);          -- evaluates the order list once

SELECT c.id, c.name
FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);  -- per-customer probe, stops at first hit

-- The NULL trap in action:
-- Customers with no order whose id is NOT IN (1, 2, NULL) — returns ZERO rows,
-- because id <> NULL is never TRUE.
SELECT * FROM customers WHERE id NOT IN (1, 2, NULL);

-- Safe equivalent — NOT EXISTS:
SELECT * FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Subquery returns NULLs:** `IN` with a NULL in the list behaves like `= NULL` → unknown for non-matching rows; `EXISTS` is unaffected.
- **Duplicate ids in the subquery:** `IN` doesn't care (membership); `EXISTS` doesn't either (row existence) — no fan-out in either.
- **Empty subquery:** `IN` → false for all rows; `EXISTS` → false for all rows — same result.
- **Performance:** `IN` is often decorrelated into a join; `EXISTS` short-circuits per row. Modern optimizers usually rewrite both to the same plan — the _NULL semantics_ difference is the real deciding factor.
- **Grain:** both keep one row per customer; no multiply.

</details>

---

### Q56. Recursive Employee Hierarchy

> **Prompt:** Write a query for "Recursive employee hierarchy". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Recursive CTE | **Difficulty:** medium

**Schema**

```sql
CREATE TABLE employee (
    id         INT PRIMARY KEY,
    name       VARCHAR(100),
    manager_id INT REFERENCES employee(id)   -- NULL for the CEO
);
```

**Question to answer:** For each employee, list the full chain of managers up to the CEO (or: every descendant of a given manager). Use a recursive CTE.

<details>
<summary><b>Hint</b></summary>

Recursive CTE anatomy: **anchor** (the starting rows, e.g., the CEO) + **recursive term** (join the CTE back to the table to walk one level) + a `UNION ALL` between them. Track the depth (`level`) and the ancestor path (array/string) as you go. Guard against cycles with a visited-set (e.g., `path` containing the current id) — real org data can contain loops. Grain: the recursive CTE produces one row per (start_node, ancestor) pair, or one row per node at each depth.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Find every manager above each employee, with depth (1 = direct manager).
-- Grain of recursive CTE: one row per (employee, ancestor) pair reachable up the chain.
-- Grain of final result: same — one row per (employee, ancestor) pair.
WITH RECURSIVE chain AS (
    -- Anchor: everyone reports to someone; seed each employee with their direct manager.
    SELECT id AS employee_id, manager_id AS ancestor_id, 1 AS depth
    FROM employee
    WHERE manager_id IS NOT NULL

    UNION ALL

    -- Recursive step: climb one level up.
    SELECT c.employee_id, e.manager_id, c.depth + 1
    FROM chain c
    JOIN employee e ON e.id = c.ancestor_id
    WHERE e.manager_id IS NOT NULL
)
SELECT employee_id, ancestor_id, depth
FROM chain
ORDER BY employee_id, depth;

-- Alternative shape — full org tree under a given root (e.g., id = 1):
-- Anchor: SELECT id, name, 0 AS depth FROM employee WHERE id = 1
-- Recursive: SELECT e.id, e.name, c.depth + 1 FROM tree c JOIN employee e ON e.manager_id = c.id
-- (cycle guard: add a path column and stop when e.id = ANY(path))
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **CEO (`manager_id IS NULL`):** never appears as an ancestor because the recursive join stops when the manager is the CEO (their `manager_id IS NULL` fails the `WHERE`). If you need the CEO listed, change the stop condition.
- **Dangling manager_id:** the join finds no row → recursion naturally stops.
- **Cycles (A manages B manages A):** infinite recursion → use a path/visited guard and stop before revisiting.
- **Depth limits:** PostgreSQL defaults to ~1000 recursion levels; fine for orgs, tune if needed.
- **Duplicate ancestor paths:** none — each (employee, ancestor) pair is unique by construction (a tree has one path).
- **Grain:** one row per ancestor per employee — the final row count ≈ sum of each employee's chain length.

</details>

---

### Q57. Date Difference by Dialect

> **Prompt:** Write a query for "Date difference by dialect". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Dates | **Difficulty:** medium

**Question to answer:** Compute the difference between two dates (in days, and in months) across the major dialects, and note where the semantics differ.

<details>
<summary><b>Hint</b></summary>

The same concept, four spellings:

- **PostgreSQL:** `date2 - date1` (days), `EXTRACT(EPOCH FROM ...)` for fractional, `AGE()` for years/months/days.
- **MySQL:** `DATEDIFF(date2, date1)` (days), `TIMESTAMPDIFF(DAY/MONTH, date1, date2)` — note the **argument order**: interval comes first.
- **SQL Server:** `DATEDIFF(DAY, date1, date2)` — counts **boundary crossings**, so `DATEDIFF(DAY, '23:59', '00:01')` = 1 even though it's 2 minutes.
- **SQLite:** `julianday(date2) - julianday(date1)` (fractional days).

</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Days between two dates, by dialect:
-- PostgreSQL
SELECT DATE '2026-01-10' - DATE '2026-01-01' AS days;            -- 9

-- MySQL
SELECT DATEDIFF('2026-01-10', '2026-01-01') AS days;              -- 9

-- SQL Server
SELECT DATEDIFF(DAY, '2026-01-01', '2026-01-10') AS days;         -- 9

-- SQLite
SELECT julianday('2026-01-10') - julianday('2026-01-01') AS days; -- 9.0

-- Months between, by dialect:
-- PostgreSQL: AGE-based or EXTRACT(YEAR/MONTH) arithmetic
SELECT (EXTRACT(YEAR FROM AGE('2026-03-01', '2025-01-15')) * 12
      + EXTRACT(MONTH FROM AGE('2026-03-01', '2025-01-15')))::int AS months;

-- MySQL
SELECT TIMESTAMPDIFF(MONTH, '2025-01-15', '2026-03-01') AS months; -- 13

-- SQL Server (boundary crossings — 2 days apart crossing a month boundary = 1)
SELECT DATEDIFF(MONTH, '2026-01-31', '2026-02-01') AS months;      -- 1
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Argument order differs:** MySQL `DATEDIFF(end, start)` vs SQL Server `DATEDIFF(unit, start, end)` — the #1 cross-dialect bug.
- **SQL Server counts boundaries, not elapsed time:** `DATEDIFF(DAY, '23:59', '00:01')` = 1 despite 2 minutes elapsed — say this in interviews.
- **Month differences are ill-defined** (Jan 31 → Feb 28 is 0 or 1 month?): each dialect has a rule — state it.
- **NULL dates:** every dialect's diff function returns NULL.
- **Leap days:** `Feb 28 → Mar 1` is 2 days in PostgreSQL, but `DATEDIFF(DAY,...)` in SQL Server is 2 as well (Feb 28→29→Mar 1 crosses two boundaries? No — Feb 28→Mar 1 crosses Feb 29 boundary → 2). Verify per dialect; leap-aware arithmetic differs.
- **Grain:** no grain change — this is scalar date math, not a set operation.

</details>

---

### Q58. NULL-Safe Aggregation

> **Prompt:** Write a query for "NULL-safe aggregation". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** NULL semantics | **Difficulty:** medium

**Question to answer:** Aggregate a column that contains NULLs without losing information — show `COUNT`, `SUM`, `AVG` behaving with and without NULL handling.

<details>
<summary><b>Hint</b></summary>

Default behavior: `COUNT(*)` counts rows; `COUNT(col)` counts non-NULL; `SUM`/`AVG`/`MIN`/`MAX` ignore NULLs. "NULL-safe aggregation" means _deciding what NULL means_:

- **Treat as 0:** `COALESCE(col, 0)` before summing/averaging.
- **Treat as a distinct category:** `GROUP BY COALESCE(col, 'unknown')` or `IS NULL` buckets.
- **Treat as "count it":** `COUNT(*)` vs `COUNT(col)` — choose deliberately.

Also: an all-NULL group produces `SUM = NULL` — wrap in `COALESCE(SUM(...), 0)` for a safe zero.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Grain of grouped intermediate: one row per department with per-aggregate results.
-- Grain of final result: one row per department.
SELECT department_id,
       COUNT(*)                        AS row_count,        -- includes rows where bonus is NULL
       COUNT(bonus)                    AS bonus_not_null,   -- only non-NULL bonuses
       COUNT(bonus) FILTER (WHERE bonus IS NULL) AS bonus_null,  -- PostgreSQL: explicit NULL bucket
       SUM(bonus)                      AS sum_bonus,        -- NULLs skipped; NULL if ALL are NULL
       COALESCE(SUM(bonus), 0)         AS sum_bonus_safe,   -- 0 instead of NULL
       AVG(COALESCE(bonus, 0))         AS avg_with_zeroes,  -- NULLs treated as 0
       AVG(bonus)                      AS avg_skipping_null -- NULLs excluded from denominator
FROM employee
GROUP BY department_id;

-- The AVG trap: with bonuses 10, NULL, 20 —
-- AVG(bonus) = 15 (denominator 2), AVG(COALESCE(bonus,0)) = 10 (denominator 3).
-- Both are "correct"; the question is what NULL means to the business.
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **`AVG` denominator:** NULLs are excluded — `AVG(col)` is `SUM(col)/COUNT(col)`, not `SUM(col)/COUNT(*)`.
- **All-NULL group:** `SUM`/`AVG` → NULL; `COUNT(col)` → 0; `COUNT(*)` → row count. `COALESCE` the aggregate to get 0.
- **Empty table:** aggregates over zero rows → NULL (except `COUNT`, which is 0).
- **`GROUP BY` with NULLs:** all NULL rows form one group — label it (`COALESCE(col, 'unknown')`) for readability.
- **Ties:** not applicable.
- **Grain:** one row per group; the output is a set of scalars, no fan-out.

</details>

---

### Q59. ACID Transaction Query

> **Prompt:** Write a query for "ACID transaction query". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Transactions | **Difficulty:** medium

**Question to answer:** Explain ACID and write a transaction that demonstrates it — e.g., a money transfer that must be atomic (two updates, no partial application).

<details>
<summary><b>Hint</b></summary>

ACID = **Atomicity** (all-or-nothing), **Consistency** (constraints hold before and after), **Isolation** (concurrent transactions don't see each other's partial work), **Durability** (committed data survives crashes). Demonstrate with a `BEGIN; ... COMMIT;` block that does two dependent writes — a fund transfer — where a failure in the second write must roll back the first. Wrap the transfer in a stored procedure with `BEGIN/EXCEPTION/COMMIT/ROLLBACK` (or `SAVEPOINT`) for the rollback story. Add a `CHECK (balance >= 0)` to make consistency enforceable.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
CREATE TABLE accounts (
    id      INT PRIMARY KEY,
    owner   VARCHAR(50),
    balance NUMERIC(12,2) CHECK (balance >= 0)   -- consistency is enforced, not just hoped for
);

-- Atomic transfer: both updates succeed or neither does.
BEGIN;
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;
    -- If the next statement fails (e.g., CHECK violation, or a deliberate error),
    -- the entire block rolls back — no partial transfer.
    UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- With explicit error handling (PostgreSQL DO block / procedure):
DO $$
BEGIN
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;
    UPDATE accounts SET balance = balance + 100 WHERE id = 2;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'account missing';      -- triggers rollback of both updates
    END IF;
EXCEPTION WHEN OTHERS THEN
    ROLLBACK;                                   -- explicit rollback (implicit on error anyway)
    RAISE;
END $$;

-- Debugging isolation: BEGIN ISOLATION LEVEL READ COMMITTED; ... ; ROLLBACK;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Missing account:** `UPDATE` affects 0 rows silently — use `GET DIAGNOSTICS`/`ROW_COUNT` or a `SELECT ... FOR UPDATE` first to raise on absence.
- **CHECK violation mid-transfer** (balance would go negative): statement errors → transaction aborted → everything rolls back — that's atomicity doing its job.
- **Concurrent transfers on the same account:** without locking, two transfers can interleave — `SELECT ... FOR UPDATE` on the row serializes them.
- **Durability:** `COMMIT` (or `SYNC`-level fsync settings) makes the change survive a crash; `ROLLBACK` discards.
- **DDL vs DML:** DDL is transactional in PostgreSQL but auto-commits in MySQL — state the dialect caveat.
- **Grain:** the transaction works on row-level changes; no query grain changes unless you add a `RETURNING` clause.

</details>

---

### Q60. Isolation Level Query Behavior

> **Prompt:** Write a query for "Isolation level query behavior". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Transactions | **Difficulty:** medium

**Question to answer:** Explain the four standard isolation levels, the anomalies each prevents, and how to set the level per transaction.

<details>
<summary><b>Hint</b></summary>

The four levels (weakest → strongest) and what they _don't_ prevent:

1. **READ UNCOMMITTED** — allows **dirty reads** (sees uncommitted data). Most DBs (PostgreSQL) don't really implement it — they read committed anyway.
2. **READ COMMITTED** — prevents dirty reads; allows **non-repeatable reads** (same row read twice in one transaction can change) and **phantoms**.
3. **REPEATABLE READ** — prevents non-repeatable reads; allows **phantoms** (new rows appearing in a second scan). PostgreSQL's Repeatable Read also prevents most phantoms via snapshot isolation.
4. **SERIALIZABLE** — prevents everything: reads behave as if transactions ran one at a time.

The classic demo: two sessions, one transaction holds a row lock/update, the other attempts a read/update — show which level blocks or sees stale data. Command: `SET TRANSACTION ISOLATION LEVEL READ COMMITTED;` inside a transaction.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Setting the level per transaction (PostgreSQL):
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT * FROM accounts WHERE id = 1;    -- repeat this read after another session updates it:
                                        --  SERIALIZABLE -> same snapshot; READ COMMITTED -> new value
COMMIT;

-- Session-level default:
SET DEFAULT_TRANSACTION_ISOLATION TO 'repeatable read';   -- PostgreSQL
-- SQL Server: SET TRANSACTION ISOLATION LEVEL SNAPSHOT; / READ COMMITTED SNAPSHOT (database option)
-- MySQL: SET TRANSACTION ISOLATION LEVEL REPEATABLE READ; (its default)

-- Demonstrating the anomalies matrix (anomaly -> which level allows it):
-- dirty read        : prevented at READ COMMITTED and above
-- non-repeatable    : prevented at REPEATABLE READ and above
-- phantom           : prevented at SERIALIZABLE (and effectively in PG REPEATABLE READ)
-- write skew        : only SERIALIZABLE fully prevents it (e.g., two rows, each txn
--                     checks both then updates one — no classic lock conflict)
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Dialect defaults differ:** MySQL defaults to REPEATABLE READ; PostgreSQL and SQL Server to READ COMMITTED — always state the default.
- **PostgreSQL's Repeatable Read** uses snapshot isolation, so it also prevents phantoms (a serializable anomaly mostly gone) — saying "PG repeatable allows phantoms" is technically wrong there.
- **Write skew:** the classic case only SERIALIZABLE handles without extra locking; REPEATABLE READ can produce it (two transactions each read the other's target row, both write) — good depth for an interview.
- **Deadlocks:** higher isolation → more lock contention → more deadlocks; the DB resolves by aborting one transaction (retry in app code).
- **Grain:** isolation governs _visibility_, not row grain — the queries themselves are unchanged.

</details>

---

### Q61. Index for a Composite Filter

> **Prompt:** Write a query for "Index for a composite filter". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Optimization | **Difficulty:** medium

**Question to answer:** Design the optimal index(es) for a query filtering on `(department_id, salary)` — and explain column order.

<details>
<summary><b>Hint</b></summary>

Column order in a composite index follows the **leftmost-prefix rule**: an index on `(a, b)` serves `WHERE a = ?`, `WHERE a = ? AND b = ?`, and `WHERE a = ? ORDER BY b`, but _not_ `WHERE b = ?` alone. For `WHERE department_id = ? AND salary > ?`, put the **equality** column first, the **range** column second: `CREATE INDEX ... ON employee (department_id, salary)`. If the query also sorts by `salary DESC`, matching the index direction can avoid a sort.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- The target query:
SELECT id, name, salary
FROM employee
WHERE department_id = 10
  AND salary > 90000
ORDER BY salary DESC;

-- Optimal index: equality column first, then the range column.
-- The index serves the filter AND lets the DB walk salary DESC without a sort.
CREATE INDEX idx_emp_dept_salary
    ON employee (department_id, salary DESC);

-- Why NOT (salary, department_id): filtering on department_id alone would
-- still be indexable (prefix), but the query above needs department_id = ?
-- to drive — and (salary, department_id) can't skip to a department quickly.

-- Check the plan to confirm index use:
EXPLAIN ANALYZE
SELECT id, name, salary
FROM employee
WHERE department_id = 10 AND salary > 90000;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Another query filters only on `salary`:** the composite index can't help — add a separate `(salary)` index if that query matters.
- **Range on the first column:** `WHERE salary > 90000 AND department_id = 10` — the planner can still use the index but less efficiently; write the predicate order to match the index shape where possible.
- **Index-only scans:** if only `department_id`/`salary` are selected, a covering index avoids table lookups — mention `INCLUDE (name)` (PostgreSQL) for that.
- **Cardinality:** a low-cardinality first column (e.g., 3 departments) may lead the planner to a Seq Scan anyway — verify with `EXPLAIN`.
- **NULLs:** `IS NULL` predicates benefit less from standard B-tree indexes; partial indexes (`WHERE department_id IS NOT NULL`) are an option.
- **Grain:** indexes don't change query grain — they change the plan.

</details>

---

### Q62. Sargable Date Filtering

> **Prompt:** Write a query for "Sargable date filtering". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Optimization | **Difficulty:** medium

**Question to answer:** Explain why wrapping a column in a function breaks index use ("non-sargable"), and rewrite a date filter to be sargable.

<details>
<summary><b>Hint</b></summary>

**Sargable** (Search ARGument ABLE): the predicate can use an index. `WHERE DATE(created_at) = '2026-01-01'` is **non-sargable** — the function must run on every row before comparison, so the index on `created_at` can't be used. The sargable rewrite turns the _column_ into a **range**: `WHERE created_at >= '2026-01-01' AND created_at < '2026-01-02'`. Half-open ranges (`>=` and `<`) are the standard idiom — they're inclusive of the whole day and don't skip midnight.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Non-sargable: function on the column -> index on created_at is unusable.
SELECT COUNT(*)
FROM orders
WHERE DATE(created_at) = '2026-01-01';

-- Sargable: a half-open range on the bare column -> index-friendly.
SELECT COUNT(*)
FROM orders
WHERE created_at >= '2026-01-01'
  AND created_at <  '2026-01-02';

-- Same idea for months:
-- Bad:  WHERE EXTRACT(MONTH FROM created_at) = 1
-- Good: WHERE created_at >= '2026-01-01' AND created_at < '2026-02-01'

-- Verify the plan difference:
EXPLAIN ANALYZE
SELECT COUNT(*)
FROM orders
WHERE created_at >= '2026-01-01' AND created_at < '2026-01-02';
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **`BETWEEN '2026-01-01' AND '2026-01-02'`** includes `2026-01-02 00:00:00` — a subtle off-by-one; prefer the half-open form when the column has time components.
- **Function-based indexes** (PostgreSQL `CREATE INDEX ... ON orders ((DATE(created_at)))`) can rescue a non-sargable pattern if you can't change the query — mention as an alternative.
- **Casting the _literal_, not the column:** `created_at = CAST('2026-01-01' AS DATE)` is sargable — the column stays bare; casts on literals are fine.
- **Time zones:** if `created_at` is `TIMESTAMPTZ`, the day boundary depends on the session zone — be explicit about which "midnight" you mean.
- **Grain:** filtering doesn't change grain — it changes which rows survive.

</details>

---

### Q63. EXPLAIN vs EXPLAIN ANALYZE

> **Prompt:** Write a query for "EXPLAIN vs EXPLAIN ANALYZE". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Optimization | **Difficulty:** medium

**Question to answer:** Explain the difference between `EXPLAIN` and `EXPLAIN ANALYZE`, and how to read a plan to find the bottleneck.

<details>
<summary><b>Hint</b></summary>

- **`EXPLAIN`** shows the **estimated** plan — node types, estimated rows, estimated costs — _without running the query_. Cost units are arbitrary but comparable; it's safe on any query (including writes, which it doesn't execute).
- **`EXPLAIN ANALYZE`** **executes** the query and shows **actual** rows, actual times, and per-node timings. The classic diagnostic: compare _estimated_ rows vs _actual_ rows — a big mismatch means stale statistics (run `ANALYZE`) or a bad estimate.
- Read bottom-up: the leaf nodes (scans) feed the top (join/aggregate). The `Seq Scan` (vs `Index Scan`), `Nested Loop` (vs `Hash Join`), and the node with the highest `actual time` are where you look first.

</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Estimate only — safe on writes too (does NOT execute).
EXPLAIN
UPDATE orders SET status = 'shipped' WHERE id = 42;

-- Estimate + actuals — executes the query (or runs the write!). Use on SELECTs for diagnosis.
EXPLAIN ANALYZE
SELECT o.id, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.created_at >= '2026-01-01' AND o.created_at < '2026-02-01';

-- Example plan fragment (PostgreSQL):
-- Hash Join  (cost=120.5..3400.2 rows=9800 actual rows=12000 ...)
--   -> Seq Scan on orders o  (cost=... rows=20000 actual rows=25000 ...)
--       Filter: (created_at >= ...)          <-- Seq Scan + Filter = index missing / not used
--   -> Hash  (cost=... rows=5000 actual rows=5200 ...)
--       -> Seq Scan on customers c

-- Reading it: actual rows >> estimated => stale stats (ANALYZE) or a bad predicate;
-- Seq Scan on a large table with a WHERE => consider an index (see Q61/Q62).
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **`EXPLAIN ANALYZE` on writes executes them** — run inside a transaction with `ROLLBACK` if you just want the plan (PostgreSQL lets you `BEGIN; EXPLAIN ANALYZE <write>; ROLLBACK;`).
- **Nested Loop vs Hash Join:** high row counts under a nested loop often signal a missing join index; hash joins are usually fine at moderate sizes.
- **Cost units are not seconds:** costs are arbitrary weighted units — compare plans relatively, not absolutely.
- **Buffers:** `EXPLAIN (ANALYZE, BUFFERS)` (PostgreSQL) shows cache hits vs disk reads — the memory/hot-cache story.
- **Parameterized queries:** plans for literal values differ from prepared statements — test with the real parameter values.
- **Grain:** plans describe row flow, not just final grain — the row counts per node are the diagnosis.

</details>

---

### Q64. Normalize a Sales Schema

> **Prompt:** Write a query for "Normalize a sales schema". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Schema design | **Difficulty:** medium

**Question to answer:** Take a denormalized sales table and normalize it to 3NF, explaining the rules you applied.

<details>
<summary><b>Hint</b></summary>

Normal forms to apply, in order:

- **1NF:** atomic values, no repeating groups (a `products` column containing "A,B,C" is a violation).
- **2NF:** no partial dependencies — non-key columns must depend on the _whole_ composite key, not part of it. A row keyed by `(order_id, product_id)` with `customer_name` depends only on `order_id` → violates 2NF.
- **3NF:** no transitive dependencies — a non-key column depending on another non-key column (e.g., `customer_name` → `customer_city`) violates 3NF.

The normalizing move: split one table into `customers`, `products`, `orders`, `order_items`, each with a proper key; move the transitive facts to the table whose key they belong to. Grain: each table gets a crisp, single grain.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- DENORMALIZED source (grain: one row per order line, with repeated customer/product data):
CREATE TABLE sales_denormalized (
    order_id      INT,
    order_date    DATE,
    customer_name VARCHAR(100),
    customer_city VARCHAR(50),
    product_name  VARCHAR(100),
    category      VARCHAR(50),
    quantity      INT,
    unit_price    NUMERIC(10,2)
);

-- NORMALIZED (3NF) target:
-- customers: 1 row per customer (grain: customer) — no transitive deps.
CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    name        VARCHAR(100),
    city        VARCHAR(50)
);

-- products: 1 row per product (grain: product).
CREATE TABLE products (
    product_id  INT PRIMARY KEY,
    name        VARCHAR(100),
    category    VARCHAR(50)
);

-- orders: 1 row per order (grain: order) — order-level facts only.
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    order_date  DATE,
    customer_id INT REFERENCES customers(customer_id)
);

-- order_items: 1 row per (order, product) line (grain: line item) —
-- quantity/price depend on the full composite key.
CREATE TABLE order_items (
    order_id   INT REFERENCES orders(order_id),
    product_id INT REFERENCES products(product_id),
    quantity   INT,
    unit_price NUMERIC(10,2),
    PRIMARY KEY (order_id, product_id)
);
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Trade-offs (denormalization on purpose):** star schemas (Q65) and read-heavy analytics often denormalize for fewer joins — "normalize for writes, denormalize for reads" is the honest summary.
- **Surrogate vs natural keys:** choose stable identifiers (auto-increment ids) so renaming a customer doesn't cascade.
- **Referential integrity:** add FKs so orphans can't appear (the denormalized table could have them freely).
- **Data migration:** `INSERT ... SELECT DISTINCT` into the dimension tables first, then the fact table by joining back — the grain changes are the whole job.
- **Ties/duplicates:** a duplicate order line would break the `PRIMARY KEY (order_id, product_id)` — dedupe before loading.

</details>

---

### Q65. Design a Star Schema

> **Prompt:** Write a query for "Design a star schema". State the grain of each intermediate result and handle duplicates, NULLs, and ties.
>
> **Companies:** Amazon · Google | **Importance:** 9/10 | **Confidence:** 9/10 | **Category:** Analytics / schema design | **Difficulty:** medium

**Question to answer:** Design a **star schema** for retail sales analytics — dimension tables around a central fact table — and justify the grain.

<details>
<summary><b>Hint</b></summary>

Star schema anatomy:

- **Fact table:** the measurements, one row per business event at a declared **grain** (e.g., one row per line item) — foreign keys to every dimension + numeric measures (`quantity`, `amount`). Grain must be stated and consistent, or aggregates double-count.
- **Dimensions:** descriptive, denormalized-by-design lookup tables (`date`, `customer`, `product`, `store`) — each one row per entity, with `type 2` slowly-changing-dimension (SCD) columns (`valid_from`, `valid_to`) if history matters.

Design order: choose the fact grain first, then dimensions that match it, then measures. A **snowflake** is the same but with normalized (sub-)dimensions — the star trades a few joins for fewer tables.
</details>

<details>
<summary><b>Solution</b></summary>

```sql
-- Fact table — GRAIN: one row per order line item (order_id, product_id).
CREATE TABLE fact_sales (
    order_id    INT NOT NULL,
    line_no     INT NOT NULL,
    date_key    INT NOT NULL REFERENCES dim_date(date_key),
    customer_key INT NOT NULL REFERENCES dim_customer(customer_key),
    product_key INT NOT NULL REFERENCES dim_product(product_key),
    store_key   INT NOT NULL REFERENCES dim_store(store_key),
    quantity    INT,
    unit_price  NUMERIC(10,2),
    amount      NUMERIC(12,2),          -- quantity * unit_price, precomputed
    PRIMARY KEY (order_id, line_no)     -- enforces the grain
);

-- Dimension: date — 1 row per calendar day (grain: day).
CREATE TABLE dim_date (
    date_key    INT PRIMARY KEY,        -- e.g., 20260101
    full_date   DATE,
    year        INT, month INT, day INT,
    quarter     INT,
    is_weekend  BOOLEAN
);

-- Dimension: customer — 1 row per customer; SCD type 2 columns for history.
CREATE TABLE dim_customer (
    customer_key INT PRIMARY KEY,
    customer_id  INT,                   -- natural id
    name         VARCHAR(100),
    city         VARCHAR(50),
    valid_from   DATE,
    valid_to     DATE                   -- NULL = current version
);

-- Dimensions: product, store — same shape: 1 row per entity.
CREATE TABLE dim_product (product_key INT PRIMARY KEY, name VARCHAR(100), category VARCHAR(50));
CREATE TABLE dim_store   (store_key   INT PRIMARY KEY, name VARCHAR(100), region   VARCHAR(50));

-- The payoff — clean aggregation at a known grain (one row per store-month):
SELECT s.region, d.year, d.month,
       SUM(f.amount) AS revenue,
       COUNT(DISTINCT f.customer_key) AS distinct_customers
FROM fact_sales f
JOIN dim_date d     ON d.date_key = f.date_key
JOIN dim_store s    ON s.store_key = f.store_key
GROUP BY s.region, d.year, d.month;
```

</details>

<details>
<summary><b>Edge cases</b></summary>

- **Grain drift:** if two rows can describe the same line item, `SUM` double-counts — the PK enforces the declared grain; never load duplicates.
- **Degenerate dimensions:** `order_id` lives in the fact as an attribute with no dimension table — common and fine (transaction-level facts).
- **SCD type 1 vs 2:** overwrite vs version — pick per business need; type 2 preserves history at the cost of more rows.
- **Conformed dimensions:** the same `dim_date` reused across multiple fact tables — the reason star schemas scale to whole warehouses.
- **Additive vs semi-additive measures:** `amount` sums across all dimensions; balances/rates do not — state which measures are safe to `SUM`.
- **Ties/NULLs in facts:** `COUNT(DISTINCT customer_key)` vs `COUNT(*)` changes meaning with NULL keys — keep dimension keys NOT NULL (the schema above does).

</details>
