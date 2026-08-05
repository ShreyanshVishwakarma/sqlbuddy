INSERT INTO orders (id, customer_id, order_date, amount) VALUES
  (1, 1, '2024-01-10', 50),
  (2, 1, '2024-01-10', 30),   -- same date: id 1 is first
  (3, 1, '2024-01-10', 20),   -- same date: id 3 is last
  (4, 2, '2024-02-01', 90),
  (5, 2, '2024-02-01', 40);   -- same date for customer 2
