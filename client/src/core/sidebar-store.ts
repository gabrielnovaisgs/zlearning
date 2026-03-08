import { create } from "zustand";

interface SidebarState {
  expandedDirs: Set<string>;
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  expandManyFolders: (paths: string[]) => void;
}

export const useSidebarStore = create<SidebarState>()((set, get) => ({
  expandedDirs: new Set<string>(),

  toggleFolder(path) {
    const next = new Set(get().expandedDirs);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    set({ expandedDirs: next });
  },

  expandFolder(path) {
    const { expandedDirs } = get();
    if (expandedDirs.has(path)) return;
    set({ expandedDirs: new Set([...expandedDirs, path]) });
  },

  expandManyFolders(paths) {
    const next = new Set(get().expandedDirs);
    let changed = false;
    for (const p of paths) {
      if (!next.has(p)) {
        next.add(p);
        changed = true;
      }
    }
    if (changed) set({ expandedDirs: next });
  },
}));
