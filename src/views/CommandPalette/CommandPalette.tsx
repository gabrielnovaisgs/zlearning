import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { store } from "@core/store";
import { useStore } from "../hooks";
import { flattenFiles, fuzzyMatch } from "./fuzzy-match";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { fileTree } = useStore();

  const files = useMemo(() => flattenFiles(fileTree), [fileTree]);
  const results = useMemo(() => fuzzyMatch(query, files), [query, files]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  // Keep selected in bounds
  useEffect(() => {
    setSelected(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selected] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (results[selected]) {
          store.openFile(results[selected].path);
          onClose();
        }
        break;
      case "Escape":
        onClose();
        break;
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-bg-primary/80"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-bg-secondary border border-border rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Open file..."
          className="w-full px-4 py-3 bg-transparent text-text-primary placeholder-text-muted outline-none border-b border-border"
        />
        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {results.map((file, i) => (
            <div
              key={file.path}
              className={`px-4 py-2 cursor-pointer ${
                i === selected ? "bg-bg-hover" : ""
              }`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => {
                store.openFile(file.path);
                onClose();
              }}
            >
              <div className="text-sm text-text-primary">
                <HighlightedName name={file.name} matches={file.matches} />
              </div>
              <div className="text-xs text-text-muted">{file.path}</div>
            </div>
          ))}
          {results.length === 0 && query && (
            <div className="px-4 py-6 text-center text-text-muted text-sm">
              No files found
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function HighlightedName({ name, matches }: { name: string; matches: number[] }) {
  if (matches.length === 0) return <>{name}</>;

  const matchSet = new Set(matches);
  return (
    <>
      {[...name].map((char, i) =>
        matchSet.has(i) ? (
          <span key={i} className="text-accent font-semibold">
            {char}
          </span>
        ) : (
          <span key={i}>{char}</span>
        )
      )}
    </>
  );
}
