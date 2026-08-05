CREATE TABLE department (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE employee (
    id            INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    salary        INTEGER,  -- NULL allowed
    department_id INTEGER REFERENCES department(id)  -- NULL allowed
);
