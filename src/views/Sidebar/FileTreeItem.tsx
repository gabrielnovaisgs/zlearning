import type { FileTreeEntry } from "@core/types";
import { store } from "@core/store";
import { useStore } from "../hooks";

interface Props {
  entry: FileTreeEntry;
  depth: number;
}

export function FileTreeItem({ entry, depth }: Props) {
  const { activeFile, expandedDirs } = useStore();
  const isExpanded = expandedDirs.has(entry.path);
  const isActive = entry.path === activeFile;

  const handleClick = async () => {
    if (entry.type === "directory") {
      store.toggleDir(entry.path);
    } else {
      await store.openFile(entry.path);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm transition-colors ${
          isActive
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
            <FileTreeItem key={child.path} entry={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
