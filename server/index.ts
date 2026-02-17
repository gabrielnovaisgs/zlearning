import express from "express";
import { createServer as createViteServer } from "vite";
import { createFilesystemRouter } from "./routes/filesystem.js";

async function start() {
  const app = express();
  const port = 3000;

  app.use(express.json());

  // API routes
  app.use("/api/files", createFilesystemRouter());

  // Vite dev server as middleware
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  app.listen(port, () => {
    console.log(`Study MD running at http://localhost:${port}`);
  });
}

start();
