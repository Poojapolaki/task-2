const API = "http://localhost:5000/tasks";

// 🔴 SHOW ERROR
function showError(msg) {
    document.getElementById("errorBox").innerText = msg;
}

// 🟢 LOAD TASKS
async function loadTasks() {
    document.getElementById("board").innerHTML = "Loading...";

    try {
        let res = await fetch(API);
        let data = await res.json();

        if (!data.success) throw new Error(data.error);

        document.getElementById("board").innerHTML = "";

        ["todo", "in_progress", "done"].forEach(status => {
            let col = document.createElement("div");
            col.className = "column";

            col.innerHTML = `<h3>${status.toUpperCase()}</h3>`;

            if (data.data[status].length === 0) {
                col.innerHTML += "<p>No tasks</p>";
            }

            data.data[status].forEach(task => {
                let div = document.createElement("div");
                div.className = "task";

                let tagsHTML = "";
                if (task.tags) {
                    task.tags.forEach(tag => {
                        tagsHTML += `<span class="tag">${tag}</span>`;
                    });
                }

                div.innerHTML = `
                    <h4>${task.title}</h4>
                    <p>${task.description}</p>
                    <p>⭐ Priority: ${task.priority}</p>
                    <p>⏱ Hours: ${task.estimatedHours || 0}</p>
                    <p>📅 Deadline: ${task.deadline || "None"}</p>
                    <p>🔥 Score: ${task.urgencyScore.toFixed(2)}</p>
                    <div>${tagsHTML}</div>
                    <button onclick="moveTask(${task.id}, 'in_progress')">Start</button>
                    <button onclick="moveTask(${task.id}, 'done')">Done</button>
                    <button onclick="deleteTask(${task.id})">Delete</button>
                `;

                col.appendChild(div);
            });

            document.getElementById("board").appendChild(col);
        });

    } catch (err) {
        showError(err.message);
    }
}

// 🟢 LOAD STATS
async function loadStats() {
    let res = await fetch(API + "/stats");
    let data = await res.json();

    if (!data.success) return;

    let s = data.data;

    document.getElementById("stats").innerHTML = `
        <div class="stat">ToDo: ${s.todo}</div>
        <div class="stat">In Progress: ${s.in_progress}</div>
        <div class="stat">Done: ${s.done}</div>
        <div class="stat">Overdue: ${s.overdue}</div>
    `;
}

// 🟢 CREATE TASK
async function createTask() {
    const title = document.getElementById("title").value;
    const description = document.getElementById("desc").value;
    const priority = document.getElementById("priority").value;
    const deadline = document.getElementById("deadline").value;
    const estimatedHours = document.getElementById("hours").value;
    const tags = document.getElementById("tags").value.split(",");

    let res = await fetch(API, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ title, description, priority, deadline, estimatedHours, tags })
    });

    let data = await res.json();

    if (!data.success) {
        showError(data.error);
        return;
    }

    showError("");
    loadTasks();
    loadStats();
}

// 🟢 MOVE TASK
async function moveTask(id, status) {
    await fetch(`${API}/${id}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ status })
    });

    loadTasks();
    loadStats();
}

// 🟢 DELETE TASK
async function deleteTask(id) {
    await fetch(`${API}/${id}`, { method: "DELETE" });

    loadTasks();
    loadStats();
}

// INIT
loadTasks();
loadStats();