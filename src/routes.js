import express from "express";
import multer from "multer";
import { parse } from "csv-parse";
import {
  createTask,
  getAllTasks,
  updateTask,
  deleteTask,
  toggleTaskCompletion,
  getTaskById,
  createManyTasks,
} from "./database.js";

export const router = express.Router();
const upload = multer();

// Create a task
router.post("/tasks", async (req, res) => {
  try {
    console.log("Corpo da requisição recebido:", req.body); // 🔍 Verificar req.body

    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    console.log("Valores enviados para createTask:", { title, description });

    const result = await createTask(title, description);

    if (!result || !result.lastInsertRowid) {
      return res.status(500).json({ error: "Failed to create task" });
    }

    const task = await getTaskById(result.lastInsertRowid);

    return res.status(201).json(task);
  } catch (error) {
    console.error("Erro ao criar tarefa:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// List all tasks
router.get("/tasks", async (req, res) => {
  const { search } = req.query;
  const tasks = await getAllTasks(search);
  return res.json(tasks);
});

// Update a task
router.put("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  const task = await updateTask(id, title, description);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  return res.json(task);
});

// Delete a task
router.delete("/tasks/:id", async (req, res) => {
  const { id } = req.params;

  const result = await deleteTask(id);

  if (result.rowsAffected === 0) {
    return res.status(404).json({ error: "Task not found" });
  }

  return res.status(204).send();
});

// Toggle task completion
router.patch("/tasks/:id/complete", async (req, res) => {
  const { id } = req.params;

  const task = await toggleTaskCompletion(id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  return res.json(task);
});

// Import tasks from CSV
router.post("/tasks/import", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const parser = parse({
    delimiter: ",",
    columns: true,
    skip_empty_lines: true,
  });

  const tasks = [];

  parser.on("readable", function () {
    let record;
    while ((record = parser.read()) !== null) {
      tasks.push({
        title: record.title,
        description: record.description,
      });
    }
  });

  parser.on("end", async function () {
    await createManyTasks(tasks);
    res.json({ message: `Imported ${tasks.length} tasks successfully` });
  });

  parser.write(req.file.buffer.toString());
  parser.end();
});
