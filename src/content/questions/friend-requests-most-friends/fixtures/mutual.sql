INSERT INTO request_accepted (requester_id, accepter_id, accept_date) VALUES
  (1, 2, '2024-01-01'),
  (2, 1, '2024-01-02'),   -- reciprocal: each direction counts as a friend edge
  (1, 3, '2024-01-03'),
  (3, 4, '2024-01-04');
