INSERT INTO category (id, name) VALUES
  (1, 'Tech'),
  (2, 'Office');

INSERT INTO product (id, name, category_id) VALUES
  (1, 'Keyboard', 1),
  (2, 'Mouse',    1),
  (3, 'Screen',   1),
  (4, 'Webcam',   1),   -- ties with Screen at third place
  (5, 'Pen',      2),
  (6, 'Notebook', 2),
  (7, 'Stapler',  2),
  (8, 'Desk',     2);   -- ties with Stapler at third place

INSERT INTO sale (id, product_id, unit_price, quantity) VALUES
  (1, 1, 100, 1),   -- Keyboard 100
  (2, 2, 60,  1),   -- Mouse     60
  (3, 3, 30,  1),   -- Screen    30
  (4, 4, 30,  1),   -- Webcam    30  (tie for 3rd)
  (5, 5, 50,  1),   -- Pen       50
  (6, 6, 40,  1),   -- Notebook  40
  (7, 7, 20,  1),   -- Stapler   20
  (8, 8, 20,  1);   -- Desk      20  (tie for 3rd)
