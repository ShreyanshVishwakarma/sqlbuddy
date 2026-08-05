SELECT year,
       SUM(CASE WHEN quarter = 1 THEN revenue END) AS q1_revenue,
       SUM(CASE WHEN quarter = 2 THEN revenue END) AS q2_revenue,
       SUM(CASE WHEN quarter = 3 THEN revenue END) AS q3_revenue,
       SUM(CASE WHEN quarter = 4 THEN revenue END) AS q4_revenue
FROM sales
GROUP BY year
ORDER BY year;
