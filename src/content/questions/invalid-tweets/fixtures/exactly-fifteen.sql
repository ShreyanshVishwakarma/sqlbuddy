INSERT INTO tweets (tweet_id, content) VALUES
  (1, '0123456789abcde'),   -- exactly 15 characters: valid
  (2, '0123456789abcdef'),  -- 16 characters: invalid
  (3, 'hello world');       -- 11 characters: valid
