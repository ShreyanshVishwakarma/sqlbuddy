WITH ranked AS (
    SELECT user_id, event_time, event_type,
           ROW_NUMBER() OVER (
               PARTITION BY user_id
               ORDER BY event_time DESC, event_id DESC
           ) AS rn
    FROM events
)
SELECT user_id, event_time, event_type
FROM ranked
WHERE rn = 1;
