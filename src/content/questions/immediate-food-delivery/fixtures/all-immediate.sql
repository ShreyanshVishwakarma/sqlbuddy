INSERT INTO delivery (delivery_id, customer_id, order_date, customer_pref_delivery_date) VALUES
  (1, 1, '2024-01-01', '2024-01-01'),
  (2, 1, '2024-01-05', '2024-01-06'),   -- later order is scheduled
  (3, 2, '2024-02-01', '2024-02-01'),
  (4, 3, '2024-03-01', '2024-03-01');
