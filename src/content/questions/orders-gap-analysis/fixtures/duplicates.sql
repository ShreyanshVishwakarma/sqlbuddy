INSERT INTO orders (id, customer_id, order_date) VALUES
  (1, 1, '2024-01-10'),
  (2, 1, '2024-01-10'),   -- same-day orders: gap of 0
  (3, 1, '2024-01-15'),
  (4, 2, '2024-02-01'),
  (5, 2, '2024-02-01');   -- another same-day pair for customer 2
