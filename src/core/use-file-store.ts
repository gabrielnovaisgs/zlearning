import {create} from "zustand";
import { HttpFileSystemService, type FileSystemService } from "./services/filesystem";
import { FileTreeEntry } from "./types";
interface FilesState {
    fileTree: FileTreeEntry[];
    loadFileTree: () => Promise<void>;
}
const fs: FileSystemService = new HttpFileSystemService();





export const useFileStore = create<FilesState>()((set) => ({
    fileTree: [],

    loadFileTree: async () => {
        const fileTree = await fs.listFiles();
        set({ fileTree });
    }
}));

