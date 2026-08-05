-- Reference: longest consecutive-day run per user.
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
           date(login_at, '-' || rn || ' days') AS grp,
           COUNT(*) AS streak_len
    FROM numbered
    GROUP BY user_id, date(login_at, '-' || rn || ' days')
)
SELECT user_id, MAX(streak_len) AS longest_streak
FROM islands
GROUP BY user_id
ORDER BY user_id;
