import { useEffect, useRef, useCallback } from "react";
import { createEditor, type EditorInstance } from "@core/editor/setup";
import { HttpFileSystemService } from "@core/services/filesystem";
import { store } from "@core/store";
import { createFile, readFile, writeFile } from "@core/file-operations";

export type { EditorInstance } from "@core/editor/setup";


function notesPathFor(pdfPath: string): string {
  const dir = pdfPath.includes("/")
    ? pdfPath.substring(0, pdfPath.lastIndexOf("/") + 1)
    : "";
  const name = pdfPath.includes("/")
    ? pdfPath.substring(pdfPath.lastIndexOf("/") + 1)
    : pdfPath;
  const base = name.replace(/\.pdf$/, "");
  return `${dir}notes-${base}.md`;
}

function frontmatter(pdfPath: string): string {
  return `---\npdf: "[[${pdfPath.replace(/\.pdf$/, "")}]]"\n---\n\n`;
}

export function buildCitation(text: string, page: number, id: string): string {
  return `\n> ${text.replace(/\n/g, " ")}\n>\n> — [p. ${page}](pdf-highlight://${id})\n\n`;
}

export interface PdfNotesEditorProps {
  pdfPath: string;
  onEditorReady?: (editor: EditorInstance) => void;
}

export function PdfNotesEditor({ pdfPath, onEditorReady }: PdfNotesEditorProps) {
  const notesRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesPath = useRef("");

  const scheduleSave = useCallback((content: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (notesPath.current) writeFile(notesPath.current, content);
    }, 1000);
  }, []);

  // Create notes editor once
  useEffect(() => {
    if (!notesRef.current) return;
    const editor = createEditor(notesRef.current, scheduleSave);
    editorRef.current = editor;
    onEditorReady?.(editor);
    return () => {
      editor.destroy();
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [scheduleSave, onEditorReady]);

  // Load notes when PDF changes
  useEffect(() => {
    const np = notesPathFor(pdfPath);
    notesPath.current = np;

    (async () => {
      try {
        const { content } = await readFile(np);
        editorRef.current?.setContent(content);
      } catch {
        const content = frontmatter(pdfPath);
        await createFile(np, content);
        editorRef.current?.setContent(content);
      }
    })();
  }, [pdfPath]);

  // Public API for adding citations
  const addCitation = useCallback((text: string, page: number, id: string) => {
    const editor = editorRef.current;
    if (editor && text) {
      const view = editor.view;
      const docEnd = view.state.doc.length;
      const citation = buildCitation(text, page, id);
      view.dispatch({
        changes: { from: docEnd, to: docEnd, insert: citation },
        selection: { anchor: docEnd + citation.length },
      });
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          Notes
        </span>
      </div>
      <div ref={notesRef} className="flex-1 overflow-y-auto" />
    </div>
  );
}

// Export ref for accessing editor
export function usePdfNotesEditor() {
  const editorRef = useRef<EditorInstance | null>(null);
  const handleEditorReady = useCallback((editor: EditorInstance) => {
    editorRef.current = editor;
  }, []);

  return { editorRef, handleEditorReady };
}
