-- Reference: swap adjacent pairs; odd tail stays put.
SELECT s1.id,
       COALESCE(s2.student, s1.student) AS student
FROM seat s1
LEFT JOIN seat s2
  ON s2.id = CASE
                 WHEN s1.id % 2 = 1 THEN s1.id + 1
                 ELSE s1.id - 1
             END
ORDER BY s1.id;
