INSERT INTO sales (id, account_id, sale_date, amount) VALUES
  (1, 1, '2024-01-01', 100),
  (2, 1, '2024-01-02', NULL),  -- ignored by SUM
  (3, 1, '2024-01-03', 50),    -- running total stays 150
  (4, 2, '2024-01-04', NULL),
  (5, 2, '2024-01-05', 30);    -- running total is 30
