INSERT INTO sales (id, account_id, sale_date, amount) VALUES
  (1, 1, '2024-01-01', 10),
  (2, 1, '2024-01-02', NULL),  -- ignored by AVG
  (3, 1, '2024-01-03', 30),
  (4, 2, '2024-01-01', NULL),  -- window is all NULL: avg is NULL
  (5, 2, '2024-01-02', 40);
