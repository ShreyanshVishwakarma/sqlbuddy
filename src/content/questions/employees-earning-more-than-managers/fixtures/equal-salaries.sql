INSERT INTO employee (id, name, salary, manager_id) VALUES
  (1, 'Alice', 100, NULL),
  (2, 'Bob',   100, 1),    -- equal to Alice: excluded
  (3, 'Carol', 110, 1),
  (4, 'Dave',  80,  2),    -- less than Bob: excluded
  (5, 'Eve',   90,  2);    -- more than Bob but less than Alice
