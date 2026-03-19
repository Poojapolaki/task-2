const express = require('express');
const cors = require('cors');
const db = require('./db');
const logger = require('./logger');

const app = express();

app.use(cors());
app.use(express.json());
app.use(logger);

const PORT = 5000;

// 🔥 URGENCY SCORE
function calculateUrgency(task) {
    let priorityScore = (task.priority || 1) * 20;

    let deadlineFactor = 0;
    if (task.deadline) {
        let now = new Date();
        let deadline = new Date(task.deadline);
        let diff = (deadline - now) / (1000 * 60 * 60 * 24);

        if (diff < 0) deadlineFactor = 50;
        else if (diff <= 1) deadlineFactor = 40;
        else if (diff <= 3) deadlineFactor = 25;
        else deadlineFactor = Math.max(0, 20 - diff);
    }

    let created = new Date(task.createdAt);
    let ageDays = (new Date() - created) / (1000 * 60 * 60 * 24);
    let ageFactor = Math.min(15, ageDays * 1.5);

    return priorityScore + deadlineFactor + ageFactor;
}

// ✅ GET TASKS
app.get('/tasks', (req, res) => {
    db.all("SELECT * FROM tasks WHERE deletedAt IS NULL", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, data: null, error: err.message });
        }

        let grouped = { todo: [], in_progress: [], done: [] };

        rows.forEach(task => {
            task.tags = JSON.parse(task.tags || "[]");
            task.urgencyScore = calculateUrgency(task);
            grouped[task.status].push(task);
        });

        Object.keys(grouped).forEach(status => {
            grouped[status].sort((a, b) => b.urgencyScore - a.urgencyScore);
        });

        res.json({ success: true, data: grouped, error: null });
    });
});

// ✅ CREATE TASK
app.post('/tasks', (req, res) => {
    const { title, description, priority, deadline, tags, estimatedHours } = req.body;

    if (!title || !description) {
        return res.status(400).json({
            success: false,
            data: null,
            error: "Title & Description required"
        });
    }

    if (priority && (priority < 1 || priority > 5)) {
        return res.status(400).json({
            success: false,
            data: null,
            error: "Priority must be 1–5"
        });
    }

    db.run(
        `INSERT INTO tasks (title, description, priority, deadline, tags, estimatedHours)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, description, priority, deadline, JSON.stringify(tags), estimatedHours],
        function (err) {
            if (err) {
                return res.status(500).json({ success: false, data: null, error: err.message });
            }

            res.json({ success: true, data: { id: this.lastID }, error: null });
        }
    );
});

// ✅ UPDATE TASK
app.put('/tasks/:id', (req, res) => {
    const id = req.params.id;
    const updates = req.body;

    let fields = Object.keys(updates);
    let values = [];

    let query = "UPDATE tasks SET ";

    fields.forEach((field, i) => {
        query += `${field} = ?`;
        if (i < fields.length - 1) query += ", ";
        values.push(updates[field]);
    });

    query += " WHERE id = ?";
    values.push(id);

    db.run(query, values, function (err) {
        if (err) {
            return res.status(500).json({ success: false, data: null, error: err.message });
        }

        res.json({ success: true, data: null, error: null });
    });
});

// ✅ DELETE TASK
app.delete('/tasks/:id', (req, res) => {
    const id = req.params.id;

    db.run(
        `UPDATE tasks SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [id],
        function (err) {
            if (err) {
                return res.status(500).json({ success: false, data: null, error: err.message });
            }

            res.json({ success: true, data: null, error: null });
        }
    );
});

// ✅ STATS API
app.get('/tasks/stats', (req, res) => {
    db.all("SELECT * FROM tasks WHERE deletedAt IS NULL", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, data: null, error: err.message });

        let stats = {
            todo: 0,
            in_progress: 0,
            done: 0,
            overdue: 0,
            avgUrgency: { todo: 0, in_progress: 0, done: 0 }
        };

        let sums = { todo: 0, in_progress: 0, done: 0 };

        rows.forEach(task => {
            stats[task.status]++;
            let score = calculateUrgency(task);
            sums[task.status] += score;

            if (task.deadline && new Date(task.deadline) < new Date()) {
                stats.overdue++;
            }
        });

        Object.keys(sums).forEach(status => {
            if (stats[status] > 0) {
                stats.avgUrgency[status] = (sums[status] / stats[status]).toFixed(2);
            }
        });

        res.json({ success: true, data: stats, error: null });
    });
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));