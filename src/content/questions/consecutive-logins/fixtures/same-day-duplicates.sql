INSERT INTO logins (id, user_id, login_at) VALUES
  (1, 1, '2024-01-01'),
  (2, 1, '2024-01-01'),   -- same-day duplicate
  (3, 1, '2024-01-02'),
  (4, 1, '2024-01-02'),   -- same-day duplicate
  (5, 1, '2024-01-03'),   -- still a 3-day streak after dedup
  (6, 2, '2024-01-01'),
  (7, 2, '2024-01-02'),
  (8, 2, '2024-01-04'),
  (9, 3, '2024-01-05'),
  (10, 3, '2024-01-06');
