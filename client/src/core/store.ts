import { create } from "zustand";
import type { AppState, Pane, Tab } from "./types";
import { HttpFileSystemService, type FileSystemService } from "./services/filesystem";
import { useSidebarStore } from "./sidebar-store";
import { useFileStore, resolveWikiLink } from "./use-file-store";

export { useFileStore };

const defaultPaneId = crypto.randomUUID();

function toUrlPath(path: string | null): string {
  return path ? "/" + path.replace(/\.(md|pdf)$/, "") : "/";
}

function findPaneById(panes: Pane[], id: string): { pane: Pane; idx: number } | null {
  const idx = panes.findIndex((p) => p.id === id);
  return idx === -1 ? null : { pane: panes[idx], idx };
}

const loadFileTree = () => useFileStore.getState().loadFileTree()

/** Remove the pane at `idx`, distributing its flexRatio to the adjacent pane. */
function removePaneAt(panes: Pane[], idx: number): Pane[] {
  const removedRatio = panes[idx].flexRatio;
  const result = panes.filter((_, i) => i !== idx);
  const adjacentIdx = idx < result.length ? idx : idx - 1;
  result[adjacentIdx] = {
    ...result[adjacentIdx],
    flexRatio: result[adjacentIdx].flexRatio + removedRatio,
  };
  return result;
}



// ── Zustand store ──────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(() => ({
  activeFile: null,
  activePaneId: defaultPaneId,
  panes: [{ id: defaultPaneId, tabs: [], activeTabId: null, flexRatio: 1 }],
}));


// ── Internal helpers ───────────────────────────────────────────────────────

function update(partial: Partial<AppState>, urlMode: "push" | "replace" = "push") {
  const current = useAppStore.getState();
  const next = { ...current, ...partial };
  const pane = findPaneById(next.panes, next.activePaneId)?.pane;
  const tab = pane?.tabs.find((t) => t.id === pane.activeTabId);
  const activeFile = tab?.path ?? null;
  const prevActiveFile = current.activeFile;

  useAppStore.setState({ ...partial, activeFile });

  if (activeFile !== prevActiveFile) {
    const urlPath = toUrlPath(activeFile);
    if (location.pathname !== urlPath) {
      if (urlMode === "replace") {
        history.replaceState(null, "", urlPath);
      } else {
        history.pushState(null, "", urlPath);
      }
    }
  }
}

// ── Actions ────────────────────────────────────────────────────────────────

const fs: FileSystemService = new HttpFileSystemService();



function openFileInPane(path: string, paneId?: string) {
  const state = useAppStore.getState();
  const targetPaneId = paneId ?? state.activePaneId;
  const panes = [...state.panes];
  const found = findPaneById(panes, targetPaneId);
  if (!found) return;
  const { pane, idx: paneIdx } = found;

  const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId);
  const existingTab = pane.tabs.find((t) => t.path === path);

  if (activeTab && activeTab.path === null) {
    if (existingTab) {
      const newTabs = pane.tabs.filter((t) => t.id !== activeTab.id);
      panes[paneIdx] = { ...pane, tabs: newTabs, activeTabId: existingTab.id };
    } else {
      panes[paneIdx] = {
        ...pane,
        tabs: pane.tabs.map((t) => (t.id === activeTab.id ? { ...t, path } : t)),
        activeTabId: activeTab.id,
      };
    }
  } else {
    if (existingTab) {
      panes[paneIdx] = { ...pane, activeTabId: existingTab.id };
    } else {
      const newTab: Tab = { id: crypto.randomUUID(), path };
      panes[paneIdx] = { ...pane, tabs: [...pane.tabs, newTab], activeTabId: newTab.id };
    }
  }

  update({ panes, activePaneId: targetPaneId });
}

function openNewTab(paneId?: string) {
  const state = useAppStore.getState();
  const targetPaneId = paneId ?? state.activePaneId;
  const panes = [...state.panes];
  const found = findPaneById(panes, targetPaneId);
  if (!found) return;
  const { pane, idx: paneIdx } = found;

  const newTab: Tab = { id: crypto.randomUUID(), path: null };
  panes[paneIdx] = { ...pane, tabs: [...pane.tabs, newTab], activeTabId: newTab.id };
  update({ panes, activePaneId: targetPaneId });
}

