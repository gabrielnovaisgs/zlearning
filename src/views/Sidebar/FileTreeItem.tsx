import { useState } from "react";
import type { FileTreeEntry } from "@core/types";
import { store } from "@core/store";
import { useStore } from "../hooks";

interface Props {
  entry: FileTreeEntry;
  depth: number;
  onContextMenu: (e: React.MouseEvent, entry: FileTreeEntry) => void;
}

export function FileTreeItem({ entry, depth, onContextMenu }: Props) {
  const { activeFile, expandedDirs } = useStore();
  const [dragOver, setDragOver] = useState(false);
  const isExpanded = expandedDirs.has(entry.path);
  const isActive = entry.path === activeFile;

  const handleClick = async () => {
    if (entry.type === "directory") {
      store.toggleDir(entry.path);
    } else {
      await store.openFile(entry.path);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", entry.path);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (entry.type !== "directory") return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving the button itself, not entering a child
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const sourcePath = e.dataTransfer.getData("text/plain");
    if (sourcePath && entry.type === "directory") {
      store.moveFile(sourcePath, entry.path);
    }
  };

  return (
    <div>
      <button
        draggable
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, entry)}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm transition-colors ${
          dragOver
            ? "bg-accent/20 text-accent"
            : isActive
              ? "bg-bg-surface text-accent"
              : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {entry.type === "directory" ? (
          <span className="text-xs text-text-muted">{isExpanded ? "▾" : "▸"}</span>
        ) : (
          <span className="text-xs text-text-muted">📄</span>
        )}
        <span className="truncate">
          {entry.type === "file" ? entry.name.replace(/\.md$/, "") : entry.name}
        </span>
      </button>
      {entry.type === "directory" && isExpanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeItem key={child.path} entry={child} depth={depth + 1} onContextMenu={onContextMenu} />
          ))}
        </div>
      )}
    </div>
  );
}
