-- Reference: one row per email appearing more than once.
SELECT email
FROM person
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY email;
