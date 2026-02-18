import { useEffect, useRef, useState, useCallback } from "react";
import { createEditor, type EditorInstance } from "@core/editor/setup";
import { store } from "@core/store";
import { PdfViewer } from "./PdfViewer";

interface Props {
  filePath: string | null;
  paneId: string;
  isFocused: boolean;
}

function fileTitle(path: string): string {
  const name = path.includes("/") ? path.substring(path.lastIndexOf("/") + 1) : path;
  return name.replace(/\.(md|pdf)$/, "");
}

function isPdf(path: string): boolean {
  return path.endsWith(".pdf");
}

function EditableTitle({ activeFile }: { activeFile: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(() => fileTitle(activeFile));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(fileTitle(activeFile));
    setEditing(false);
  }, [activeFile]);

  const commit = useCallback(() => {
    setEditing(false);
    const trimmed = value.trim();
    if (!trimmed || trimmed === fileTitle(activeFile)) {
      setValue(fileTitle(activeFile));
      return;
    }
    store.renameFile(activeFile, trimmed).then((ok) => {
      if (!ok) setValue(fileTitle(activeFile));
    });
  }, [value, activeFile]);

  if (!editing) {
    return (
      <h1
        onClick={() => {
          setEditing(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="title-area cursor-text text-3xl font-bold text-text-primary outline-none"
      >
        {value}
      </h1>
    );
  }

  return (
    <input
      ref={inputRef}
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
        if (e.key === "Escape") {
          setValue(fileTitle(activeFile));
          setEditing(false);
        }
      }}
      className="title-area w-full bg-transparent text-3xl font-bold text-text-primary outline-none"
    />
  );
}

export function EditorContainer({ filePath, isFocused: _isFocused }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const isExternalUpdate = useRef(false);
  const filePathRef = useRef(filePath);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);

  // Keep ref in sync with prop
  useEffect(() => {
    filePathRef.current = filePath;
  }, [filePath]);

  const scheduleSave = useCallback((path: string, content: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      store.fs.writeFile(path, content);
    }, 1000);
  }, []);

  // Create editor once
  useEffect(() => {
    if (!containerRef.current) return;

    const editor = createEditor(containerRef.current, (content) => {
      const path = filePathRef.current;
      if (!isExternalUpdate.current && path && !isPdf(path)) {
        scheduleSave(path, content);
      }
    });

    editorRef.current = editor;
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      editor.destroy();
    };
  }, [scheduleSave]);

  // Load file content when filePath changes
  useEffect(() => {
    if (!filePath || isPdf(filePath)) return;

    setLoading(true);
    store.fs.readFile(filePath).then(({ content }) => {
      if (editorRef.current) {
        isExternalUpdate.current = true;
        editorRef.current.setContent(content);
        isExternalUpdate.current = false;
      }
      setLoading(false);
    });
  }, [filePath]);

  const showMarkdown = !!filePath && !isPdf(filePath);
  const showPdf = !!filePath && isPdf(filePath);

  return (
    <div className="relative flex h-full flex-1 flex-col bg-bg-primary">
      {/* Markdown editor — wrapper always in DOM, toggled via display */}
      <div
        className="flex flex-1 flex-col overflow-y-auto"
        style={{ display: showMarkdown ? undefined : "none" }}
      >
        {showMarkdown && <EditableTitle activeFile={filePath} />}
        <div ref={containerRef} className="flex-1" />
      </div>

      {/* PDF viewer with notes panel */}
      {showPdf && <PdfViewer pdfPath={filePath} />}

      {/* Empty state */}
      {!filePath && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-text-muted">
            <div className="mb-2 text-4xl">📝</div>
            <p>Select a file to start editing</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/80">
          <span className="text-text-muted">Loading...</span>
        </div>
      )}
    </div>
  );
}
