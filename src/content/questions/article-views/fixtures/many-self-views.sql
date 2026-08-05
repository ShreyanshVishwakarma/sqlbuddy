INSERT INTO views (article_id, author_id, viewer_id, view_date) VALUES
  (1, 4, 4, '2024-01-01'),
  (1, 4, 4, '2024-01-02'),   -- same author views same article again
  (2, 4, 4, '2024-01-03'),   -- and a different article
  (3, 5, 6, '2024-01-04'),
  (4, 5, 5, '2024-01-05');
