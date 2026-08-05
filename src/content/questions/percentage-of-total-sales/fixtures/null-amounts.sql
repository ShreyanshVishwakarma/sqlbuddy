INSERT INTO sales (id, region, amount) VALUES
  (1, 'North', 100),
  (2, 'North', NULL),   -- ignored by SUM
  (3, 'North', 100),
  (4, 'South', NULL),   -- region total is NULL -> excluded
  (5, 'South', NULL),
  (6, 'East',  200);
