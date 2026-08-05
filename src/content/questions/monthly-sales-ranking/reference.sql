-- Reference: one row per (salesperson, month) with a dense per-month rank.
WITH monthly AS (
    SELECT salesperson,
           strftime('%Y-%m', month) AS month,
           SUM(amount) AS total
    FROM sales
    GROUP BY salesperson, strftime('%Y-%m', month)
)
SELECT salesperson, month,
       DENSE_RANK() OVER (PARTITION BY month ORDER BY total DESC) AS rank
FROM monthly
ORDER BY month, rank, salesperson;
