-- Reference: distinct numbers appearing in at least three consecutive rows.
SELECT DISTINCT num AS consecutive_num
FROM (
    SELECT num,
           LAG(num, 1) OVER (ORDER BY id) AS prev1,
           LAG(num, 2) OVER (ORDER BY id) AS prev2
    FROM logs
) t
WHERE num = prev1 AND num = prev2
ORDER BY num;
