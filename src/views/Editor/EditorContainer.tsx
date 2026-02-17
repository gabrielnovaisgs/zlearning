import { useEffect, useRef } from "react";
import { createEditor, type EditorInstance } from "@core/editor/setup";
import { store } from "@core/store";
import { useStore } from "../hooks";

export function EditorContainer() {
  const { activeFile, fileContent, loading } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const isExternalUpdate = useRef(false);

  // Create editor once
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

  // Update content when file changes
  useEffect(() => {
    if (editorRef.current && activeFile) {
      isExternalUpdate.current = true;
      editorRef.current.setContent(fileContent);
      isExternalUpdate.current = false;
    }
  }, [activeFile]);

  return (
    <div className="relative flex h-full flex-1 flex-col bg-bg-primary">
      {activeFile ? (
        <div className="flex items-center border-b border-border px-4 py-2">
          <span className="text-sm text-text-muted">{activeFile}</span>
        </div>
      ) : null}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ display: activeFile ? undefined : "none" }}
      />
      {!activeFile && (
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
