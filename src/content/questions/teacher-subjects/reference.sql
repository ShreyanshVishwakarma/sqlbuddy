-- Reference: distinct subjects per teacher.
SELECT teacher_id, COUNT(DISTINCT subject_id) AS cnt
FROM teacher
GROUP BY teacher_id
ORDER BY teacher_id;
