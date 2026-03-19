const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./tasks.db');

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT CHECK(status IN ('todo','in_progress','done')) DEFAULT 'todo',
            priority INTEGER,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            deadline DATETIME,
            tags TEXT,
            estimatedHours INTEGER,
            deletedAt DATETIME
        )
    `);
});

module.exports = db;