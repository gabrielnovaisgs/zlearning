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
  path: string;
}

export interface Pane {
  id: string;
  tabs: Tab[];
  activeTabId: string | null;
  /** Proportional width in flex container. Sum of all ratios = total flex units. */
  flexRatio: number;
}

export interface AppState {
  fileTree: FileTreeEntry[];
  /** Derived: active pane → active tab → path */
  activeFile: string | null;
  loading: boolean;
  sidebarWidth: number;
  expandedDirs: Set<string>;
  pdfHighlightTarget: string | null;
  panes: Pane[];
  activePaneId: string;
}
