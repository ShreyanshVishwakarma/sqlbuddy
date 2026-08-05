INSERT INTO events (event_id, user_id, event_time, event_type) VALUES
  (1, 1, '2024-01-02 09:30:00', 'view'),
  (2, 1, '2024-01-02 09:30:00', 'click'),  -- tied: higher event_id wins
  (3, 1, '2024-01-02 09:30:00', 'purchase'),
  (4, 2, '2024-01-01 08:00:00', 'view'),
  (5, 2, '2024-01-01 08:00:00', 'click');  -- tied for user 2
