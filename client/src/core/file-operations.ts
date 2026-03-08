import { HttpFileSystemService } from "./services/filesystem";
import { useAppStore, openFileInPane, update, findPaneById, removePaneAt } from "./store";
import { useFileStore } from "./use-file-store";
import { useSidebarStore } from "./sidebar-store";

const fs = new HttpFileSystemService();

const loadFileTree = () => useFileStore.getState().loadFileTree();

export async function createUntitledFile(dir: string) {
  if (dir) useSidebarStore.getState().expandFolder(dir);
  const { path } = await fs.createUntitled(dir);
  await loadFileTree();
  openFileInPane(path);
}


export async function writeFile(path: string, content: string) {
  await fs.writeFile(path, content);
}

export async function readFile(path: string) {
  return await fs.readFile(path); 
}

export async function createFile(path: string, content = "") {
  await fs.createFile(path, content);
  await loadFileTree()
}

export async function createDirectory(path: string) {
  await fs.createDirectory(path);
  await loadFileTree();
  const parts = path.split("/");
  const toExpand: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    toExpand.push(parts.slice(0, i).join("/"));
  }
  useSidebarStore.getState().expandManyFolders(toExpand);
}

export async function renameFile(oldPath: string, newName: string): Promise<boolean> {
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

export async function moveFile(sourcePath: string, targetDir: string) {
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

export async function duplicateFile(path: string) {
  const { newPath } = await fs.duplicateFile(path);
  await loadFileTree();
  openFileInPane(newPath);
}

export async function deleteFile(path: string) {
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
