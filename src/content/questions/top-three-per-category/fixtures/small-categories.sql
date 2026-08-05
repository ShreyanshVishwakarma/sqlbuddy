INSERT INTO category (id, name) VALUES
  (1, 'Tech'),
  (2, 'Office'),
  (3, 'Empty');

INSERT INTO product (id, name, category_id) VALUES
  (1, 'Keyboard', 1),
  (2, 'Mouse',    1),   -- only two Tech products
  (3, 'Pen',      2),
  (4, 'Notebook', 2),
  (5, 'Stapler',  2);   -- Office has three

INSERT INTO sale (id, product_id, unit_price, quantity) VALUES
  (1, 1, 100, 1),   -- Keyboard 100
  (2, 2, 60,  1),   -- Mouse     60
  (3, 3, 50,  1),   -- Pen       50
  (4, 4, 40,  1),   -- Notebook  40
  (5, 5, 20,  1);   -- Stapler   20
