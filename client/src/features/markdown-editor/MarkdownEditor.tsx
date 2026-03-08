import { useEffect, useRef, useState, useCallback } from "react";
import { createEditor, type EditorInstance } from "./setup";
import { fs } from "@shared/services/filesystem";
import { useFileStore } from "@shared/file.store";

interface Props {
  filePath: string;
}

function fileTitle(path: string): string {
  const name = path.includes("/") ? path.substring(path.lastIndexOf("/") + 1) : path;
  return name.replace(/\.(md|pdf)$/, "");
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
    
    useFileStore.getState().actions.renameFile(activeFile, trimmed).then((ok) => {
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

export function MarkdownEditor({ filePath }: Props) {
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
      
      fs.writeFile(path, content);
    }, 1000);
  }, []);

  // Create editor once
  useEffect(() => {
    if (!containerRef.current) return;

    const editor = createEditor(containerRef.current, (content) => {
      const path = filePathRef.current;
      if (!isExternalUpdate.current && path) {
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
    setLoading(true);
    fs.readFile(filePath).then(({ content }) => {
      if (editorRef.current) {
        isExternalUpdate.current = true;
        editorRef.current.setContent(content);
        isExternalUpdate.current = false;
      }
      setLoading(false);
    });
  }, [filePath]);

  return (
    <>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <EditableTitle activeFile={filePath} />
        <div ref={containerRef} className="flex-1" />
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/80">
          <span className="text-text-muted">Loading...</span>
        </div>
      )}
    </>
  );
}
