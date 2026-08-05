INSERT INTO department (id, name) VALUES
  (1, 'Engineering'),
  (2, 'Sales'),
  (3, 'Marketing');

-- Exact duplicate rows: two employees named 'Alice' with the same salary
-- in the same department. Each row counts separately toward the average.
INSERT INTO employee (id, name, salary, department_id) VALUES
  (1, 'Alice',  100, 1),
  (2, 'Alice',  100, 1),
  (3, 'Bob',    60,  1),
  (4, 'Carol',  80,  2),
  (5, 'Dave',   40,  2),
  (6, 'Eve',    70,  3);
