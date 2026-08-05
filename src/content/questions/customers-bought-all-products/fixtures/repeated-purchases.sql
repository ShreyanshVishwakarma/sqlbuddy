INSERT INTO product (product_key) VALUES (1), (2), (3);

INSERT INTO customer (customer_id, product_key) VALUES
  (10, 1),
  (10, 1),
  (10, 2),
  (10, 3),   -- bought all three (one twice)
  (20, 1),
  (20, 2);   -- missing product 3
