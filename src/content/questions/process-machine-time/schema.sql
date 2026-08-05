CREATE TABLE activity (
    machine_id    INTEGER NOT NULL,
    process_id    INTEGER NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('start', 'end')),
    timestamp     REAL NOT NULL,
    PRIMARY KEY (machine_id, process_id, activity_type)
);
