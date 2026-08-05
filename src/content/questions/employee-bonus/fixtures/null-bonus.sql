INSERT INTO employee (emp_id, name, salary) VALUES
  (1, 'Alice', 100),
  (2, 'Bob',   200),
  (3, 'Carol', 300);

INSERT INTO bonus (emp_id, bonus) VALUES
  (1, 500),
  (2, NULL),   -- bonus row exists but value is NULL
  (3, 2500);   -- too large
