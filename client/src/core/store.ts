import { create } from "zustand";
import type { AppState, Pane, Tab } from "./types";
import { useFileStore, resolveWikiLink } from "./use-file-store";
import {
  createUntitledFile,
  createDirectory,
  renameFile,
  moveFile,
  duplicateFile,
  deleteFile,
} from "./file-operations";

export { useFileStore };

const defaultPaneId = crypto.randomUUID();

function toUrlPath(path: string | null): string {
  return path ? "/" + path.replace(/\.(md|pdf)$/, "") : "/";
}

export function findPaneById(panes: Pane[], id: string): { pane: Pane; idx: number } | null {
  const idx = panes.findIndex((p) => p.id === id);
  return idx === -1 ? null : { pane: panes[idx], idx };
}

export function removePaneAt(panes: Pane[], idx: number): Pane[] {
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

export function update(partial: Partial<AppState>, urlMode: "push" | "replace" = "push") {
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

// ── Pane / Tab actions ─────────────────────────────────────────────────────

export function openFileInPane(path: string, paneId?: string) {
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

// ── Public API (backward-compatible) ──────────────────────────────────────

export const store = {
  getState: () => useAppStore.getState(),
  loadFileTree: () => useFileStore.getState().loadFileTree(),
  openFile: openFileInPane,
  openNewTab,
  closeTab,
  activateTab,
  setActivePaneId,
  splitPane,
  closePane,
  resizePane,
  moveTabToPane,
  resolveWikiLink,
  createUntitledFile,
  createDirectory,
  renameFile,
  moveFile,
  duplicateFile,
  deleteFile,
};
