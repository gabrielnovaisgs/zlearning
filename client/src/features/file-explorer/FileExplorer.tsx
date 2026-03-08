import type { FileTreeEntry } from "@shared/types";
import { useFileStore } from "@shared/file.store";
import { FileTree } from "./FileTree";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { useCallback, useRef, useState } from "react";
import { GLOBAL_CONFIG } from "@app/config";

interface MenuState {
  x: number;
  y: number;
  entry: FileTreeEntry | null;
}

export function FileExplorer() {
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const resizing = useRef(false);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);

  /** Resolve the directory from the context menu target */
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;

    const onMouseMove = (e: MouseEvent) => {
      if (resizing.current) {
        setSidebarWidth(Math.max(180, Math.min(500, e.clientX)));
      }
    };
    const onMouseUp = () => {
      resizing.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  return (
    <div className="flex h-full shrink-0" style={{ width: sidebarWidth }}>
      <div className="flex h-full flex-1 flex-col overflow-hidden bg-bg-secondary">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h1 className="text-sm font-semibold text-text-primary">{GLOBAL_CONFIG.appName}</h1>
          <button
            onClick={() => handleNewFile("")}
            className="rounded px-2 py-0.5 text-lg text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
            title="New file"
          >
            +
          </button>
        </div>
        <div
          className="flex-1 overflow-y-auto px-2"
          onContextMenu={(e) => {
            // Empty area context menu
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
        </div>
      </div>
      <div className="resize-handle" onMouseDown={handleMouseDown} />
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
