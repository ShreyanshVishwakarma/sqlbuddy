SELECT id, account_id, sale_date, amount,
       SUM(amount) OVER (
           PARTITION BY account_id
           ORDER BY sale_date, id
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS running_total
FROM sales
ORDER BY account_id, sale_date, id;
