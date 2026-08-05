CREATE TABLE visits (
    visit_id    INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL
);

CREATE TABLE transactions (
    transaction_id INTEGER PRIMARY KEY,
    visit_id       INTEGER NOT NULL REFERENCES visits(visit_id),
    amount         INTEGER NOT NULL
);
