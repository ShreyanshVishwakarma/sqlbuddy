WITH ranked AS (
    SELECT customer_id, order_date, customer_pref_delivery_date,
           ROW_NUMBER() OVER (
               PARTITION BY customer_id
               ORDER BY order_date, customer_pref_delivery_date
           ) AS rn
    FROM delivery
),
first_orders AS (
    SELECT order_date, customer_pref_delivery_date
    FROM ranked
    WHERE rn = 1
)
SELECT ROUND(
           100.0 * SUM(CASE WHEN order_date = customer_pref_delivery_date THEN 1 ELSE 0 END)
           / COUNT(*),
           2
       ) AS immediate_percentage
FROM first_orders;
