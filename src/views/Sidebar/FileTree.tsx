import { useStore } from "../hooks";
import { FileTreeItem } from "./FileTreeItem";

export function FileTree() {
  const { fileTree } = useStore();

  if (fileTree.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-text-muted">
        No markdown files found.
        <br />
        Add .md files to the docs/ folder.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 py-2">
      {fileTree.map((entry) => (
        <FileTreeItem key={entry.path} entry={entry} depth={0} />
      ))}
    </div>
  );
}
