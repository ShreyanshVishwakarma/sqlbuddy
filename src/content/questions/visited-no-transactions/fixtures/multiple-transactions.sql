INSERT INTO visits (visit_id, customer_id) VALUES
  (1, 23),
  (2, 23),
  (3, 23),   -- three visits for customer 23
  (4, 9),
  (5, 9);

INSERT INTO transactions (transaction_id, visit_id, amount) VALUES
  (100, 1, 10),
  (101, 1, 20),   -- visit 1 has two transactions
  (102, 2, 30),
  (103, 5, 40);   -- visit 5 purchased
