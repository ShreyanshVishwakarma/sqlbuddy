WITH region_totals AS (
    SELECT region, SUM(amount) AS region_total
    FROM sales
    WHERE amount IS NOT NULL
    GROUP BY region
)
SELECT region,
       ROUND(region_total * 100.0 / SUM(region_total) OVER (), 2) AS pct_of_total
FROM region_totals
ORDER BY pct_of_total DESC, region;
