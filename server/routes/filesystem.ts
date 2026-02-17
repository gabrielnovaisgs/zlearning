import { Router } from "express";
import fs from "fs/promises";
import path from "path";

const DOCS_ROOT = path.resolve(process.cwd(), "docs");

interface FileTreeEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeEntry[];
}

async function buildTree(dirPath: string): Promise<FileTreeEntry[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const result: FileTreeEntry[] = [];

  const sorted = entries
    .filter((e) => !e.name.startsWith("."))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  for (const entry of sorted) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(DOCS_ROOT, fullPath);

    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        path: relativePath,
        type: "directory",
        children: await buildTree(fullPath),
      });
    } else if (entry.name.endsWith(".md")) {
      result.push({
        name: entry.name,
        path: relativePath,
        type: "file",
      });
    }
  }

  return result;
}

function safePath(requestedPath: string): string {
  const resolved = path.resolve(DOCS_ROOT, requestedPath);
  if (!resolved.startsWith(DOCS_ROOT)) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}

export function createFilesystemRouter(): Router {
  const router = Router();

  // List file tree
  router.get("/", async (_req, res) => {
    try {
      const tree = await buildTree(DOCS_ROOT);
      res.json(tree);
    } catch (err) {
      res.status(500).json({ error: "Failed to list files" });
    }
  });

  // Read file
  router.get("/*splat", async (req, res) => {
    try {
      const reqPath = (req.params.splat as string[]).join("/");
      const filePath = safePath(reqPath);
      const content = await fs.readFile(filePath, "utf-8");
      res.json({ content, path: reqPath });
    } catch (err: any) {
      if (err.code === "ENOENT") {
        res.status(404).json({ error: "File not found" });
      } else {
        res.status(500).json({ error: "Failed to read file" });
      }
    }
  });

  // Write/update file
  router.put("/*splat", async (req, res) => {
    try {
      const reqPath = (req.params.splat as string[]).join("/");
      const filePath = safePath(reqPath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, req.body.content, "utf-8");
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to write file" });
    }
  });

  // Create file or directory
  router.post("/*splat", async (req, res) => {
    try {
      const reqPath = (req.params.splat as string[]).join("/");
      const filePath = safePath(reqPath);
      if (req.body.type === "directory") {
        await fs.mkdir(filePath, { recursive: true });
      } else {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, req.body.content || "", "utf-8");
      }
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to create" });
    }
  });

  // Rename file
  router.patch("/*splat", async (req, res) => {
    try {
      const reqPath = (req.params.splat as string[]).join("/");
      const oldPath = safePath(reqPath);
      const newRelative = req.body.newPath;
      if (!newRelative) {
        res.status(400).json({ error: "newPath is required" });
        return;
      }
      const newPath = safePath(newRelative);
      await fs.mkdir(path.dirname(newPath), { recursive: true });
      await fs.rename(oldPath, newPath);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to rename" });
    }
  });

  // Delete file
  router.delete("/*splat", async (req, res) => {
    try {
      const reqPath = (req.params.splat as string[]).join("/");
      const filePath = safePath(reqPath);
      await fs.rm(filePath, { recursive: true });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete" });
    }
  });

  return router;
}
