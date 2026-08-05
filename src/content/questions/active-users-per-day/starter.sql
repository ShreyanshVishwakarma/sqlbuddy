SELECT event_date, COUNT(DISTINCT user_id) AS active_users
FROM activity
GROUP BY event_date
ORDER BY event_date;
