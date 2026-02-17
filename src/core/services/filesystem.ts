import type { FileTreeEntry, FileContent } from "../types";

export interface FileSystemService {
  listFiles(): Promise<FileTreeEntry[]>;
  readFile(path: string): Promise<FileContent>;
  writeFile(path: string, content: string): Promise<void>;
  createFile(path: string, content?: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  renameFile(oldPath: string, newPath: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
}

export class HttpFileSystemService implements FileSystemService {
  private baseUrl = "/api/files";

  async listFiles(): Promise<FileTreeEntry[]> {
    const res = await fetch(this.baseUrl);
    if (!res.ok) throw new Error("Failed to list files");
    return res.json();
  }

  async readFile(path: string): Promise<FileContent> {
    const res = await fetch(`${this.baseUrl}/${path}`);
    if (!res.ok) throw new Error("Failed to read file");
    return res.json();
  }

  async writeFile(path: string, content: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("Failed to write file");
  }

  async createFile(path: string, content = ""): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "file", content }),
    });
    if (!res.ok) throw new Error("Failed to create file");
  }

  async createDirectory(path: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "directory" }),
    });
    if (!res.ok) throw new Error("Failed to create directory");
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${oldPath}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPath }),
    });
    if (!res.ok) throw new Error("Failed to rename file");
  }

  async deleteFile(path: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${path}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete file");
  }
}
