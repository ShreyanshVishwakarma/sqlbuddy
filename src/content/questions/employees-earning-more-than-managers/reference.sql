-- Reference: employees strictly earning more than their direct manager.
SELECT e.name AS employee,
       e.salary AS employee_salary,
       m.name AS manager,
       m.salary AS manager_salary
FROM employee e
JOIN employee m ON m.id = e.manager_id
WHERE e.salary > m.salary
ORDER BY e.id;
