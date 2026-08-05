-- Reference: customers not referred by id 2, including those with no referee.
SELECT name
FROM customer
WHERE COALESCE(referee_id, -1) <> 2
ORDER BY id;
