import { create } from "zustand";
import { fs } from "@shared/services/filesystem";
import { FileTreeEntry } from "@shared/types";
import { usePaneController } from "@features/panes/pane-controller.store";
import { useFileExplorerStore } from "@features/file-explorer/file-explorer.store";

// ── Interfaces ──────────────────────────────────────────────────────────────

interface FileStoreActions {
  loadFileTree: () => Promise<void>;
  createFile: (path: string, content?: string) => Promise<void>;
  createUntitledFile: (dir: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newName: string) => Promise<boolean>;
  moveFile: (sourcePath: string, targetDir: string) => Promise<void>;
  duplicateFile: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
}

interface FileStoreState {
  fileTree: FileTreeEntry[];
  actions: FileStoreActions;
}

// ── Store ───────────────────────────────────────────────────────────────────

export const useFileStore = create<FileStoreState>()((set, get) => ({
  fileTree: [],

  actions: {
    async loadFileTree() {
      const fileTree = await fs.listFiles();
      set({ fileTree });
    },

    async createFile(path, content = "") {
      await fs.createFile(path, content);
      await get().actions.loadFileTree();
    },

    async createUntitledFile(dir) {
      if (dir) useFileExplorerStore.getState().expandFolder(dir);
      const { path } = await fs.createUntitled(dir);
      await get().actions.loadFileTree();
      usePaneController.getState().actions.openFileInPane(path);
    },

    async createDirectory(path) {
      await fs.createDirectory(path);
      await get().actions.loadFileTree();
      const parts = path.split("/");
      const toExpand: string[] = [];
      for (let i = 1; i < parts.length; i++) {
        toExpand.push(parts.slice(0, i).join("/"));
      }
      useFileExplorerStore.getState().expandManyFolders(toExpand);
    },

    async renameFile(oldPath, newName) {
      try {
        const { newPath } = await fs.renameFile(oldPath, newName);
        await get().actions.loadFileTree();
        usePaneController.getState().actions.updateTabPaths(oldPath, newPath);
        return true;
      } catch (err: any) {
        if (err.message?.includes("409") || err.message?.includes("Conflict")) {
          alert(`"${newName}" already exists in this folder.`);
        }
        return false;
      }
    },

    async moveFile(sourcePath, targetDir) {
      try {
        const { newPath } = await fs.moveFile(sourcePath, targetDir);
        if (targetDir) useFileExplorerStore.getState().expandFolder(targetDir);
        await get().actions.loadFileTree();
        usePaneController.getState().actions.updateTabPaths(sourcePath, newPath);
      } catch (err: any) {
        if (err.message?.includes("409") || err.message?.includes("Conflict")) {
          const name = sourcePath.includes("/")
            ? sourcePath.substring(sourcePath.lastIndexOf("/") + 1)
            : sourcePath;
          alert(`"${name}" already exists in the destination folder.`);
        }
      }
    },

    async duplicateFile(path) {
      const { newPath } = await fs.duplicateFile(path);
      await get().actions.loadFileTree();
      usePaneController.getState().actions.openFileInPane(newPath);
    },

    async deleteFile(path) {
      await fs.deleteFile(path);
      usePaneController.getState().actions.removeTabPath(path);
      await get().actions.loadFileTree();
    },
  },
}));

// ── Selectors ───────────────────────────────────────────────────────────────

/** Resolve um URL path (sem extensão) para um file path, tentando .md depois .pdf. */
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

