INSERT INTO weather (id, record_date, temperature) VALUES
  (1, '2024-01-01', 10),
  (2, '2024-01-03', 15),   -- gap: Jan 2 missing; previous recorded day is Jan 1
  (3, '2024-01-04', 15),   -- equal to previous: excluded
  (4, '2024-01-05', 12),   -- cooler: excluded
  (5, '2024-01-07', 20);   -- gap again; previous recorded day is Jan 5
