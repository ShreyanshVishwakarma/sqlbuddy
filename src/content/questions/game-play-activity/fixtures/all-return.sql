INSERT INTO activity (player_id, device_id, event_date, games_played) VALUES
  (1, 2, '2024-03-01', 5),
  (1, 2, '2024-03-02', 6),
  (2, 3, '2024-03-02', 1),
  (2, 3, '2024-03-03', 2),   -- returns next day
  (3, 1, '2024-03-04', 0),
  (3, 1, '2024-03-05', 0);   -- returns next day
