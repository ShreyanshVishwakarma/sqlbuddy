INSERT INTO logins (id, user_id, login_at) VALUES
  (1, 1, '2024-01-01'),
  (2, 1, '2024-01-02'),
  (3, 1, '2024-01-03'),   -- user 1: 3-day streak
  (4, 1, '2024-01-05'),
  (5, 2, '2024-01-01'),
  (6, 2, '2024-01-02'),   -- user 2: 2-day streak
  (7, 3, '2024-01-10');   -- user 3: 1 day
