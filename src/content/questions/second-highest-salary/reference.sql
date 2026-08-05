-- Reference: second-highest distinct salary, ignoring NULLs, as a single row.
WITH distinct_salaries AS (
    SELECT DISTINCT salary
    FROM employee
    WHERE salary IS NOT NULL
)
SELECT MAX(salary) AS second_highest_salary
FROM distinct_salaries
WHERE salary < (SELECT MAX(salary) FROM distinct_salaries);
