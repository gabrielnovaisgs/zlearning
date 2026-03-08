import type { FileTreeEntry } from "@shared/types";
import { useFileStore } from "@shared/file.store";
import { FileTree } from "./FileTree";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { useCallback, useState } from "react";
import { GLOBAL_CONFIG } from "@app/config";
import { Sidebar, SidebarContent, SidebarHeader } from "@shared/ui/sidebar";

interface MenuState {
  x: number;
  y: number;
  entry: FileTreeEntry | null;
}

export function FileExplorer() {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);

  const contextDir = (entry: FileTreeEntry | null): string => {
    if (!entry) return "";
    if (entry.type === "directory") return entry.path;
    return entry.path.includes("/") ? entry.path.substring(0, entry.path.lastIndexOf("/")) : "";
  };

  const handleNewFile = async (dir: string) => {
    await useFileStore.getState().actions.createUntitledFile(dir);
  };

  const handleNewDirectory = async (dir: string) => {
    const name = prompt("Folder name:");
    if (!name) return;
    const path = dir ? `${dir}/${name}` : name;
    await useFileStore.getState().actions.createDirectory(path);
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileTreeEntry | null) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, entry });
  }, []);

  const menuItems: MenuItem[] = [];
  if (menu) {
    const dir = contextDir(menu.entry);
    if (menu.entry) {
      menuItems.push({ label: "Rename", action: () => setRenamingPath(menu.entry!.path) });
    }
    if (menu.entry?.type === "file") {
      menuItems.push({ label: "Duplicate", action: () => useFileStore.getState().actions.duplicateFile(menu.entry!.path) });
    }
    if (menu.entry) {
      menuItems.push({ label: "Delete", action: () => useFileStore.getState().actions.deleteFile(menu.entry!.path) });
    }
    menuItems.push({ label: "New file", action: () => handleNewFile(dir) });
    menuItems.push({ label: "New folder", action: () => handleNewDirectory(dir) });
  }

  return (
    <>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="flex flex-row items-center justify-between border-b border-sidebar-border px-4 py-3">
          <h1 className="text-sm font-semibold text-sidebar-foreground">{GLOBAL_CONFIG.appName}</h1>
          <button
            onClick={() => handleNewFile("")}
            className="rounded px-2 py-0.5 text-lg text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            title="New file"
          >
            +
          </button>
        </SidebarHeader>
        <SidebarContent
          className="px-2 py-1"
          onContextMenu={(e) => {
            if (e.target === e.currentTarget) {
              handleContextMenu(e, null);
            }
          }}
        >
          <FileTree
            onContextMenu={handleContextMenu}
            renamingPath={renamingPath}
            onStartRename={setRenamingPath}
            onEndRename={() => setRenamingPath(null)}
          />
        </SidebarContent>
      </Sidebar>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}
