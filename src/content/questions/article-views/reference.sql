-- Reference: distinct authors who viewed their own article, ordered by id.
SELECT DISTINCT author_id AS id
FROM views
WHERE author_id = viewer_id
ORDER BY id;
