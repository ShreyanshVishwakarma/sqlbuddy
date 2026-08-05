INSERT INTO person (id, email) VALUES
  (1, 'a@example.com'),
  (2, 'a@example.com'),
  (3, 'a@example.com'),  -- appears three times
  (4, NULL),             -- NULL is not an email
  (5, 'b@example.com'),
  (6, NULL),
  (7, 'c@example.com'),
  (8, 'c@example.com');
