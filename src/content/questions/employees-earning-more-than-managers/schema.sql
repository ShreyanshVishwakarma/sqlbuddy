CREATE TABLE employee (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    salary     INTEGER NOT NULL,
    manager_id INTEGER REFERENCES employee(id)  -- NULL for top-level employees
);
