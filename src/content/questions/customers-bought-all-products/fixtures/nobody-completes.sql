INSERT INTO product (product_key) VALUES (5), (6), (7);

INSERT INTO customer (customer_id, product_key) VALUES
  (1, 5),
  (1, 6),    -- missing 7
  (2, 6),
  (2, 7);    -- missing 5
