INSERT INTO courses (student, class) VALUES
  ('A', 'Math'),
  ('A', 'Math'),   -- duplicate enrollment row
  ('B', 'Math'),
  ('B', 'Math'),   -- duplicate enrollment row
  ('C', 'Math'),
  ('C', 'Math'),   -- duplicate: Math has 6 rows now
  ('A', 'English'),
  ('B', 'English'),
  ('C', 'English'),
  ('D', 'English');
