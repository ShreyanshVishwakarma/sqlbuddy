WITH first_logins AS (
    SELECT player_id, MIN(event_date) AS first_date
    FROM activity
    GROUP BY player_id
),
players AS (
    SELECT DISTINCT player_id
    FROM activity
),
returned AS (
    SELECT DISTINCT f.player_id
    FROM first_logins f
    JOIN activity a
      ON a.player_id = f.player_id
     AND julianday(a.event_date) - julianday(f.first_date) = 1
)
SELECT ROUND(
           1.0 * (SELECT COUNT(*) FROM returned) /
           (SELECT COUNT(*) FROM players),
           2
       ) AS fraction
FROM players
LIMIT 1;
