import {create} from "zustand";
import { HttpFileSystemService, type FileSystemService } from "./services/filesystem";
import { FileTreeEntry } from "./types";

const fs: FileSystemService = new HttpFileSystemService();



interface FilesState {
    fileTree: FileTreeEntry[];
    loadFileTree: () => Promise<void>;
}

export const useFileStore = create<FilesState>()((set) => ({
    fileTree: [],

    loadFileTree: async () => {
        const fileTree = await fs.listFiles();
        set({ fileTree });
    }
}));

export function resolveWikiLink(linkPath: string): string | null {
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
  return find(useFileStore.getState().fileTree);
}



