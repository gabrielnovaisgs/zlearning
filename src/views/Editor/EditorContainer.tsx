import { useEffect, useRef, useState, useCallback } from "react";
import { createEditor, type EditorInstance } from "@core/editor/setup";
import { store } from "@core/store";
import { useStore } from "../hooks";

function fileTitle(path: string): string {
  const name = path.includes("/") ? path.substring(path.lastIndexOf("/") + 1) : path;
  return name.replace(/\.md$/, "");
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

export function EditorContainer() {
  const { activeFile, fileContent, loading } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const isExternalUpdate = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const editor = createEditor(containerRef.current, (content) => {
      if (!isExternalUpdate.current) {
        store.setFileContent(content);
      }
    });

    editorRef.current = editor;
    return () => editor.destroy();
  }, []);

  useEffect(() => {
    if (editorRef.current && activeFile) {
      isExternalUpdate.current = true;
      editorRef.current.setContent(fileContent);
      isExternalUpdate.current = false;
    }
  }, [activeFile]);

  return (
    <div className="relative flex h-full flex-1 flex-col bg-bg-primary overflow-y-auto">
      {activeFile ? (
        <>
          <EditableTitle activeFile={activeFile} />
          <div ref={containerRef} className="flex-1" />
        </>
      ) : (
        <>
          <div ref={containerRef} className="flex-1" style={{ display: "none" }} />
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center text-text-muted">
              <div className="mb-2 text-4xl">📝</div>
              <p>Select a file to start editing</p>
            </div>
          </div>
        </>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/80">
          <span className="text-text-muted">Loading...</span>
        </div>
      )}
    </div>
  );
}
