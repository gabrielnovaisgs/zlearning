import { store } from "@core/store";
import { useStore } from "../hooks";
import { FileTree } from "./FileTree";
import { useCallback, useRef } from "react";

export function Sidebar() {
  const { sidebarWidth } = useStore();
  const resizing = useRef(false);

  const handleNewFile = async () => {
    const name = prompt("File name (e.g. notes/my-file.md):");
    if (!name) return;
    const path = name.endsWith(".md") ? name : `${name}.md`;
    await store.createFile(path);
  };

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
        <div className="flex-1 overflow-y-auto px-2">
          <FileTree />
        </div>
      </div>
      <div className="resize-handle" onMouseDown={handleMouseDown} />
    </div>
  );
}
