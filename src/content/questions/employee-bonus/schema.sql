CREATE TABLE employee (
    emp_id INTEGER PRIMARY KEY,
    name   TEXT NOT NULL,
    salary INTEGER NOT NULL
);

CREATE TABLE bonus (
    emp_id INTEGER PRIMARY KEY REFERENCES employee(emp_id),
    bonus  INTEGER  -- NULL allowed
);
