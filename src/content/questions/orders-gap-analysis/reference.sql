-- Reference: gap in days since the customer's previous order, NULL when first/unknown.
WITH ordered AS (
    SELECT id, customer_id, order_date,
           LAG(order_date) OVER (
               PARTITION BY customer_id
               ORDER BY order_date, id
           ) AS prev_order_date
    FROM orders
)
SELECT id, customer_id, order_date,
       CAST(julianday(order_date) - julianday(prev_order_date) AS INTEGER) AS gap_days
FROM ordered
ORDER BY id;
