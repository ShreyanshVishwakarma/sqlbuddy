WITH prev AS (
    SELECT id, num,
           LAG(num, 1) OVER (ORDER BY id) AS prev1,
           LAG(num, 2) OVER (ORDER BY id) AS prev2
    FROM logs
)
SELECT DISTINCT num AS consecutive_num
FROM prev
WHERE num = prev1 AND num = prev2;
