INSERT INTO orders (id, customer_id, order_date) VALUES
  (1, 1, '2024-01-10'),
  (2, 1, NULL),           -- unknown date: gap must be NULL
  (3, 1, '2024-02-01'),
  (4, 2, '2024-03-05');   -- single order for customer 2: gap is NULL
