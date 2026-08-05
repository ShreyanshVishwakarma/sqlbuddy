-- Reference: dense top 3 by revenue per category, ties included.
WITH product_revenue AS (
    SELECT p.id AS product_id,
           p.name AS product_name,
           p.category_id,
           ROUND(SUM(s.quantity * s.unit_price)) AS revenue
    FROM product p
    LEFT JOIN sale s ON s.product_id = p.id
    GROUP BY p.id, p.name, p.category_id
),
ranked AS (
    SELECT product_name, category_id, revenue,
           DENSE_RANK() OVER (
               PARTITION BY category_id
               ORDER BY revenue DESC
           ) AS rnk
    FROM product_revenue
)
SELECT c.name AS category, r.product_name AS product, r.revenue
FROM ranked r
JOIN category c ON c.id = r.category_id
WHERE r.rnk <= 3
ORDER BY c.name, r.revenue DESC, r.product_name;
