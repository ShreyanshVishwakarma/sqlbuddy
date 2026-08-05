INSERT INTO teacher (teacher_id, subject_id, dept_id) VALUES
  (1, 2, 3),
  (1, 2, 3),   -- exact duplicate row
  (1, 2, 4),   -- same subject, different dept: still counts once
  (1, 3, 3),
  (2, 5, 1),
  (2, 5, 2),
  (2, 5, 2);   -- duplicate again
