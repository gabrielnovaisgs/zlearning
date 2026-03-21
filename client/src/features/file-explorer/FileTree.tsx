import { useState } from "react";
import type { FileTreeEntry } from "@shared/types";
import { FileTreeItem } from "./FileTreeItem";
import { useFileStore } from "@shared/file.store";
import { useFiles } from "@shared/hooks/use-files";

interface Props {
  onContextMenu: (e: React.MouseEvent, entry: FileTreeEntry | null) => void;
  renamingPath: string | null;
  onStartRename: (path: string) => void;
  onEndRename: () => void;
}

export function FileTree({ onContextMenu, renamingPath, onStartRename, onEndRename }: Props) {
  const { fileTree } = useFiles();
  const [dragOver, setDragOver] = useState(false);

  if (fileTree.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-fg-muted">
        No markdown files found.
        <br />
        Add .md files to the docs/ folder.
      </div>
    );
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (e.target === e.currentTarget) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.target === e.currentTarget) {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const sourcePath = e.dataTransfer.getData("text/plain");
    if (sourcePath) {
      useFileStore.getState().actions.moveFile(sourcePath, "");
    }
  };

  return (
    <div
      className={`flex min-h-full flex-col gap-0.5 py-2 ${dragOver ? "bg-accent/10 rounded-md" : ""}`}
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          onContextMenu(e, null);
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {fileTree.map((entry) => (
        <FileTreeItem
          key={entry.path}
          entry={entry}
          depth={0}
          renamingPath={renamingPath}
          onContextMenu={onContextMenu}
          onStartRename={onStartRename}
          onEndRename={onEndRename}
        />
      ))}
    </div>
  );
}
