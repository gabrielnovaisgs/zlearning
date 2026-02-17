import type { AppState, FileTreeEntry } from "./types";
import { HttpFileSystemService, type FileSystemService } from "./services/filesystem";

type Listener = () => void;

class Store {
  private state: AppState = {
    fileTree: [],
    activeFile: null,
    fileContent: "",
    loading: false,
    sidebarWidth: 260,
    expandedDirs: new Set(),
  };

  private listeners = new Set<Listener>();
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly fs: FileSystemService = new HttpFileSystemService();

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }

  private update(partial: Partial<AppState>) {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  async loadFileTree() {
    const fileTree = await this.fs.listFiles();
    this.update({ fileTree });
  }

  async openFile(path: string) {
    if (path === this.state.activeFile) return;
    this.update({ loading: true});
    const { content } = await this.fs.readFile(path);
    this.update({ fileContent: content, loading: false,  activeFile: path  });
    // Sync URL with active file (without .md extension for cleaner URLs)
    const urlPath = "/" + path.replace(/\.md$/, "");
    if (location.pathname !== urlPath) {
      history.pushState(null, "", urlPath);
    }
  }

  setFileContent(content: string) {
    this.update({ fileContent: content });
    this.scheduleSave();
  }

  private scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      const { activeFile, fileContent } = this.state;
      if (activeFile) {
        this.fs.writeFile(activeFile, fileContent);
      }
    }, 1000);
  }

  toggleDir(path: string) {
    const expandedDirs = new Set(this.state.expandedDirs);
    if (expandedDirs.has(path)) {
      expandedDirs.delete(path);
    } else {
      expandedDirs.add(path);
    }
    this.update({ expandedDirs });
  }

  setSidebarWidth(width: number) {
    this.update({ sidebarWidth: Math.max(180, Math.min(500, width)) });
  }

  async createFile(path: string) {
    await this.fs.createFile(path);
    await this.loadFileTree();
    await this.openFile(path);
  }

  async createUntitledFile(dir: string) {
    const siblings = this.collectFileNames(dir ? dir + "/" : "");
    let name = "Untitled.md";
    let n = 1;
    while (siblings.has(name)) {
      name = `Untitled (${n}).md`;
      n++;
    }
    const path = dir ? `${dir}/${name}` : name;
    if (dir) {
      const expandedDirs = new Set(this.state.expandedDirs);
      expandedDirs.add(dir);
      this.update({ expandedDirs });
    }
    await this.createFile(path);
  }

  /** Resolve a wiki link path (e.g. "notes/Getting Started") to a file path */
  resolveWikiLink(linkPath: string): string | null {
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
    return find(this.state.fileTree);
  }

  async createDirectory(path: string) {
    await this.fs.createDirectory(path);
    await this.loadFileTree();
    // Expand parent dirs so the new folder is visible
    const parts = path.split("/");
    const expandedDirs = new Set(this.state.expandedDirs);
    for (let i = 1; i < parts.length; i++) {
      expandedDirs.add(parts.slice(0, i).join("/"));
    }
    this.update({ expandedDirs });
  }

  async renameFile(oldPath: string, newName: string): Promise<boolean> {
    const dir = oldPath.includes("/") ? oldPath.substring(0, oldPath.lastIndexOf("/") + 1) : "";
    const newPath = `${dir}${newName.endsWith(".md") ? newName : newName + ".md"}`;
    if (newPath === oldPath) return true;
    if (this.fileExists(newPath)) {
      alert(`A file named "${newName}" already exists in this folder.`);
      return false;
    }
    await this.fs.renameFile(oldPath, newPath);
    await this.loadFileTree();
    if (this.state.activeFile === oldPath) {
      this.update({ activeFile: newPath });
      const urlPath = "/" + newPath.replace(/\.md$/, "");
      history.replaceState(null, "", urlPath);
    }
    return true;
  }

  private fileExists(path: string): boolean {
    const find = (entries: FileTreeEntry[]): boolean => {
      for (const entry of entries) {
        if (entry.path === path) return true;
        if (entry.children && find(entry.children)) return true;
      }
      return false;
    };
    return find(this.state.fileTree);
  }

  /** Move a file or directory to a target directory (empty string = root) */
  async moveFile(sourcePath: string, targetDir: string) {
    const name = sourcePath.includes("/")
      ? sourcePath.substring(sourcePath.lastIndexOf("/") + 1)
      : sourcePath;
    const newPath = targetDir ? `${targetDir}/${name}` : name;
    if (newPath === sourcePath) return;
    // Prevent moving a directory into itself or its children
    if (sourcePath === targetDir || targetDir.startsWith(sourcePath + "/")) return;
    if (this.fileExists(newPath)) {
      alert(`"${name}" already exists in the destination folder.`);
      return;
    }
    await this.fs.renameFile(sourcePath, newPath);
    // Expand target directory so the moved item is visible
    if (targetDir) {
      const expandedDirs = new Set(this.state.expandedDirs);
      expandedDirs.add(targetDir);
      this.update({ expandedDirs });
    }
    await this.loadFileTree();
    if (this.state.activeFile === sourcePath) {
      this.update({ activeFile: newPath });
      const urlPath = "/" + newPath.replace(/\.md$/, "");
      history.replaceState(null, "", urlPath);
    }
  }

  async duplicateFile(path: string) {
    const { content } = await this.fs.readFile(path);
    const dir = path.includes("/") ? path.substring(0, path.lastIndexOf("/") + 1) : "";
    const name = path.includes("/") ? path.substring(path.lastIndexOf("/") + 1) : path;
    const base = name.replace(/\.md$/, "");

    // Collect existing sibling names to find next available number
    const siblings = this.collectFileNames(dir);
    let n = 1;
    while (siblings.has(`${base} (${n}).md`)) n++;

    const newPath = `${dir}${base} (${n}).md`;
    await this.fs.createFile(newPath, content);
    await this.loadFileTree();
    await this.openFile(newPath);
  }

  private collectFileNames(dir: string): Set<string> {
    const names = new Set<string>();
    const find = (entries: FileTreeEntry[], prefix: string) => {
      for (const entry of entries) {
        if (entry.type === "file" && prefix === dir) {
          names.add(entry.name);
        }
        if (entry.children) {
          find(entry.children, entry.path + "/");
        }
      }
    };
    find(this.state.fileTree, "");
    return names;
  }

  async deleteFile(path: string) {
    await this.fs.deleteFile(path);
    if (this.state.activeFile === path) {
      this.update({ activeFile: null, fileContent: "" });
      history.pushState(null, "", "/");
    }
    await this.loadFileTree();
  }
}

export const store = new Store();
