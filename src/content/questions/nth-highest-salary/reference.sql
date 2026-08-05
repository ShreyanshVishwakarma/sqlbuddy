-- Reference: third-highest distinct salary as a single row (NULL when absent).
WITH distinct_salaries AS (
    SELECT DISTINCT salary
    FROM employee
    WHERE salary IS NOT NULL
),
ranked AS (
    SELECT salary,
           DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM distinct_salaries
)
SELECT MAX(salary) AS nth_highest_salary
FROM ranked
WHERE rnk = 3;
