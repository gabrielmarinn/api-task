import express from "express";
import { router } from "./routes.js";
import { setupDatabase } from "./database.js";

const app = express();
const port = process.env.PORT || 3333;

app.use(express.json());
app.use(router);

setupDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to setup database:", err);
    process.exit(1);
  });
