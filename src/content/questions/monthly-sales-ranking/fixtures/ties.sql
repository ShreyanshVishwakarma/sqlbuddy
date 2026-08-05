INSERT INTO sales (id, salesperson, month, amount) VALUES
  (1,  'Alice', '2024-01-10', 100),
  (2,  'Bob',   '2024-01-12', 100),  -- tied with Alice for January
  (3,  'Carol', '2024-01-20', 100),  -- three-way tie
  (4,  'Dave',  '2024-01-25', 50),
  (5,  'Alice', '2024-02-05', 90),
  (6,  'Bob',   '2024-02-08', 90);   -- tied for February
