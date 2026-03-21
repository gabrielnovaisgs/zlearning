import { useEffect, useRef, useState, useCallback } from "react";
import { createEditor, type EditorInstance } from "./setup";
import { fs } from "@shared/services/filesystem";
import { useFileStore } from "@shared/file.store";
import { useFileContent } from "@shared/hooks/use-files";
import { useThemeStore } from "@features/theme/theme.store";

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
        className="title-area cursor-text font-serif text-[32px] font-normal tracking-[-0.02em] leading-[1.2] text-fg outline-none"
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
      className="title-area w-full bg-transparent font-serif text-[32px] font-normal tracking-[-0.02em] leading-[1.2] text-fg outline-none"
    />
  );
}

export function MarkdownEditor({ filePath }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const isExternalUpdate = useRef(false);
  const filePathRef = useRef(filePath);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { content, isLoading } = useFileContent(filePath);
  const mode = useThemeStore((s) => s.mode);

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

  // Rebuild editor when theme mode changes to pick up new CSS vars
  useEffect(() => {
    if (!containerRef.current || !editorRef.current) return;
    const currentContent = editorRef.current.getContent();
    editorRef.current.destroy();

    const editor = createEditor(containerRef.current, (content) => {
      const path = filePathRef.current;
      if (!isExternalUpdate.current && path) {
        scheduleSave(path, content);
      }
    });

    isExternalUpdate.current = true;
    editor.setContent(currentContent);
    isExternalUpdate.current = false;
    editorRef.current = editor;
  }, [mode, scheduleSave]);

  // Load file content when filePath or content changes
  useEffect(() => {
    if (content === null || !editorRef.current) return;
    isExternalUpdate.current = true;
    editorRef.current.setContent(content);
    isExternalUpdate.current = false;
  }, [content, filePath]);

  return (
    <>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <EditableTitle activeFile={filePath} />
        <div ref={containerRef} className="flex-1" />
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/80">
          <span className="text-fg-muted">Loading...</span>
        </div>
      )}
    </>
  );
}
