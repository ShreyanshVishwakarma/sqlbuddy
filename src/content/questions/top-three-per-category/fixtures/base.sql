INSERT INTO category (id, name) VALUES
  (1, 'Tech'),
  (2, 'Office'),
  (3, 'Furniture');

INSERT INTO product (id, name, category_id) VALUES
  (1, 'Keyboard', 1),
  (2, 'Mouse',    1),
  (3, 'Monitor',  1),
  (4, 'Chair',    3),
  (5, 'Desk',     3),
  (6, 'Lamp',     3),
  (7, 'Pen',      2),
  (8, 'Notebook', 2),
  (9, 'Stapler',  2);

INSERT INTO sale (id, product_id, unit_price, quantity) VALUES
  (1,  1, 50, 2),    -- Keyboard 100
  (2,  1, 50, 1),    -- Keyboard 50
  (3,  2, 25, 4),    -- Mouse    100
  (4,  3, 200, 1),   -- Monitor  200
  (5,  4, 150, 2),   -- Chair    300
  (6,  5, 250, 1),   -- Desk     250
  (7,  6, 30,  1),   -- Lamp     30
  (8,  7, 2,   50),  -- Pen      100
  (9,  8, 4,   20),  -- Notebook 80
  (10, 9, 8,   5);   -- Stapler  40
