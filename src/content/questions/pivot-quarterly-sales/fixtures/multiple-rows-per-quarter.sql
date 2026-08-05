INSERT INTO sales (year, quarter, revenue) VALUES
  (2023, 1, 100),
  (2023, 1, 50),        -- two rows in Q1 2023: sums to 150
  (2023, 2, 30),
  (2023, 3, NULL),      -- NULL revenue: column stays NULL
  (2024, 1, 80),
  (2024, 2, 20),
  (2024, 3, 40),
  (2024, 4, 60);
