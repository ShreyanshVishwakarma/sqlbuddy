CREATE TABLE events (
    event_id   INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    event_time TEXT NOT NULL,
    event_type TEXT NOT NULL
);
