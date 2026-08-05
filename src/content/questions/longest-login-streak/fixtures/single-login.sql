INSERT INTO logins (id, user_id, login_at) VALUES
  (1, 1, '2024-01-01'),   -- single login
  (2, 2, '2024-01-02'),
  (3, 2, '2024-01-02'),   -- duplicate same-day: still streak 1
  (4, 3, '2024-01-05'),
  (5, 3, '2024-01-06'),
  (6, 3, '2024-01-06');   -- same-day duplicate
