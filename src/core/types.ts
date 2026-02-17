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

export interface AppState {
  fileTree: FileTreeEntry[];
  activeFile: string | null;
  fileContent: string;
  loading: boolean;
  sidebarWidth: number;
  expandedDirs: Set<string>;
}
