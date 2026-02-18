import { useEffect, useRef, useCallback, useState } from "react";
import { createEditor, type EditorInstance } from "@core/editor/setup";
import { HttpFileSystemService } from "@core/services/filesystem";
import { store } from "@core/store";
import { useStore } from "../hooks";
import { PdfRenderer, type SelectionInfo } from "./PdfRenderer";
import { PdfHighlightMenu } from "./PdfHighlightMenu";
import type { PdfHighlight } from "@core/types";

const fs = new HttpFileSystemService();

// ── Path helpers ───────────────────────────────────────────────────
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

function highlightsPathFor(pdfPath: string): string {
  const dir = pdfPath.includes("/")
    ? pdfPath.substring(0, pdfPath.lastIndexOf("/") + 1)
    : "";
  const name = pdfPath.includes("/")
    ? pdfPath.substring(pdfPath.lastIndexOf("/") + 1)
    : pdfPath;
  const base = name.replace(/\.pdf$/, "");
  return `${dir}highlights-${base}.json`;
}

function frontmatter(pdfPath: string): string {
  return `---\npdf: "[[${pdfPath.replace(/\.pdf$/, "")}]]"\n---\n\n`;
}

// ── Citation inserted in notes ─────────────────────────────────────
function buildCitation(text: string, page: number, id: string): string {
  return `\n> ${text.replace(/\n/g, " ")}\n>\n> — [p. ${page}](pdf-highlight://${id})\n\n`;
}

interface Props {
  pdfPath: string;
}

export function PdfViewer({ pdfPath }: Props) {
  const { pdfHighlightTarget } = useStore();

  // ── Notes editor ─────────────────────────────────────────────────
  const notesRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesPath = useRef("");

  // ── Panel resize ──────────────────────────────────────────────────
  const resizing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Highlights ────────────────────────────────────────────────────
  const [highlights, setHighlights] = useState<PdfHighlight[]>([]);
  const highlightsPath = useRef("");

  // ── Selection menu ────────────────────────────────────────────────
  const [selection, setSelection] = useState<SelectionInfo | null>(null);

  // ── Create notes editor once ──────────────────────────────────────
  const scheduleSave = useCallback((content: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (notesPath.current) fs.writeFile(notesPath.current, content);
    }, 1000);
  }, []);

  useEffect(() => {
    if (!notesRef.current) return;
    const editor = createEditor(notesRef.current, scheduleSave);
    editorRef.current = editor;
    return () => {
      editor.destroy();
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [scheduleSave]);

  // ── Load notes + highlights when PDF changes ──────────────────────
  useEffect(() => {
    const np = notesPathFor(pdfPath);
    const hp = highlightsPathFor(pdfPath);
    notesPath.current = np;
    highlightsPath.current = hp;
    setHighlights([]);
    setSelection(null);

    (async () => {
      // Load notes
      try {
        const { content } = await fs.readFile(np);
        editorRef.current?.setContent(content);
      } catch {
        const content = frontmatter(pdfPath);
        await fs.createFile(np, content);
        editorRef.current?.setContent(content);
        store.loadFileTree();
      }

      // Load highlights
      try {
        const { content } = await fs.readFile(hp);
        setHighlights(JSON.parse(content) as PdfHighlight[]);
      } catch {
        // No highlights file yet — start empty
      }
    })();
  }, [pdfPath]);

  // ── Save highlights to JSON ───────────────────────────────────────
  const saveHighlights = useCallback((updated: PdfHighlight[]) => {
    if (highlightsPath.current) {
      fs.writeFile(highlightsPath.current, JSON.stringify(updated, null, 2));
    }
  }, []);

  // ── Handle highlight creation ─────────────────────────────────────
  const handleHighlight = useCallback(
    (color: string) => {
      if (!selection) return;

      const id = crypto.randomUUID();
      const hl: PdfHighlight = {
        id,
        page: selection.page,
        text: selection.text,
        color,
        rects: selection.rects,
      };

      const updated = [...highlights, hl];
      setHighlights(updated);
      saveHighlights(updated);

      // Insert citation into notes editor
      const editor = editorRef.current;
      if (editor) {
        const view = editor.view;
        const docEnd = view.state.doc.length;
        const citation = buildCitation(selection.text, selection.page, id);
        view.dispatch({
          changes: { from: docEnd, to: docEnd, insert: citation },
          selection: { anchor: docEnd + citation.length },
        });
      }

      // Clear browser selection + hide menu
      window.getSelection()?.removeAllRanges();
      setSelection(null);
    },
    [selection, highlights, saveHighlights]
  );

  // ── Panel resize ──────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current || !panelRef.current) return;
      const parentRect = panelRef.current.parentElement!.getBoundingClientRect();
      const newWidth = parentRect.right - ev.clientX;
      panelRef.current.style.width = `${Math.max(250, Math.min(newWidth, parentRect.width - 300))}px`;
    };
    const onUp = () => {
      resizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  // ── Handle scrollTarget from store ────────────────────────────────
  const handleScrollTargetHandled = useCallback(() => {
    store.clearPdfHighlightTarget();
  }, []);

  return (
    <div className="flex flex-1 min-h-0">
      {/* PDF renderer (replaces the old iframe) */}
      <PdfRenderer
        pdfPath={pdfPath}
        highlights={highlights}
        scrollTarget={pdfHighlightTarget}
        onScrollTargetHandled={handleScrollTargetHandled}
        onSelection={setSelection}
      />

      {/* Selection highlight menu */}
      {selection && (
        <PdfHighlightMenu
          anchorRect={selection.anchorRect}
          onHighlight={handleHighlight}
          onDismiss={() => setSelection(null)}
        />
      )}

      {/* Notes panel */}
      <div className="flex" ref={panelRef} style={{ width: 400 }}>
        <div
          className="w-[3px] shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-accent active:bg-accent"
          onMouseDown={handleMouseDown}
        />
        <div className="flex flex-1 flex-col min-w-0 bg-bg-secondary border-l border-border">
          <div className="flex items-center px-4 py-2 border-b border-border">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Notes
            </span>
          </div>
          <div ref={notesRef} className="flex-1 overflow-y-auto" />
        </div>
      </div>
    </div>
  );
}