// ── Tab/Pane management ────────────────────────────────────────────────────

function closeTab(tabId: string, paneId: string) {
  const state = useAppStore.getState();
  const panes = [...state.panes];
  const found = findPaneById(panes, paneId);
  if (!found) return;
  const { pane, idx: paneIdx } = found;

  const tabIdx = pane.tabs.findIndex((t) => t.id === tabId);
  if (tabIdx === -1) return;

  const newTabs = pane.tabs.filter((t) => t.id !== tabId);

  if (newTabs.length === 0 && panes.length > 1) {
    closePane(paneId);
    return;
  }

  let newActiveTabId = pane.activeTabId;
  if (newActiveTabId === tabId) {
    newActiveTabId =
      newTabs.length === 0 ? null : newTabs[Math.min(tabIdx, newTabs.length - 1)].id;
  }

  panes[paneIdx] = { ...pane, tabs: newTabs, activeTabId: newActiveTabId };
  update({ panes });
}

function activateTab(tabId: string, paneId: string) {
  const panes = [...useAppStore.getState().panes];
  const found = findPaneById(panes, paneId);
  if (!found) return;
  const { idx: paneIdx } = found;

  panes[paneIdx] = { ...panes[paneIdx], activeTabId: tabId };
  update({ panes, activePaneId: paneId });
}

function setActivePaneId(paneId: string) {
  if (useAppStore.getState().activePaneId === paneId) return;
  update({ activePaneId: paneId });
}

/** Creates a new pane adjacent to paneId. Copies the active tab by default. Returns new pane id. */
function splitPane(paneId: string, direction: "left" | "right", copyActiveTab = true): string {
  const panes = [...useAppStore.getState().panes];
  const found = findPaneById(panes, paneId);
  if (!found) return "";
  const { pane: sourcePane, idx } = found;
  const activeTab = sourcePane.tabs.find((t) => t.id === sourcePane.activeTabId);
  const newRatio = sourcePane.flexRatio / 2;

  const newTabEntry: Tab | undefined =
    copyActiveTab && activeTab && activeTab.path !== null
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

  update({ panes, activePaneId: newPaneId });
  return newPaneId;
}

function closePane(paneId: string) {
  const state = useAppStore.getState();
  const panes = [...state.panes];
  if (panes.length <= 1) return;

  const found = findPaneById(panes, paneId);
  if (!found) return;
  const { idx } = found;

  const newPanes = removePaneAt(panes, idx);
  const adjacentIdx = idx < newPanes.length ? idx : idx - 1;

  let activePaneId = state.activePaneId;
  if (activePaneId === paneId) {
    activePaneId = newPanes[adjacentIdx].id;
  }

  update({ panes: newPanes, activePaneId });
}

function resizePane(
  leftPaneId: string,
  rightPaneId: string,
  newLeftRatio: number,
  newRightRatio: number,
) {
  const panes = useAppStore.getState().panes.map((p) => {
    if (p.id === leftPaneId) return { ...p, flexRatio: newLeftRatio };
    if (p.id === rightPaneId) return { ...p, flexRatio: newRightRatio };
    return p;
  });
  update({ panes });
}

function moveTabToPane(tabId: string, fromPaneId: string, toPaneId: string, index?: number) {
  if (fromPaneId === toPaneId) return;

  const state = useAppStore.getState();
  const fromPane = findPaneById(state.panes, fromPaneId)?.pane;
  const toPane = findPaneById(state.panes, toPaneId)?.pane;
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

  let newPanes = state.panes.map((p) => {
    if (p.id === fromPaneId) return { ...p, tabs: newFromTabs, activeTabId: newFromActiveTabId };
    if (p.id === toPaneId) return { ...p, tabs: newToTabs, activeTabId: tab.id };
    return p;
  });

  if (newFromTabs.length === 0 && newPanes.length > 1) {
    const fromIdx = findPaneById(newPanes, fromPaneId)!.idx;
    newPanes = removePaneAt(newPanes, fromIdx);
  }

  update({ panes: newPanes, activePaneId: toPaneId });
}

