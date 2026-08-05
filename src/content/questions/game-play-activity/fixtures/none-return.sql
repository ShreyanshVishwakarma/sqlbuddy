INSERT INTO activity (player_id, device_id, event_date, games_played) VALUES
  (1, 2, '2024-03-01', 5),
  (1, 2, '2024-03-03', 6),   -- two days later: does not count
  (2, 3, '2024-03-02', 1),
  (3, 1, '2024-03-04', 0),
  (3, 1, '2024-03-06', 0);   -- two days later: does not count
