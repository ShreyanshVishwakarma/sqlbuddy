INSERT INTO customers (id, name) VALUES
  (1, 'Alice'),
  (2, 'Bob'),
  (3, 'Alice'),      -- duplicate name, distinct id: both rows are separate customers
  (4, 'Dave'),
  (5, 'Eve');

INSERT INTO orders (id, customer_id) VALUES
  (1, 1),
  (2, 1),
  (3, 1),            -- Alice has many orders
  (4, 4),
  (5, NULL);         -- orphan order: belongs to nobody
