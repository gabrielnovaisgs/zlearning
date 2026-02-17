import { store } from "@core/store";
import type { FileTreeEntry } from "@core/types";
import { useStore } from "../hooks";
import { FileTree } from "./FileTree";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { useCallback, useRef, useState } from "react";

interface MenuState {
  x: number;
  y: number;
  entry: FileTreeEntry | null;
}

export function Sidebar() {
  const { sidebarWidth } = useStore();
  const resizing = useRef(false);
  const [menu, setMenu] = useState<MenuState | null>(null);

  const handleNewFile = async () => {
    const name = prompt("File name (e.g. notes/my-file.md):");
    if (!name) return;
    const path = name.endsWith(".md") ? name : `${name}.md`;
    await store.createFile(path);
  };

  const handleNewDirectory = async () => {
    const name = prompt("Folder name (e.g. notes/subfolder):");
    if (!name) return;
    await store.createDirectory(name);
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileTreeEntry | null) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, entry });
  }, []);

  const menuItems: MenuItem[] = [];
  if (menu) {
    if (menu.entry?.type === "file") {
      menuItems.push({ label: "Duplicate", action: () => store.duplicateFile(menu.entry!.path) });
      menuItems.push({ label: "Delete", action: () => store.deleteFile(menu.entry!.path) });
    }
    menuItems.push({ label: "New file", action: handleNewFile });
    menuItems.push({ label: "New folder", action: handleNewDirectory });
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;

    const onMouseMove = (e: MouseEvent) => {
      if (resizing.current) {
        store.setSidebarWidth(e.clientX);
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
          <h1 className="text-sm font-semibold text-text-primary">Study MD</h1>
          <button
            onClick={handleNewFile}
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
          <FileTree onContextMenu={handleContextMenu} />
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
