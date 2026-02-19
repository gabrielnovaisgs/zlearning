import type { AppState, FileTreeEntry, Pane, Tab } from "./types";
import { HttpFileSystemService, type FileSystemService } from "./services/filesystem";

type Listener = () => void;

const defaultPaneId = crypto.randomUUID();

class Store {
  private state: AppState = {
    fileTree: [],
    activeFile: null,
    loading: false,
    sidebarWidth: 260,
    expandedDirs: new Set(),
    pdfHighlightTarget: null,
    panes: [{ id: defaultPaneId, tabs: [], activeTabId: null, flexRatio: 1 }],
    activePaneId: defaultPaneId,
  };

  private listeners = new Set<Listener>();

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
    const next = { ...this.state, ...partial };
    // Derive activeFile from active pane's active tab
    const pane = next.panes.find((p) => p.id === next.activePaneId);
    const tab = pane?.tabs.find((t) => t.id === pane.activeTabId);
    next.activeFile = tab?.path ?? null;
    this.state = next;
    this.emit();
  }

  async loadFileTree() {
    const fileTree = await this.fs.listFiles();
    this.update({ fileTree });
  }

  openFile(path: string, paneId?: string) {
    const targetPaneId = paneId ?? this.state.activePaneId;
    const panes = [...this.state.panes];
    const paneIdx = panes.findIndex((p) => p.id === targetPaneId);
    if (paneIdx === -1) return;

    const pane = panes[paneIdx];
    const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId);

    if (activeTab && activeTab.path === null) {
      // Replace the new-tab placeholder with this file
      panes[paneIdx] = {
        ...pane,
        tabs: pane.tabs.map((t) => t.id === activeTab.id ? { ...t, path } : t),
        activeTabId: activeTab.id,
      };
    } else {
      const existingTab = pane.tabs.find((t) => t.path === path);
      if (existingTab) {
        panes[paneIdx] = { ...pane, activeTabId: existingTab.id };
      } else {
        const newTab: Tab = { id: crypto.randomUUID(), path };
        panes[paneIdx] = { ...pane, tabs: [...pane.tabs, newTab], activeTabId: newTab.id };
      }
    }

    const urlPath = "/" + path.replace(/\.(md|pdf)$/, "");
    if (location.pathname !== urlPath) {
      history.pushState(null, "", urlPath);
    }

    this.update({ panes, activePaneId: targetPaneId });
  }

  openNewTab(paneId?: string) {
    const targetPaneId = paneId ?? this.state.activePaneId;
    const panes = [...this.state.panes];
    const paneIdx = panes.findIndex((p) => p.id === targetPaneId);
    if (paneIdx === -1) return;

    const pane = panes[paneIdx];
    const newTab: Tab = { id: crypto.randomUUID(), path: null };
    panes[paneIdx] = { ...pane, tabs: [...pane.tabs, newTab], activeTabId: newTab.id };
    this.update({ panes, activePaneId: targetPaneId });
  }

  // ── Tab/Pane management ────────────────────────────────────────────

  closeTab(tabId: string, paneId: string) {
    const panes = [...this.state.panes];
    const paneIdx = panes.findIndex((p) => p.id === paneId);
    if (paneIdx === -1) return;

    const pane = panes[paneIdx];
    const tabIdx = pane.tabs.findIndex((t) => t.id === tabId);
    if (tabIdx === -1) return;

    const newTabs = pane.tabs.filter((t) => t.id !== tabId);

    if (newTabs.length === 0 && panes.length > 1) {
      this.closePane(paneId);
      return;
    }

    let newActiveTabId = pane.activeTabId;
    if (newActiveTabId === tabId) {
      newActiveTabId =
        newTabs.length === 0
          ? null
          : newTabs[Math.min(tabIdx, newTabs.length - 1)].id;
    }

    panes[paneIdx] = { ...pane, tabs: newTabs, activeTabId: newActiveTabId };
    this.update({ panes });

    // Update URL if active tab changed
    const activePaneAfter = panes.find((p) => p.id === this.state.activePaneId);
    const activeTabAfter = activePaneAfter?.tabs.find((t) => t.id === activePaneAfter.activeTabId);
    const urlPath = activeTabAfter?.path ? "/" + activeTabAfter.path.replace(/\.(md|pdf)$/, "") : "/";
    if (location.pathname !== urlPath) {
      history.pushState(null, "", urlPath);
    }
  }

  activateTab(tabId: string, paneId: string) {
    const panes = [...this.state.panes];
    const paneIdx = panes.findIndex((p) => p.id === paneId);
    if (paneIdx === -1) return;

    panes[paneIdx] = { ...panes[paneIdx], activeTabId: tabId };
    this.update({ panes, activePaneId: paneId });

    const tab = panes[paneIdx].tabs.find((t) => t.id === tabId);
    if (tab?.path) {
      const urlPath = "/" + tab.path.replace(/\.(md|pdf)$/, "");
      if (location.pathname !== urlPath) history.pushState(null, "", urlPath);
    }
  }

  setActivePaneId(paneId: string) {
    if (this.state.activePaneId === paneId) return;
    this.update({ activePaneId: paneId });

    const pane = this.state.panes.find((p) => p.id === paneId);
    const tab = pane?.tabs.find((t) => t.id === pane.activeTabId);
    if (tab?.path) {
      const urlPath = "/" + tab.path.replace(/\.(md|pdf)$/, "");
      if (location.pathname !== urlPath) history.pushState(null, "", urlPath);
    }
  }

  /** Creates a new pane adjacent to paneId. Copies the active tab by default. Returns new pane id. */
  splitPane(paneId: string, direction: "left" | "right", copyActiveTab = true): string {
    const panes = [...this.state.panes];
    const idx = panes.findIndex((p) => p.id === paneId);
    if (idx === -1) return "";

    const sourcePane = panes[idx];
    const activeTab = sourcePane.tabs.find((t) => t.id === sourcePane.activeTabId);
    const newRatio = sourcePane.flexRatio / 2;

    const newTabEntry: Tab | undefined = copyActiveTab && activeTab && activeTab.path !== null
      ? { id: crypto.randomUUID(), path: activeTab.path }
      : undefined;

    const newPaneId = crypto.randomUUID();
    const newPane: Pane = {
      id: newPaneId,
      tabs: newTabEntry ? [newTabEntry] : [],
      activeTabId: newTabEntry?.id ?? null,
      flexRatio: newRatio,
    };

    panes[idx] = { ...sourcePane, flexRatio: newRatio };

    if (direction === "right") {
      panes.splice(idx + 1, 0, newPane);
    } else {
      panes.splice(idx, 0, newPane);
    }

    this.update({ panes, activePaneId: newPaneId });
    return newPaneId;
  }

  closePane(paneId: string) {
    const panes = [...this.state.panes];
    if (panes.length <= 1) return;

    const idx = panes.findIndex((p) => p.id === paneId);
    if (idx === -1) return;

    const removedRatio = panes[idx].flexRatio;
    panes.splice(idx, 1);

    const adjacentIdx = idx < panes.length ? idx : idx - 1;
    panes[adjacentIdx] = {
      ...panes[adjacentIdx],
      flexRatio: panes[adjacentIdx].flexRatio + removedRatio,
    };

    let activePaneId = this.state.activePaneId;
    if (activePaneId === paneId) {
      activePaneId = panes[adjacentIdx].id;
    }

    this.update({ panes, activePaneId });

    const pane = panes.find((p) => p.id === activePaneId);
    const tab = pane?.tabs.find((t) => t.id === pane.activeTabId);
    const urlPath = tab?.path ? "/" + tab.path.replace(/\.(md|pdf)$/, "") : "/";
    if (location.pathname !== urlPath) history.pushState(null, "", urlPath);
  }

  resizePane(leftPaneId: string, rightPaneId: string, newLeftRatio: number, newRightRatio: number) {
    const panes = this.state.panes.map((p) => {
      if (p.id === leftPaneId) return { ...p, flexRatio: newLeftRatio };
      if (p.id === rightPaneId) return { ...p, flexRatio: newRightRatio };
      return p;
    });
    this.update({ panes });
  }

  moveTabToPane(tabId: string, fromPaneId: string, toPaneId: string, index?: number) {
    if (fromPaneId === toPaneId) return;

    const fromPane = this.state.panes.find((p) => p.id === fromPaneId);
    const toPane = this.state.panes.find((p) => p.id === toPaneId);
    if (!fromPane || !toPane) return;

    const tab = fromPane.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    const newFromTabs = fromPane.tabs.filter((t) => t.id !== tabId);
    const removedIdx = fromPane.tabs.findIndex((t) => t.id === tabId);
    const newFromActiveTabId =
      fromPane.activeTabId === tabId
        ? newFromTabs.length === 0
          ? null
          : newFromTabs[Math.min(removedIdx, newFromTabs.length - 1)].id
        : fromPane.activeTabId;

    const insertAt = index ?? toPane.tabs.length;
    const newToTabs = [...toPane.tabs.slice(0, insertAt), tab, ...toPane.tabs.slice(insertAt)];

    let newPanes = this.state.panes.map((p) => {
      if (p.id === fromPaneId) return { ...p, tabs: newFromTabs, activeTabId: newFromActiveTabId };
      if (p.id === toPaneId) return { ...p, tabs: newToTabs, activeTabId: tab.id };
      return p;
    });

    // If fromPane is now empty and there are multiple panes, close it
    if (newFromTabs.length === 0 && newPanes.length > 1) {
      const fromIdx = newPanes.findIndex((p) => p.id === fromPaneId);
      const removedRatio = newPanes[fromIdx].flexRatio;
      newPanes = newPanes.filter((p) => p.id !== fromPaneId);
      const adjIdx = fromIdx < newPanes.length ? fromIdx : fromIdx - 1;
      newPanes[adjIdx] = {
        ...newPanes[adjIdx],
        flexRatio: newPanes[adjIdx].flexRatio + removedRatio,
      };
    }

    this.update({ panes: newPanes, activePaneId: toPaneId });
  }

  // ── File operations ────────────────────────────────────────────────

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
    this.openFile(path);
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
    const parts = path.split("/");
    const expandedDirs = new Set(this.state.expandedDirs);
    for (let i = 1; i < parts.length; i++) {
      expandedDirs.add(parts.slice(0, i).join("/"));
    }
    this.update({ expandedDirs });
  }

  async renameFile(oldPath: string, newName: string): Promise<boolean> {
    const dir = oldPath.includes("/") ? oldPath.substring(0, oldPath.lastIndexOf("/") + 1) : "";
    const ext = oldPath.match(/\.(md|pdf)$/)?.[0];
    const finalName = ext && !newName.endsWith(ext) ? newName + ext : newName;
    const newPath = `${dir}${finalName}`;
    if (newPath === oldPath) return true;
    if (this.fileExists(newPath)) {
      alert(`"${newName}" already exists in this folder.`);
      return false;
    }
    await this.fs.renameFile(oldPath, newPath);
    await this.loadFileTree();

    // Update all tabs with the old path across all panes
    const panes = this.state.panes.map((p) => ({
      ...p,
      tabs: p.tabs.map((t) => (t.path === oldPath ? { ...t, path: newPath } : t)),
    }));
    this.update({ panes });

    if (this.state.activeFile === newPath) {
      history.replaceState(null, "", "/" + newPath.replace(/\.(md|pdf)$/, ""));
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
    if (sourcePath === targetDir || targetDir.startsWith(sourcePath + "/")) return;
    if (this.fileExists(newPath)) {
      alert(`"${name}" already exists in the destination folder.`);
      return;
    }
    await this.fs.renameFile(sourcePath, newPath);
    if (targetDir) {
      const expandedDirs = new Set(this.state.expandedDirs);
      expandedDirs.add(targetDir);
      this.update({ expandedDirs });
    }
    await this.loadFileTree();

    const panes = this.state.panes.map((p) => ({
      ...p,
      tabs: p.tabs.map((t) => (t.path === sourcePath ? { ...t, path: newPath } : t)),
    }));
    this.update({ panes });

    if (this.state.activeFile === newPath) {
      history.replaceState(null, "", "/" + newPath.replace(/\.(md|pdf)$/, ""));
    }
  }

  async duplicateFile(path: string) {
    const { content } = await this.fs.readFile(path);
    const dir = path.includes("/") ? path.substring(0, path.lastIndexOf("/") + 1) : "";
    const name = path.includes("/") ? path.substring(path.lastIndexOf("/") + 1) : path;
    const base = name.replace(/\.md$/, "");

    const siblings = this.collectFileNames(dir);
    let n = 1;
    while (siblings.has(`${base} (${n}).md`)) n++;

    const newPath = `${dir}${base} (${n}).md`;
    await this.fs.createFile(newPath, content);
    await this.loadFileTree();
    this.openFile(newPath);
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

  navigateToPdfHighlight(id: string) {
    this.update({ pdfHighlightTarget: id });
  }

  clearPdfHighlightTarget() {
    this.update({ pdfHighlightTarget: null });
  }

  async deleteFile(path: string) {
    const wasActive = this.state.activeFile === path;
    await this.fs.deleteFile(path);

    // Close all tabs with this path across all panes
    let panes = this.state.panes.map((p) => {
      const newTabs = p.tabs.filter((t) => t.path !== path);
      let newActiveTabId = p.activeTabId;
      if (p.tabs.find((t) => t.id === p.activeTabId)?.path === path) {
        const oldIdx = p.tabs.findIndex((t) => t.id === p.activeTabId);
        newActiveTabId =
          newTabs.length > 0 ? newTabs[Math.min(oldIdx, newTabs.length - 1)].id : null;
      }
      return { ...p, tabs: newTabs, activeTabId: newActiveTabId };
    });

    // Close empty panes if multiple exist
    if (panes.length > 1) {
      for (const emptyPane of panes.filter((p) => p.tabs.length === 0)) {
        if (panes.length <= 1) break;
        const idx = panes.findIndex((p) => p.id === emptyPane.id);
        const removedRatio = panes[idx].flexRatio;
        panes = panes.filter((p) => p.id !== emptyPane.id);
        const adjIdx = idx < panes.length ? idx : idx - 1;
        panes[adjIdx] = { ...panes[adjIdx], flexRatio: panes[adjIdx].flexRatio + removedRatio };
      }
    }

    let activePaneId = this.state.activePaneId;
    if (!panes.find((p) => p.id === activePaneId)) {
      activePaneId = panes[0].id;
    }

    this.update({ panes, activePaneId });

    if (wasActive && this.state.activeFile === null) {
      history.pushState(null, "", "/");
    }

    await this.loadFileTree();
  }
}

export const store = new Store();
