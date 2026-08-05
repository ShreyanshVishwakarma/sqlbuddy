CREATE TABLE delivery (
    delivery_id                INTEGER PRIMARY KEY,
    customer_id                INTEGER NOT NULL,
    order_date                 DATE NOT NULL,
    customer_pref_delivery_date DATE NOT NULL
);
