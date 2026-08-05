SELECT e.name, b.bonus
FROM employee e
LEFT JOIN bonus b ON b.emp_id = e.emp_id
WHERE b.bonus < 1000 OR b.bonus IS NULL;
