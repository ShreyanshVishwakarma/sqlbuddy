SELECT d.name AS department,
       CAST(ROUND(AVG(e.salary)) AS INTEGER) AS avg_salary
FROM department d
JOIN employee e ON e.department_id = d.id
GROUP BY d.id, d.name
HAVING AVG(e.salary) > (SELECT AVG(salary) FROM employee);
