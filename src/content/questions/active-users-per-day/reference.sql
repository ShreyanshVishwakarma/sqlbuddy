-- Reference: distinct active users per date with any activity.
SELECT event_date, COUNT(DISTINCT user_id) AS active_users
FROM activity
WHERE user_id IS NOT NULL
GROUP BY event_date
ORDER BY event_date;
