CREATE TABLE sales (
    id         INTEGER PRIMARY KEY,
    account_id INTEGER NOT NULL,
    sale_date  DATE NOT NULL,
    amount     INTEGER  -- NULL allowed
);
