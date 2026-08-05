-- Reference: 7-row rolling average per account.
SELECT id, account_id, sale_date, amount,
       ROUND(AVG(amount) OVER (
           PARTITION BY account_id
           ORDER BY sale_date, id
           ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
       ), 2) AS rolling_avg
FROM sales
ORDER BY account_id, sale_date, id;
