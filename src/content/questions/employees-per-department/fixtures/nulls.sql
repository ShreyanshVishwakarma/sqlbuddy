INSERT INTO department (id, name) VALUES
  (1, 'Engineering'),
  (2, 'Sales'),
  (3, 'Marketing');

INSERT INTO employee (id, name, salary, department_id) VALUES
  (1, 'Alice',  100, 1),
  (2, 'Bob',    NULL, 1),     -- NULL salary: ignored by AVG
  (3, 'Carol',  NULL, 2),     -- Sales has no non-NULL salaries at all
  (4, 'Dave',   40,  2),
  (5, 'Eve',    70,  NULL),   -- belongs to no department: ignored
  (6, 'Frank',  90,  1);
