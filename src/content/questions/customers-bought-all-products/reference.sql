-- Reference: customers whose distinct purchases cover every product.
SELECT customer_id
FROM customer
GROUP BY customer_id
HAVING COUNT(DISTINCT product_key) = (SELECT COUNT(*) FROM product)
ORDER BY customer_id;
