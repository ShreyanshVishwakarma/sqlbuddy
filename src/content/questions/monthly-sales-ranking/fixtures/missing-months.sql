INSERT INTO sales (id, salesperson, month, amount) VALUES
  (1,  'Alice', '2024-01-10', 100),
  (2,  'Alice', '2024-02-05', 50),   -- Alice skips March entirely
  (3,  'Bob',   '2024-01-12', 80),
  (4,  'Bob',   '2024-03-11', 70),   -- Bob skips February
  (5,  'Carol', '2024-03-01', NULL); -- NULL amount: contributes nothing
