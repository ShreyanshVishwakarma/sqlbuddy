CREATE TABLE category (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE product (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES category(id)
);

CREATE TABLE sale (
    id         INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES product(id),
    unit_price REAL NOT NULL,
    quantity   INTEGER NOT NULL
);
