import { create } from "zustand";
import type { AppState, Pane, Tab } from "./types";

// ── Module-private helpers ──────────────────────────────────────────────────

function toUrlPath(path: string | null): string {
  return path ? "/" + path.replace(/\.(md|pdf)$/, "") : "/";
}

function findPaneById(panes: Pane[], id: string): { pane: Pane; idx: number } | null {
  const idx = panes.findIndex((p) => p.id === id);
  return idx === -1 ? null : { pane: panes[idx], idx };
}

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

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface PaneActions {
  openFileInPane:  (path: string, paneId?: string) => void;
  openNewTab:      (paneId?: string) => void;
  closeTab:        (tabId: string, paneId: string) => void;
  activateTab:     (tabId: string, paneId: string) => void;
  setActivePaneId: (paneId: string) => void;
  splitPane:       (paneId: string, direction: "left" | "right", copyActiveTab?: boolean) => string;
  closePane:       (paneId: string) => void;
  resizePane:      (leftPaneId: string, rightPaneId: string, newLeft: number, newRight: number) => void;
  moveTabToPane:   (tabId: string, fromPaneId: string, toPaneId: string, index?: number) => void;
  updateTabPaths:  (oldPath: string, newPath: string) => void;
  removeTabPath:   (path: string) => void;
}

export interface PaneState extends AppState {
  actions: PaneActions;
}

// ── Store ───────────────────────────────────────────────────────────────────

const defaultPaneId = crypto.randomUUID();

export const usePaneController = create<PaneState>()((set, get) => {
  // commit: private to closure — derives activeFile and syncs URL
  function commit(partial: Partial<AppState>, urlMode: "push" | "replace" = "push") {
    const current = get();
    const next = { ...current, ...partial };
    const pane = findPaneById(next.panes, next.activePaneId)?.pane;
    const tab = pane?.tabs.find((t) => t.id === pane.activeTabId);
    const activeFile = tab?.path ?? null;
    const prevActiveFile = current.activeFile;
    set({ ...partial, activeFile });
    if (activeFile !== prevActiveFile) {
      const urlPath = toUrlPath(activeFile);
      if (location.pathname !== urlPath) {
        urlMode === "replace"
          ? history.replaceState(null, "", urlPath)
          : history.pushState(null, "", urlPath);
      }
    }
  }

  return {
    activeFile: null,
    activePaneId: defaultPaneId,
    panes: [{ id: defaultPaneId, tabs: [], activeTabId: null, flexRatio: 1 }],

    actions: {
      openFileInPane(path, paneId?) {
        const state = get();
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
        commit({ panes, activePaneId: targetPaneId });
      },

      openNewTab(paneId?) {
        const state = get();
        const targetPaneId = paneId ?? state.activePaneId;
        const panes = [...state.panes];
        const found = findPaneById(panes, targetPaneId);
        if (!found) return;
        const { pane, idx: paneIdx } = found;
        const newTab: Tab = { id: crypto.randomUUID(), path: null };
        panes[paneIdx] = { ...pane, tabs: [...pane.tabs, newTab], activeTabId: newTab.id };
        commit({ panes, activePaneId: targetPaneId });
      },

      closeTab(tabId, paneId) {
        const state = get();
        const panes = [...state.panes];
        const found = findPaneById(panes, paneId);
        if (!found) return;
        const { pane, idx: paneIdx } = found;
        const tabIdx = pane.tabs.findIndex((t) => t.id === tabId);
        if (tabIdx === -1) return;
        const newTabs = pane.tabs.filter((t) => t.id !== tabId);
        if (newTabs.length === 0 && panes.length > 1) {
          get().actions.closePane(paneId);
          return;
        }
        let newActiveTabId = pane.activeTabId;
        if (newActiveTabId === tabId) {
          newActiveTabId = newTabs.length === 0 ? null : newTabs[Math.min(tabIdx, newTabs.length - 1)].id;
        }
        panes[paneIdx] = { ...pane, tabs: newTabs, activeTabId: newActiveTabId };
        commit({ panes });
      },

      activateTab(tabId, paneId) {
        const panes = [...get().panes];
        const found = findPaneById(panes, paneId);
        if (!found) return;
        panes[found.idx] = { ...panes[found.idx], activeTabId: tabId };
        commit({ panes, activePaneId: paneId });
      },

      setActivePaneId(paneId) {
        if (get().activePaneId === paneId) return;
        commit({ activePaneId: paneId });
      },

      splitPane(paneId, direction, copyActiveTab = true) {
        const panes = [...get().panes];
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
        direction === "right" ? panes.splice(idx + 1, 0, newPane) : panes.splice(idx, 0, newPane);
        commit({ panes, activePaneId: newPaneId });
        return newPaneId;
      },

      closePane(paneId) {
        const state = get();
        const panes = [...state.panes];
        if (panes.length <= 1) return;
        const found = findPaneById(panes, paneId);
        if (!found) return;
        const newPanes = removePaneAt(panes, found.idx);
        const adjacentIdx = found.idx < newPanes.length ? found.idx : found.idx - 1;
        const activePaneId = state.activePaneId === paneId ? newPanes[adjacentIdx].id : state.activePaneId;
        commit({ panes: newPanes, activePaneId });
      },

      resizePane(leftPaneId, rightPaneId, newLeft, newRight) {
        const panes = get().panes.map((p) => {
          if (p.id === leftPaneId) return { ...p, flexRatio: newLeft };
          if (p.id === rightPaneId) return { ...p, flexRatio: newRight };
          return p;
        });
        commit({ panes });
      },

      moveTabToPane(tabId, fromPaneId, toPaneId, index?) {
        if (fromPaneId === toPaneId) return;
        const state = get();
        const fromPane = findPaneById(state.panes, fromPaneId)?.pane;
        const toPane = findPaneById(state.panes, toPaneId)?.pane;
        if (!fromPane || !toPane) return;
        const tab = fromPane.tabs.find((t) => t.id === tabId);
        if (!tab) return;
        const newFromTabs = fromPane.tabs.filter((t) => t.id !== tabId);
        const removedIdx = fromPane.tabs.findIndex((t) => t.id === tabId);
        const newFromActiveTabId =
          fromPane.activeTabId === tabId
            ? newFromTabs.length === 0 ? null : newFromTabs[Math.min(removedIdx, newFromTabs.length - 1)].id
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
        commit({ panes: newPanes, activePaneId: toPaneId });
      },

      updateTabPaths(oldPath, newPath) {
        const panes = get().panes.map((p) => ({
          ...p,
          tabs: p.tabs.map((t) => (t.path === oldPath ? { ...t, path: newPath } : t)),
        }));
        commit({ panes }, "replace");
      },

      removeTabPath(path) {
        let panes = get().panes.map((p) => {
          const newTabs = p.tabs.filter((t) => t.path !== path);
          let newActiveTabId = p.activeTabId;
          if (p.tabs.find((t) => t.id === p.activeTabId)?.path === path) {
            const oldIdx = p.tabs.findIndex((t) => t.id === p.activeTabId);
            newActiveTabId = newTabs.length > 0 ? newTabs[Math.min(oldIdx, newTabs.length - 1)].id : null;
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
        let activePaneId = get().activePaneId;
        if (!findPaneById(panes, activePaneId)) activePaneId = panes[0].id;
        commit({ panes, activePaneId });
      },
    },
  };
});
