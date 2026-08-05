INSERT INTO sales (id, account_id, sale_date, amount) VALUES
  (1, 1, '2024-01-01', 100),
  (2, 1, '2024-01-01', 50),    -- same day: id breaks the tie
  (3, 1, '2024-01-01', 25),    -- same day again
  (4, 2, '2024-01-02', 30),
  (5, 2, '2024-01-02', 20);    -- same day for account 2
