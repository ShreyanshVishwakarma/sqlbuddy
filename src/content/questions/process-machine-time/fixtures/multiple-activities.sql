INSERT INTO activity (machine_id, process_id, activity_type, timestamp) VALUES
  (0, 0, 'start', 0.000),
  (0, 0, 'end',   1.000),
  (0, 1, 'start', 1.500),
  (0, 1, 'end',   3.500),
  (0, 2, 'start', 4.000),
  (0, 2, 'end',   4.250),   -- three processes on machine 0
  (1, 0, 'start', 0.500),
  (1, 0, 'end',   2.500),
  (1, 1, 'start', 3.000),
  (1, 1, 'end',   5.000);   -- two processes on machine 1
