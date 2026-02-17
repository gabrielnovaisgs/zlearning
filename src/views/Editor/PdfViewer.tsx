import { useEffect, useRef, useCallback } from "react";
import { createEditor, type EditorInstance } from "@core/editor/setup";
import { HttpFileSystemService } from "@core/services/filesystem";
import { store } from "@core/store";

const fs = new HttpFileSystemService();

function notesPathFor(pdfPath: string): string {
  const dir = pdfPath.includes("/") ? pdfPath.substring(0, pdfPath.lastIndexOf("/") + 1) : "";
  const name = pdfPath.includes("/") ? pdfPath.substring(pdfPath.lastIndexOf("/") + 1) : pdfPath;
  const base = name.replace(/\.pdf$/, "");
  return `${dir}notes-${base}.md`;
}

function frontmatter(pdfPath: string): string {
  return `---\npdf: "[[${pdfPath.replace(/\.pdf$/, "")}]]"\n---\n\n`;
}

interface Props {
  pdfPath: string;
}

export function PdfViewer({ pdfPath }: Props) {
  const notesRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesPath = useRef("");
  const resizing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const scheduleSave = useCallback((content: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (notesPath.current) {
        fs.writeFile(notesPath.current, content);
      }
    }, 1000);
  }, []);

  // Create notes editor once
  useEffect(() => {
    if (!notesRef.current) return;

    const editor = createEditor(notesRef.current, (content) => {
      scheduleSave(content);
    });
    editorRef.current = editor;

    return () => {
      editor.destroy();
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [scheduleSave]);

  // Load or create notes file when PDF changes
  useEffect(() => {
    const path = notesPathFor(pdfPath);
    notesPath.current = path;

    (async () => {
      try {
        const { content } = await fs.readFile(path);
        editorRef.current?.setContent(content);
      } catch {
        // File doesn't exist — create it with frontmatter
        const content = frontmatter(pdfPath);
        await fs.createFile(path, content);
        editorRef.current?.setContent(content);
        // Refresh file tree so the notes file appears in the sidebar
        store.loadFileTree();
      }
    })();
  }, [pdfPath]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizing.current || !panelRef.current) return;
      const parentRect = panelRef.current.parentElement!.getBoundingClientRect();
      const newWidth = parentRect.right - ev.clientX;
      panelRef.current.style.width = `${Math.max(250, Math.min(newWidth, parentRect.width - 300))}px`;
    };
    const onMouseUp = () => {
      resizing.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  return (
    <div className="flex flex-1 min-h-0">
      <iframe
        src={`/api/files/raw/${pdfPath}`}
        className="flex-1 border-none min-w-0"
        title={pdfPath}
      />
      <div className="flex" ref={panelRef} style={{ width: 400 }}>
        <div
          className="w-[3px] shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-accent active:bg-accent"
          onMouseDown={handleMouseDown}
        />
        <div className="flex flex-1 flex-col min-w-0 bg-bg-secondary border-l border-border">
          <div className="flex items-center px-4 py-2 border-b border-border">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Notes</span>
          </div>
          <div ref={notesRef} className="flex-1 overflow-y-auto" />
        </div>
      </div>
    </div>
  );
}
