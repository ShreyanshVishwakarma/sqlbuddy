-- Reference: users with a run of 3+ consecutive login days (islands technique).
WITH deduped AS (
    SELECT DISTINCT user_id, login_at
    FROM logins
),
numbered AS (
    SELECT user_id, login_at,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_at) AS rn
    FROM deduped
),
islands AS (
    SELECT user_id,
           date(login_at, '-' || rn || ' days') AS grp
    FROM numbered
)
SELECT user_id, COUNT(*) AS consecutive_days
FROM islands
GROUP BY user_id, grp
HAVING COUNT(*) >= 3
ORDER BY user_id, grp;
