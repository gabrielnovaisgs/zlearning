import { useState, useRef, useEffect } from "react";
import type { FileTreeEntry } from "@shared/types";
import { usePaneController } from "@features/panes/pane-controller.store";
import { useFileStore } from "@shared/file.store";
import { useFileExplorerStore } from "./file-explorer.store";
import { FileText, BookOpen, Folder, FolderOpen, ChevronRight } from 'lucide-react';

interface Props {
  entry: FileTreeEntry;
  depth: number;
  renamingPath: string | null;
  onContextMenu: (e: React.MouseEvent, entry: FileTreeEntry) => void;
  onStartRename: (path: string) => void;
  onEndRename: () => void;
}

function FileIcon({ path, isOpen }: { path: string; isOpen?: boolean }) {
  if (!path) return null;
  if (path.endsWith('.pdf')) {
    return <BookOpen size={14} strokeWidth={1.75} className="shrink-0 text-[#E07B54]" />;
  }
  if (isOpen !== undefined) {
    return isOpen
      ? <FolderOpen size={14} strokeWidth={1.75} className="shrink-0 text-accent" />
      : <Folder size={14} strokeWidth={1.75} className="shrink-0 text-fg-muted" />;
  }
  return <FileText size={14} strokeWidth={1.75} className="shrink-0 text-fg-secondary" />;
}

export function FileTreeItem({ entry, depth, renamingPath, onContextMenu, onStartRename, onEndRename }: Props) {
  const activeFile = usePaneController((state) => state.activeFile);

  const [dragOver, setDragOver] = useState(false);
  const expanded = useFileExplorerStore((state) => state.expandedDirs.has(entry.path));
  const toggle = useFileExplorerStore((state) => state.toggleFolder);

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
        className={`
          flex w-full items-center gap-1.5 rounded-md mx-1.5 px-2 py-1 text-left text-sm
          transition-colors cursor-pointer select-none
          ${dragOver
            ? 'bg-accent/10 text-fg'
            : isActive
              ? 'bg-accent/10 text-fg border-l-2 border-accent pl-[6px]'
              : 'text-fg-secondary hover:bg-surface-2 hover:text-fg border-l-2 border-transparent pl-[6px]'
          }
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {entry.type === "directory" ? (
          <>
            <ChevronRight
              size={12}
              strokeWidth={2.5}
              className={`shrink-0 text-fg-muted transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
            <FileIcon path={entry.path} isOpen={expanded} />
          </>
        ) : (
          <FileIcon path={entry.path} />
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
            className="flex-1 min-w-0 bg-bg rounded px-1 text-sm text-fg outline-none border border-accent"
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
