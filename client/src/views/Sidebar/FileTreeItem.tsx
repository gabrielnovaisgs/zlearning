import { useState, useRef, useEffect } from "react";
import type { FileTreeEntry } from "@core/types";
import { usePaneController } from "@core/use-pane-controller-store";
import { useFileStore } from "@core/use-file-store";
import { useSidebarStore } from "@core/sidebar-store";



interface Props {
  entry: FileTreeEntry;
  depth: number;
  renamingPath: string | null;
  onContextMenu: (e: React.MouseEvent, entry: FileTreeEntry) => void;
  onStartRename: (path: string) => void;
  onEndRename: () => void;
}

export function FileTreeItem({ entry, depth, renamingPath, onContextMenu, onStartRename, onEndRename }: Props) {
  const activeFile = usePaneController((state) => state.activeFile);

  const [dragOver, setDragOver] = useState(false);
  const expanded = useSidebarStore((state) => state.expandedDirs.has(entry.path));
  const toggle = useSidebarStore((state) => state.toggleFolder);

  const isActive = entry.path === activeFile;
  const isRenaming = renamingPath === entry.path;

  const displayName = entry.type === "file" ? entry.name.replace(/\.(md|pdf)$/, "") : entry.name;
  const [renameValue, setRenameValue] = useState(displayName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setRenameValue(displayName);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isRenaming]);

  const commitRename = () => {
    onEndRename();
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === displayName) return;
    useFileStore.getState().actions.renameFile(entry.path, trimmed);
  };

  const handleClick = async () => {
    if (entry.type === "directory") {
      toggle(entry.path);
    } else {
      usePaneController.getState().actions.openFileInPane(entry.path);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onStartRename(entry.path);
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
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const sourcePath = e.dataTransfer.getData("text/plain");
    if (sourcePath && entry.type === "directory") {
      useFileStore.getState().actions.moveFile(sourcePath, entry.path);
    }
  };

  return (
    <div>
      <button
        draggable={!isRenaming}
        onClick={isRenaming ? undefined : handleClick}
        onDoubleClick={handleDoubleClick}
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
          <span className="text-xs text-text-muted">{expanded ? "▾" : "▸"}</span>
        ) : (
          <span className="text-xs text-text-muted">{entry.name.endsWith(".pdf") ? "📕" : "📄"}</span>
        )}
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              }
              if (e.key === "Escape") {
                onEndRename();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-bg-primary rounded px-1 text-sm text-text-primary outline-none border border-accent"
          />
        ) : (
          <span className="truncate">{displayName}</span>
        )}
      </button>
      {entry.type === "directory" && expanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeItem
              key={child.path}
              entry={child}
              depth={depth + 1}
              renamingPath={renamingPath}
              onContextMenu={onContextMenu}
              onStartRename={onStartRename}
              onEndRename={onEndRename}
            />
          ))}
        </div>
      )}
    </div>
  );
}
