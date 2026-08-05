INSERT INTO employee (id, name, salary, manager_id) VALUES
  (1, 'Alice', 100, NULL),
  (2, 'Bob',   120, 999),  -- dangling manager: cannot qualify
  (3, 'Carol', 80,  1),
  (4, 'Dave',  90,  1),
  (5, 'Eve',   70,  3);    -- less than Carol
