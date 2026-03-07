import { useEffect, useRef, useCallback, useState, useSyncExternalStore } from "react";
import type { IHighlight, NewHighlight } from "react-pdf-highlighter";
import { HttpFileSystemService } from "@core/services/filesystem";
import { pdfStore } from "@core/pdf-store";
import { PdfController } from "./PdfController";
import { PdfNotesEditor, buildCitation, type EditorInstance } from "./PdfNotesEditor";

const fs = new HttpFileSystemService();

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

interface Props {
  pdfPath: string;
}

export function PdfViewer({ pdfPath }: Props) {
  const pdfHighlightTarget = useSyncExternalStore(
    (cb) => pdfStore.subscribe(cb),
    () => pdfStore.getState()
  );

  // ── Panel resize ──────────────────────────────────────────────────
  const resizing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Highlights ────────────────────────────────────────────────────
  const [highlights, setHighlights] = useState<IHighlight[]>([]);
  const highlightsPath = useRef("");

  // ── Scroll control (set by PdfRenderer's PdfHighlighter scrollRef) ─
  const scrollViewerTo = useRef<(hl: IHighlight) => void>(() => {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const highlighterRef = useRef<any>(null);

  // ── Current page state (synchronized from controller) ──────────────
  const [currentPage, setCurrentPage] = useState(1);
  const pdfWrapperRef = useRef<HTMLDivElement>(null);

  // ── Zoom ──────────────────────────────────────────────────────────
  const [scale, setScale] = useState<number | null>(null);

  // ── Save highlights ───────────────────────────────────────────────
  const saveHighlights = useCallback((updated: IHighlight[]) => {
    if (highlightsPath.current) {
      fs.writeFile(highlightsPath.current, JSON.stringify(updated, null, 2));
    }
  }, []);

  // ── Notes editor ref for adding citations ──────────────────────────
  const notesEditorRef = useRef<EditorInstance | null>(null);
  const handleEditorReady = useCallback((editor: EditorInstance) => {
    notesEditorRef.current = editor;
  }, []);

  // ── Add highlight from selection ──────────────────────────────────
  const addHighlight = useCallback(
    (newHl: NewHighlight, color: string, hideTip: () => void) => {
      const id = crypto.randomUUID();
      const hl: IHighlight = {
        ...newHl,
        id,
        comment: { text: "", emoji: color },
      };

      const updated = [...highlights, hl];
      setHighlights(updated);
      saveHighlights(updated);

      const text = newHl.content.text ?? "";
      const page = newHl.position.pageNumber;
      const editor = notesEditorRef.current;
      if (editor && text) {
        const view = editor.view;
        const docEnd = view.state.doc.length;
        const citation = buildCitation(text, page, id);
        view.dispatch({
          changes: { from: docEnd, to: docEnd, insert: citation },
          selection: { anchor: docEnd + citation.length },
        });
      }

      hideTip();
    },
    [highlights, saveHighlights]
  );

  // ── Change highlight color ────────────────────────────────────────
  const changeHighlightColor = useCallback(
    (id: string, color: string) => {
      const updated = highlights.map((h) =>
        h.id === id ? { ...h, comment: { ...h.comment, emoji: color } } : h
      );
      setHighlights(updated);
      saveHighlights(updated);
    },
    [highlights, saveHighlights]
  );

  // ── Delete highlight ──────────────────────────────────────────────
  const deleteHighlight = useCallback(
    (id: string) => {
      const updated = highlights.filter((h) => h.id !== id);
      setHighlights(updated);
      saveHighlights(updated);
    },
    [highlights, saveHighlights]
  );

  // ── Load highlights when PDF changes ──────────────────────────────
  useEffect(() => {
    const hp = highlightsPathFor(pdfPath);
    highlightsPath.current = hp;
    setHighlights([]);
    setCurrentPage(1);
    setScale(null);

    (async () => {
      try {
        const { content } = await fs.readFile(hp);
        const loaded = JSON.parse(content);
        const valid = Array.isArray(loaded)
          ? loaded.filter((h: unknown) => {
              const hl = h as Record<string, unknown>;
              const pos = hl?.position as Record<string, unknown> | undefined;
              return typeof pos?.pageNumber === "number";
            })
          : [];
        setHighlights(valid as IHighlight[]);
      } catch {
        // No highlights file yet
      }
    })();
  }, [pdfPath]);

  // ── Scroll to highlight when store target changes ─────────────────
  useEffect(() => {
    if (!pdfHighlightTarget) return;
    const hl = highlights.find((h) => h.id === pdfHighlightTarget);
    if (hl) {
      scrollViewerTo.current(hl);
      const page = hl.position.pageNumber;
      setCurrentPage(page);
    }
    pdfStore.clearTarget();
  }, [pdfHighlightTarget, highlights]);

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

  return (
    <div className="flex flex-1 min-h-0">
      {/* PDF Controller (wraps renderer with controls) */}
      <PdfController
        pdfPath={pdfPath}
        highlights={highlights}
        currentPage={currentPage}
        scale={scale}
        onPdfLoad={() => {}}
        onAddHighlight={addHighlight}
        onChangeHighlightColor={changeHighlightColor}
        onDeleteHighlight={deleteHighlight}
        onHighlightsChange={setHighlights}
        pdfWrapperRef={pdfWrapperRef}
        highlighterRef={highlighterRef}
        scrollViewerToRef={scrollViewerTo}
        onCurrentPageChange={setCurrentPage}
      />

      {/* Notes panel */}
      <div className="flex" ref={panelRef} style={{ width: 400 }}>
        <div
          className="w-0.75 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-accent active:bg-accent"
          onMouseDown={handleMouseDown}
        />
        <PdfNotesEditor pdfPath={pdfPath} onEditorReady={handleEditorReady} />
      </div>
    </div>
  );
}
