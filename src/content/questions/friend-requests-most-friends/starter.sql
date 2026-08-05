WITH all_users AS (
    SELECT requester_id AS id FROM request_accepted
    UNION ALL
    SELECT accepter_id AS id FROM request_accepted
),
counts AS (
    SELECT id, COUNT(*) AS num
    FROM all_users
    GROUP BY id
)
SELECT id, num
FROM counts
WHERE num = (SELECT MAX(num) FROM counts)
ORDER BY id;
