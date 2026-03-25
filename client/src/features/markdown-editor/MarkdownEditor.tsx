import { useEffect, useRef, useState, useCallback } from "react";
import { createEditor, type EditorInstance } from "./setup";
import { fs } from "@shared/services/filesystem";
import { useFileStore } from "@shared/file.store";
import { useFileContent } from "@shared/hooks/use-files";
import { useThemeStore } from "@features/theme/theme.store";
import { ViewToggle } from "./ViewToggle";
import { MarkdownPreview } from "./MarkdownPreview";

type ViewMode = "edit" | "read";

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
        className="title-area cursor-text font-serif text-3xl font-normal tracking-tight leading-tight text-fg outline-none"
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
      className="title-area w-full bg-transparent font-serif text-3xl font-normal tracking-tight leading-tight text-fg outline-none"
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
  const mode  = useThemeStore((s) => s.mode);
  const theme = useThemeStore((s) => s.theme);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [readContent, setReadContent] = useState<string>("");

  // Keep ref in sync with prop
  useEffect(() => {
    filePathRef.current = filePath;
  }, [filePath]);

  // Reset to edit mode on file switch
  useEffect(() => {
    setViewMode("edit");
    setReadContent("");
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
  }, [mode, theme, scheduleSave]);

  // Load file content when filePath or content changes
  useEffect(() => {
    if (content === null || !editorRef.current) return;
    isExternalUpdate.current = true;
    editorRef.current.setContent(content);
    isExternalUpdate.current = false;
  }, [content, filePath]);

  const handleViewModeChange = useCallback((next: ViewMode) => {
    if (next === "read" && editorRef.current) {
      setReadContent(editorRef.current.getContent());
    }
    setViewMode(next);
  }, []);

  const handleCheckboxToggle = useCallback((index: number, checked: boolean) => {
    if (!editorRef.current) return;
    const current = editorRef.current.getContent();
    let count = 0;
    const updated = current.split("\n").map((line) => {
      if (/^(\s*(?:[-*+]|\d+\.)\s+)\[[ x]\]/i.test(line)) {
        if (count++ === index) {
          return line.replace(/\[[ x]\]/i, checked ? "[x]" : "[ ]");
        }
      }
      return line;
    });
    const newContent = updated.join("\n");

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    fs.writeFile(filePathRef.current, newContent);

    isExternalUpdate.current = true;
    editorRef.current.setContent(newContent);
    isExternalUpdate.current = false;

    setReadContent(newContent);
  }, []);

  return (
    <>
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Sticky toggle bar — inside scroll container so sticky works */}
        <div
          className="sticky top-0 z-10 flex justify-end px-12 py-2"
          style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}
        >
          <ViewToggle mode={viewMode} onChange={handleViewModeChange} />
        </div>

        <EditableTitle activeFile={filePath} />

        {/* CodeMirror — always mounted, hidden in read mode */}
        <div
          ref={containerRef}
          className="flex-1"
          style={{ display: viewMode === "read" ? "none" : undefined }}
        />

        {/* Preview — only mounted in read mode */}
        {viewMode === "read" && (
          <MarkdownPreview
            content={readContent}
            filePath={filePath}
            onCheckboxToggle={handleCheckboxToggle}
          />
        )}
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/80">
          <span className="text-fg-muted">Loading...</span>
        </div>
      )}
    </>
  );
}
