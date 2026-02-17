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

  async deleteFile(path: string) {
    await this.fs.deleteFile(path);
    if (this.state.activeFile === path) {
      this.update({ activeFile: null, fileContent: "" });
    }
    await this.loadFileTree();
  }
}

export const store = new Store();
