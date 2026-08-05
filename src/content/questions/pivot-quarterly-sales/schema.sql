CREATE TABLE sales (
    year    INTEGER NOT NULL,
    quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    revenue INTEGER  -- NULL allowed
);
