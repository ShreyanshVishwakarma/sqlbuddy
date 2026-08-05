SELECT c.name AS category, p.name AS product, s.unit_price, s.quantity
FROM category c
JOIN product p ON p.category_id = c.id
LEFT JOIN sale s ON s.product_id = p.id
ORDER BY c.name, p.name;
