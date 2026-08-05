INSERT INTO product (product_key) VALUES (5), (6);

INSERT INTO customer (customer_id, product_key) VALUES
  (1, 5),
  (1, 6),
  (2, 5),
  (2, 5),   -- repeated purchase: still only product 5
  (3, 6);
