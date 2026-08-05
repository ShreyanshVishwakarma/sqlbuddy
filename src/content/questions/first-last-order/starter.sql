WITH ranked AS (
    SELECT customer_id, order_date,
           ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, id) AS rn_asc,
           ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, id DESC) AS rn_desc
    FROM orders
)
SELECT customer_id,
       MAX(CASE WHEN rn_asc = 1 THEN order_date END) AS first_order_date,
       MAX(CASE WHEN rn_desc = 1 THEN order_date END) AS last_order_date
FROM ranked
GROUP BY customer_id
ORDER BY customer_id;
