-- Reference: average process duration per machine (start/end self join).
SELECT s.machine_id,
       ROUND(AVG(e.timestamp - s.timestamp), 3) AS processing_time
FROM activity s
JOIN activity e
  ON e.machine_id = s.machine_id
 AND e.process_id = s.process_id
 AND e.activity_type = 'end'
WHERE s.activity_type = 'start'
GROUP BY s.machine_id
ORDER BY s.machine_id;
