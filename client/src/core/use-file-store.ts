import { create } from "zustand";
import { HttpFileSystemService, type FileSystemService } from "./services/filesystem";
import { FileTreeEntry } from "./types";
import { usePaneController } from "./use-pane-controller-store";
import { useSidebarStore } from "./sidebar-store";

const fs: FileSystemService = new HttpFileSystemService();

// ── File tree store ────────────────────────────────────────────────────────

interface FilesState {
  fileTree: FileTreeEntry[];
  loadFileTree: () => Promise<void>;
}

export const useFileStore = create<FilesState>()((set) => ({
  fileTree: [],
  loadFileTree: async () => {
    const fileTree = await fs.listFiles();
    set({ fileTree });
  },
}));

const loadFileTree = () => useFileStore.getState().loadFileTree();

// ── Queries ────────────────────────────────────────────────────────────────

/** Resolve a URL path (without extension) to a file path, trying .md then .pdf. Falls back to path + ".md". */
export function resolveFileFromPath(path: string): string {
  const find = (entries: FileTreeEntry[]): string | null => {
    for (const e of entries) {
      if (e.type === "file" && (e.path === path + ".md" || e.path === path + ".pdf")) return e.path;
      if (e.children) { const f = find(e.children); if (f) return f; }
    }
    return null;
  };
  return find(useFileStore.getState().fileTree) ?? path + ".md";
}

export function resolveWikiLink(linkPath: string): string | null {
  const target = linkPath.endsWith(".md") ? linkPath : `${linkPath}.md`;
  const find = (entries: FileTreeEntry[]): string | null => {
    for (const entry of entries) {
      if (entry.type === "file" && entry.path === target) return entry.path;
      if (entry.children) {
        const found = find(entry.children);
        if (found) return found;
      }
    }
    return null;
  };
  return find(useFileStore.getState().fileTree);
}

// ── File operations ────────────────────────────────────────────────────────

export async function readFile(path: string) {
  return fs.readFile(path);
}

export async function writeFile(path: string, content: string) {
  await fs.writeFile(path, content);
}

export async function createFile(path: string, content = "") {
  await fs.createFile(path, content);
  await loadFileTree();
}

export async function createUntitledFile(dir: string) {
  if (dir) useSidebarStore.getState().expandFolder(dir);
  const { path } = await fs.createUntitled(dir);
  await loadFileTree();
  usePaneController.getState().actions.openFileInPane(path);
}

export async function createDirectory(path: string) {
  await fs.createDirectory(path);
  await loadFileTree();
  const parts = path.split("/");
  const toExpand: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    toExpand.push(parts.slice(0, i).join("/"));
  }
  useSidebarStore.getState().expandManyFolders(toExpand);
}

export async function renameFile(oldPath: string, newName: string): Promise<boolean> {
  try {
    const { newPath } = await fs.renameFile(oldPath, newName);
    await loadFileTree();
    usePaneController.getState().actions.updateTabPaths(oldPath, newPath);
    return true;
  } catch (err: any) {
    if (err.message?.includes("409") || err.message?.includes("Conflict")) {
      alert(`"${newName}" already exists in this folder.`);
    }
    return false;
  }
}

export async function moveFile(sourcePath: string, targetDir: string) {
  try {
    const { newPath } = await fs.moveFile(sourcePath, targetDir);
    if (targetDir) useSidebarStore.getState().expandFolder(targetDir);
    await loadFileTree();
    usePaneController.getState().actions.updateTabPaths(sourcePath, newPath);
  } catch (err: any) {
    if (err.message?.includes("409") || err.message?.includes("Conflict")) {
      const name = sourcePath.includes("/")
        ? sourcePath.substring(sourcePath.lastIndexOf("/") + 1)
        : sourcePath;
      alert(`"${name}" already exists in the destination folder.`);
    }
  }
}

export async function duplicateFile(path: string) {
  const { newPath } = await fs.duplicateFile(path);
  await loadFileTree();
  usePaneController.getState().actions.openFileInPane(newPath);
}

export async function deleteFile(path: string) {
  await fs.deleteFile(path);
  usePaneController.getState().actions.removeTabPath(path);
  await loadFileTree();
}
