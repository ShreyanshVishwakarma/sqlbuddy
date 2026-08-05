INSERT INTO products (product_id, low_fats, recyclable) VALUES
  (1, 'Y', NULL),   -- unknown recyclable
  (2, NULL, 'Y'),   -- unknown low fat
  (3, 'Y', 'Y'),
  (4, NULL, NULL),  -- both unknown
  (5, 'Y', 'N');
