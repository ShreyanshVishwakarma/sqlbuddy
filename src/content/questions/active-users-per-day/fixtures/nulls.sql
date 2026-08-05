INSERT INTO activity (user_id, event_date, event_type) VALUES
  (1, '2024-01-01', 'view'),
  (NULL, '2024-01-01', 'click'),   -- NULL user: not counted
  (2, '2024-01-01', 'view'),
  (NULL, '2024-01-02', 'view'),    -- NULL user: not counted
  (2, '2024-01-02', 'click'),
  (3, '2024-01-02', 'view');