// ── File operations ────────────────────────────────────────────────────────


async function createUntitledFile(dir: string) {
  if (dir) useSidebarStore.getState().expandFolder(dir);
  const { path } = await fs.createUntitled(dir);
  await loadFileTree();
  openFileInPane(path);
}


async function createDirectory(path: string) {
  await fs.createDirectory(path);
  await loadFileTree();
  const parts = path.split("/");
  const toExpand: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    toExpand.push(parts.slice(0, i).join("/"));
  }
  useSidebarStore.getState().expandManyFolders(toExpand);
}

async function renameFile(oldPath: string, newName: string): Promise<boolean> {
  try {
    const { newPath } = await fs.renameFile(oldPath, newName);
    await loadFileTree();
    const panes = useAppStore.getState().panes.map((p) => ({
      ...p,
      tabs: p.tabs.map((t) => (t.path === oldPath ? { ...t, path: newPath } : t)),
    }));
    update({ panes }, "replace");
    return true;
  } catch (err: any) {
    if (err.message?.includes("409") || err.message?.includes("Conflict")) {
      alert(`"${newName}" already exists in this folder.`);
    }
    return false;
  }
}

/** Move a file or directory to a target directory (empty string = root) */
async function moveFile(sourcePath: string, targetDir: string) {
  try {
    const { newPath } = await fs.moveFile(sourcePath, targetDir);
    if (targetDir) useSidebarStore.getState().expandFolder(targetDir);
    await loadFileTree();
    const panes = useAppStore.getState().panes.map((p) => ({
      ...p,
      tabs: p.tabs.map((t) => (t.path === sourcePath ? { ...t, path: newPath } : t)),
    }));
    update({ panes }, "replace");
  } catch (err: any) {
    if (err.message?.includes("409") || err.message?.includes("Conflict")) {
      const name = sourcePath.includes("/")
        ? sourcePath.substring(sourcePath.lastIndexOf("/") + 1)
        : sourcePath;
      alert(`"${name}" already exists in the destination folder.`);
    }
  }
}

async function duplicateFile(path: string) {
  const { newPath } = await fs.duplicateFile(path);
  await loadFileTree();
  openFileInPane(newPath);
}

async function deleteFile(path: string) {
  await fs.deleteFile(path);

  let panes = useAppStore.getState().panes.map((p) => {
    const newTabs = p.tabs.filter((t) => t.path !== path);
    let newActiveTabId = p.activeTabId;
    if (p.tabs.find((t) => t.id === p.activeTabId)?.path === path) {
      const oldIdx = p.tabs.findIndex((t) => t.id === p.activeTabId);
      newActiveTabId =
        newTabs.length > 0 ? newTabs[Math.min(oldIdx, newTabs.length - 1)].id : null;
    }
    return { ...p, tabs: newTabs, activeTabId: newActiveTabId };
  });

  if (panes.length > 1) {
    for (const emptyPane of panes.filter((p) => p.tabs.length === 0)) {
      if (panes.length <= 1) break;
      const idx = panes.findIndex((p) => p.id === emptyPane.id);
      panes = removePaneAt(panes, idx);
    }
  }

  let activePaneId = useAppStore.getState().activePaneId;
  if (!findPaneById(panes, activePaneId)) {
    activePaneId = panes[0].id;
  }

  update({ panes, activePaneId });
  await loadFileTree();
}

// ── Public API (backward-compatible) ──────────────────────────────────────

export const store = {
  fs,
  getState: () => useAppStore.getState(),
  loadFileTree,
  openFile: openFileInPane,
  openNewTab,
  closeTab,
  activateTab,
  setActivePaneId,
  splitPane,
  closePane,
  resizePane,
  moveTabToPane,
  createUntitledFile,
  resolveWikiLink,
  createDirectory,
  renameFile,
  moveFile,
  duplicateFile,
  deleteFile,
};
