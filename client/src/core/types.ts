export interface FileTreeEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeEntry[];
}

export interface FileContent {
  content: string;
  path: string;
}

export interface Tab {
  id: string;
  /** null = new-tab placeholder (no file selected yet) */
  path: string | null;
}

export interface Pane {
  id: string;
  tabs: Tab[];
  activeTabId: string | null;
  /** Proportional width in flex container. Sum of all ratios = total flex units. */
  flexRatio: number;
}

export interface AppState {
  /** Derived: active pane → active tab → path */
  activeFile: string | null;
  panes: Pane[];
  activePaneId: string;
}
