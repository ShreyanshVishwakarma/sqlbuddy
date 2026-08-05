WITH prev AS (
    SELECT id, record_date, temperature,
           LAG(temperature) OVER (ORDER BY record_date) AS prev_temp
    FROM weather
)
SELECT id
FROM prev
WHERE temperature > prev_temp;
