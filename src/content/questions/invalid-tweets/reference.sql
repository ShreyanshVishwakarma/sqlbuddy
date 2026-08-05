-- Reference: tweets longer than 15 characters.
SELECT tweet_id
FROM tweets
WHERE LENGTH(content) > 15
ORDER BY tweet_id;
