INSERT INTO weather (id, record_date, temperature) VALUES
  (1, '2024-01-01', 10),
  (2, '2024-01-02', NULL),  -- NULL reading
  (3, '2024-01-03', 15),    -- previous is NULL: cannot compare
  (4, '2024-01-04', NULL),  -- NULL reading
  (5, '2024-01-05', 25);    -- previous is NULL: cannot compare
