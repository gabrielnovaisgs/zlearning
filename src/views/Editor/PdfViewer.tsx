import { useEffect, useRef, useCallback, useState } from "react";
import {
  PdfLoader,
  PdfHighlighter,
} from "react-pdf-highlighter";
import type { IHighlight, NewHighlight } from "react-pdf-highlighter";
import "react-pdf-highlighter/dist/style.css";
import { createEditor, type EditorInstance } from "@core/editor/setup";
import { HttpFileSystemService } from "@core/services/filesystem";
import { store } from "@core/store";
import { useStore } from "../hooks";
import { ColorPicker, HighlightActionMenu } from "./PdfHighlightMenu";

const fs = new HttpFileSystemService();

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: "rgba(253, 224, 71, 0.45)",
  green: "rgba(74, 222, 128, 0.45)",
  blue: "rgba(96, 165, 250, 0.45)",
  pink: "rgba(244, 114, 182, 0.45)",
};

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
  const [highlights, setHighlights] = useState<IHighlight[]>([]);
  const highlightsPath = useRef("");

  // ── Scroll control (set by PdfHighlighter's scrollRef) ───────────
  const scrollViewerTo = useRef<(hl: IHighlight) => void>(() => {});

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

    (async () => {
      try {
        const { content } = await fs.readFile(np);
        editorRef.current?.setContent(content);
      } catch {
        const content = frontmatter(pdfPath);
        await fs.createFile(np, content);
        editorRef.current?.setContent(content);
        store.loadFileTree();
      }

      try {
        const { content } = await fs.readFile(hp);
        const loaded = JSON.parse(content);
        // Filter out highlights saved in the old format (pre-react-pdf-highlighter)
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

  // ── Save highlights ───────────────────────────────────────────────
  const saveHighlights = useCallback((updated: IHighlight[]) => {
    if (highlightsPath.current) {
      fs.writeFile(highlightsPath.current, JSON.stringify(updated, null, 2));
    }
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

  // ── Scroll to highlight when store target changes ─────────────────
  useEffect(() => {
    if (!pdfHighlightTarget) return;
    const hl = highlights.find((h) => h.id === pdfHighlightTarget);
    if (hl) scrollViewerTo.current(hl);
    store.clearPdfHighlightTarget();
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
      {/* PDF viewer */}
      <div className="flex-1 relative overflow-hidden">
        <PdfLoader
          url={`/api/files/raw/${pdfPath}`}
          beforeLoad={
            <div className="flex items-center justify-center h-full text-text-muted text-sm">
              Carregando PDF…
            </div>
          }
        >
          {(pdfDocument) => (
            <PdfHighlighter
              pdfDocument={pdfDocument}
              enableAreaSelection={() => false}
              onScrollChange={() => {}}
              scrollRef={(scrollTo) => {
                scrollViewerTo.current = scrollTo;
              }}
              onSelectionFinished={(position, content, hideTipAndSelection) => (
                <ColorPicker
                  onPick={(color) =>
                    addHighlight(
                      { position, content, comment: { text: "", emoji: color } },
                      color,
                      hideTipAndSelection
                    )
                  }
                />
              )}
              highlightTransform={(
                highlight,
                index,
                setTip,
                hideTip,
                _viewportToScaled,
                _screenshot,
                isScrolledTo
              ) => {
                const color =
                  HIGHLIGHT_COLORS[highlight.comment.emoji] ??
                  HIGHLIGHT_COLORS.yellow;
                const { boundingRect, rects } = highlight.position;
                return (
                  <div
                    key={index}
                    className={isScrolledTo ? "pdf-highlight-pulse" : ""}
                    style={{ position: "absolute" }}
                  >
                    {/* Visual color rects (non-interactive) */}
                    {rects.map((rect, i) => (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          left: rect.left,
                          top: rect.top,
                          width: rect.width,
                          height: rect.height,
                          backgroundColor: color,
                          mixBlendMode: "multiply",
                          pointerEvents: "none",
                        }}
                      />
                    ))}
                    {/* Invisible click target over bounding rect */}
                    <div
                      style={{
                        position: "absolute",
                        left: boundingRect.left,
                        top: boundingRect.top,
                        width: boundingRect.width,
                        height: boundingRect.height,
                        cursor: "pointer",
                        opacity: 0,
                      }}
                      onClick={() =>
                        setTip(highlight, (hl) => (
                          <HighlightActionMenu
                            currentColor={hl.comment.emoji}
                            onChangeColor={(newColor) => {
                              changeHighlightColor(hl.id, newColor);
                              hideTip();
                            }}
                            onDelete={() => {
                              deleteHighlight(hl.id);
                              hideTip();
                            }}
                          />
                        ))
                      }
                    />
                  </div>
                );
              }}
              highlights={highlights}
            />
          )}
        </PdfLoader>
      </div>

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
