INSERT INTO activity (user_id, event_date, event_type) VALUES
  (1, '2024-01-01', 'view'),
  (1, '2024-01-01', 'click'),
  (1, '2024-01-01', 'hover'),
  (1, '2024-01-01', 'scroll'),  -- user 1: 4 events, counts once
  (2, '2024-01-01', 'view'),
  (2, '2024-01-02', 'view'),
  (3, '2024-01-02', 'view'),
  (3, '2024-01-02', 'click');
