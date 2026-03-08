import type { FileTreeEntry, FileContent } from "@shared/types";

export interface FileSystemService {
  listFiles(): Promise<FileTreeEntry[]>;
  readFile(path: string): Promise<FileContent>;
  writeFile(path: string, content: string): Promise<void>;
  createFile(path: string, content?: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  renameFile(oldPath: string, newName: string): Promise<{ newPath: string }>;
  moveFile(sourcePath: string, targetDir: string): Promise<{ newPath: string }>;
  duplicateFile(sourcePath: string): Promise<{ newPath: string }>;
  createUntitled(dir: string): Promise<{ path: string }>;
  deleteFile(path: string): Promise<void>;
}

export class HttpFileSystemService implements FileSystemService {
  private baseUrl = "http://localhost:3000/api/files";

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

  async renameFile(oldPath: string, newName: string): Promise<{ newPath: string }> {
    const res = await fetch(`${this.baseUrl}/${oldPath}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newName }),
    });
    if (!res.ok) throw new Error(`Failed to rename file: ${res.status}`);
    return res.json();
  }

  async moveFile(sourcePath: string, targetDir: string): Promise<{ newPath: string }> {
    const res = await fetch(`${this.baseUrl}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourcePath, targetDir }),
    });
    if (!res.ok) throw new Error(`Failed to move file: ${res.status}`);
    return res.json();
  }

  async duplicateFile(sourcePath: string): Promise<{ newPath: string }> {
    const res = await fetch(`${this.baseUrl}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourcePath }),
    });
    if (!res.ok) throw new Error(`Failed to duplicate file: ${res.status}`);
    return res.json();
  }

  async createUntitled(dir: string): Promise<{ path: string }> {
    const res = await fetch(`${this.baseUrl}/untitled`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dir }),
    });
    if (!res.ok) throw new Error(`Failed to create untitled file: ${res.status}`);
    return res.json();
  }

  async deleteFile(path: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${path}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete file");
  }
}

export let fs: FileSystemService = new HttpFileSystemService();

/** Somente para testes — substitui o singleton fs */
export function __setFs(service: FileSystemService) {
  fs = service;
}
