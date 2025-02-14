import { createClient } from "@libsql/client";

const db = createClient({
  url: "file:tasks.db",
});

export async function setupDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function createTask(title, description) {
  const result = await db.execute({
    sql: `INSERT INTO tasks (title, description) VALUES (?, ?)`,
    args: [title, description],
  });

  return result;
}

export async function getAllTasks(search = "") {
  if (search) {
    const result = await db.execute({
      sql: `SELECT * FROM tasks WHERE title LIKE ? OR description LIKE ? ORDER BY created_at DESC`,
      args: [`%${search}%`, `%${search}%`],
    });
    return result.rows;
  }

  const result = await db.execute(
    "SELECT * FROM tasks ORDER BY created_at DESC"
  );
  return result.rows;
}

export async function getTaskById(id) {
  const result = await db.execute({
    sql: "SELECT * FROM tasks WHERE id = ?",
    args: [id],
  });
  return result.rows[0];
}

export async function updateTask(id, title, description) {
  const currentTask = await getTaskById(id);
  if (!currentTask) return null;

  const updates = [];
  const values = [];

  if (title !== undefined) {
    updates.push("title = ?");
    values.push(title);
  }

  if (description !== undefined) {
    updates.push("description = ?");
    values.push(description);
  }

  if (updates.length === 0) return currentTask;

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  await db.execute({
    sql: `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`,
    args: values,
  });

  return getTaskById(id);
}

export async function deleteTask(id) {
  const result = await db.execute({
    sql: "DELETE FROM tasks WHERE id = ?",
    args: [id],
  });
  return result;
}

export async function toggleTaskCompletion(id) {
  const task = await getTaskById(id);
  if (!task) return null;

  await db.execute({
    sql: `
      UPDATE tasks 
      SET completed_at = CASE 
        WHEN completed_at IS NULL THEN CURRENT_TIMESTAMP 
        ELSE NULL 
      END,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    args: [id],
  });

  return getTaskById(id);
}

export async function createManyTasks(tasks) {
  for (const task of tasks) {
    await createTask(task.title, task.description);
  }
}
