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

export interface PdfHighlight {
  id: string;
  page: number;
  text: string;
  color: string;
  rects: Array<{ x: number; y: number; width: number; height: number }>;
}

export interface AppState {
  fileTree: FileTreeEntry[];
  activeFile: string | null;
  fileContent: string;
  loading: boolean;
  sidebarWidth: number;
  expandedDirs: Set<string>;
  pdfHighlightTarget: string | null;
}
