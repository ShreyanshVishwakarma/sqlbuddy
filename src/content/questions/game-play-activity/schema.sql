CREATE TABLE activity (
    player_id    INTEGER NOT NULL,
    device_id    INTEGER NOT NULL,
    event_date   DATE NOT NULL,
    games_played INTEGER NOT NULL,
    PRIMARY KEY (player_id, event_date)
);
