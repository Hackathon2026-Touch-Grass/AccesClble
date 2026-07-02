CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT
);

INSERT INTO tags (title) VALUES
    ('Men'),
    ('Hobbits'),
    ('Elves'),
    ('Dwarves');

CREATE TABLE task_tags (
    task_id INTEGER,
    tag_id INTEGER,
    PRIMARY KEY (task_id, tag_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
