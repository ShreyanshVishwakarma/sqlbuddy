CREATE TABLE sales (
    id          INTEGER PRIMARY KEY,
    salesperson TEXT NOT NULL,
    month       DATE NOT NULL,
    amount      REAL  -- NULL allowed
);
