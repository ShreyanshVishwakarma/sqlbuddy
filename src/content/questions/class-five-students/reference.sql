-- Reference: classes with at least five enrollments.
SELECT class
FROM courses
GROUP BY class
HAVING COUNT(*) >= 5
ORDER BY class;
