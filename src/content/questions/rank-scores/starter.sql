SELECT id, score,
       DENSE_RANK() OVER (ORDER BY score DESC) AS rank
FROM scores
WHERE score IS NOT NULL
ORDER BY rank, id;
