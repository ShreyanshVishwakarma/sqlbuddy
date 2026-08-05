WITH process_times AS (
    SELECT s.machine_id,
           e.timestamp - s.timestamp AS processing_time
    FROM activity s
    JOIN activity e
      ON e.machine_id = s.machine_id
     AND e.process_id = s.process_id
     AND e.activity_type = 'end'
    WHERE s.activity_type = 'start'
)
SELECT machine_id,
       ROUND(AVG(processing_time), 3) AS processing_time
FROM process_times
GROUP BY machine_id
ORDER BY machine_id;
