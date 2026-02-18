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

// ── Outline ────────────────────────────────────────────────────────
interface OutlineItem {
  title: string;
  page: number;
  level: number;
  items: OutlineItem[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveOutlineItems(pdfDoc: any, items: any[], level = 0): Promise<OutlineItem[]> {
  if (!items?.length) return [];
  return Promise.all(
    items.map(async (item) => {
      let page = 0;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let dest: any = item.dest;
        if (typeof dest === "string") dest = await pdfDoc.getDestination(dest);
        if (Array.isArray(dest) && dest[0]) {
          page = (await pdfDoc.getPageIndex(dest[0])) + 1;
        }
      } catch { /* ignore */ }
      return {
        title: String(item.title ?? ""),
        page,
        level,
        items: await resolveOutlineItems(pdfDoc, item.items ?? [], level + 1),
      };
    })
  );
}

// ── Side-effect component: loads outline + numPages inside PdfLoader ─
interface PdfDocMetaProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDocument: any;
  onLoad: (numPages: number, outline: OutlineItem[]) => void;
}
function PdfDocMeta({ pdfDocument, onLoad }: PdfDocMetaProps) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const items = await pdfDocument.getOutline().catch(() => null);
      const resolved = await resolveOutlineItems(pdfDocument, items ?? []);
      if (!cancelled) onLoad(pdfDocument.numPages as number, resolved);
    })();
    return () => { cancelled = true; };
  }, [pdfDocument, onLoad]);
  return null;
}

// ── TOC tree component ─────────────────────────────────────────────
function OutlineTree({
  items,
  onNavigate,
  currentPage,
}: {
  items: OutlineItem[];
  onNavigate: (page: number) => void;
  currentPage: number;
}) {
  return (
    <>
      {items.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => item.page > 0 && onNavigate(item.page)}
            className={`w-full text-left py-1 text-xs transition-colors flex items-center gap-1 ${
              item.page === currentPage
                ? "text-accent font-medium bg-accent/10"
                : "text-text-secondary hover:bg-bg-hover"
            }`}
            style={{ paddingLeft: `${12 + item.level * 12}px`, paddingRight: "12px" }}
          >
            <span className="truncate flex-1">{item.title}</span>
            {item.page > 0 && (
              <span className="shrink-0 text-text-muted tabular-nums">{item.page}</span>
            )}
          </button>
          {item.items.length > 0 && (
            <OutlineTree items={item.items} onNavigate={onNavigate} currentPage={currentPage} />
          )}
        </div>
      ))}
    </>
  );
}

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const highlighterRef = useRef<any>(null);

  // ── PDF navigation state ──────────────────────────────────────────
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [showToc, setShowToc] = useState(false);
  const pdfWrapperRef = useRef<HTMLDivElement>(null);

  // ── Zoom ──────────────────────────────────────────────────────────
  // null = "auto" (PDF.js fit-width inicial). Após carga ou zoom explícito torna-se numérico,
  // bloqueando o ResizeObserver do PdfHighlighter que chamaria handleScaleValue("auto").
  const [scale, setScale] = useState<number | null>(null);
  const [zoomInput, setZoomInput] = useState<string>("");
  const zoomEditingRef = useRef(false);

  const applyZoom = useCallback((newScale: number) => {
    const clamped = Math.round(Math.max(0.1, Math.min(5.0, newScale)) * 100) / 100;
    setScale(clamped);
    setZoomInput(String(Math.round(clamped * 100)));
    const viewer = highlighterRef.current?.viewer;
    if (viewer) viewer.currentScaleValue = String(clamped);
  }, []);

  // Keep input in sync with scale (e.g. after PDF load or Ctrl+scroll)
  useEffect(() => {
    if (!zoomEditingRef.current) {
      setZoomInput(scale !== null ? String(Math.round(scale * 100)) : "");
    }
  }, [scale]);

  // Sync display scale with viewer's auto-computed scale after PDF loads
  useEffect(() => {
    if (numPages === 0) return;
    const timer = setTimeout(() => {
      const s = highlighterRef.current?.viewer?.currentScale;
      if (s && s > 0) setScale(Math.round(s * 100) / 100);
    }, 150);
    return () => clearTimeout(timer);
  }, [numPages]);

  // Ctrl+wheel zoom
  useEffect(() => {
    const wrapper = pdfWrapperRef.current;
    if (!wrapper) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const currentScale = highlighterRef.current?.viewer?.currentScale ?? scale ?? 1.0;
      applyZoom(currentScale + (e.deltaY > 0 ? -0.1 : 0.1));
    };
    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", handleWheel);
  }, [applyZoom, scale]);

  // ── Page tracking via scroll event ───────────────────────────────
  useEffect(() => {
    const wrapper = pdfWrapperRef.current;
    if (!wrapper) return;

    let scrollRoot: HTMLElement | null = null;

    const handleScroll = () => {
      if (!scrollRoot) return;
      const pages = Array.from(
        scrollRoot.querySelectorAll<HTMLElement>(".page[data-page-number]")
      );
      if (!pages.length) return;
      const rootRect = scrollRoot.getBoundingClientRect();
      let bestPage = 1;
      let bestVisible = 0;
      for (const page of pages) {
        const rect = page.getBoundingClientRect();
        const visible = Math.max(
          0,
          Math.min(rect.bottom, rootRect.bottom) - Math.max(rect.top, rootRect.top)
        );
        if (visible > bestVisible) {
          bestVisible = visible;
          bestPage = parseInt(page.dataset.pageNumber ?? "1");
        }
      }
      setCurrentPage(bestPage);
      setPageInput(String(bestPage));
    };

    const mo = new MutationObserver(() => {
      const found = wrapper.querySelector<HTMLElement>(".PdfHighlighter");
      if (found && found !== scrollRoot) {
        if (scrollRoot) scrollRoot.removeEventListener("scroll", handleScroll);
        scrollRoot = found;
        scrollRoot.addEventListener("scroll", handleScroll, { passive: true });
      }
    });

    mo.observe(wrapper, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      if (scrollRoot) scrollRoot.removeEventListener("scroll", handleScroll);
    };
  }, [pdfPath]);

  // ── Scroll to page via PDF.js viewer API ──────────────────────────
  const scrollToPage = useCallback(
    (pageNum: number) => {
      const clamped = Math.max(1, Math.min(pageNum, numPages || 1));
      setCurrentPage(clamped);
      setPageInput(String(clamped));
      // Use the internal PDFViewer from react-pdf-highlighter so page virtualization
      // is handled correctly (scrollIntoView fails when the page isn't in the DOM).
      const viewer = highlighterRef.current?.viewer;
      if (viewer) {
        viewer.scrollPageIntoView({ pageNumber: clamped });
      }
    },
    [numPages]
  );

  // ── PDF document metadata (outline + numPages) ────────────────────
  const handlePdfLoad = useCallback((np: number, ol: OutlineItem[]) => {
    setNumPages(np);
    setOutline(ol);
  }, []);

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
    setCurrentPage(1);
    setPageInput("1");
    setNumPages(0);
    setOutline([]);
    setScale(null);

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
    if (hl) {
      scrollViewerTo.current(hl);
      const page = hl.position.pageNumber;
      setCurrentPage(page);
      setPageInput(String(page));
    }
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
      {/* PDF area (toolbar + TOC + viewer) */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">

        {/* ── Toolbar ─────────────────────────────────────────────── */}
        <div className="flex items-center px-2 py-1 bg-bg-secondary border-b border-border shrink-0">
          {/* Left: TOC toggle */}
          <div className="flex items-center">
            <button
              title="Índice"
              onClick={() => setShowToc((v) => !v)}
              className={`p-1.5 rounded transition-colors ${
                showToc
                  ? "bg-accent/20 text-accent"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
                <rect x="2" y="2.5" width="11" height="1.5" rx="0.75" />
                <rect x="2" y="6.75" width="8" height="1.5" rx="0.75" />
                <rect x="2" y="11" width="9" height="1.5" rx="0.75" />
              </svg>
            </button>
          </div>

          {/* Center: page navigation */}
          <div className="flex flex-1 justify-center">
            {numPages > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => scrollToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Página anterior"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11L5 7l4-4" />
                  </svg>
                </button>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const n = parseInt(pageInput);
                        if (!isNaN(n)) scrollToPage(n);
                      }
                      if (e.key === "Escape") setPageInput(String(currentPage));
                    }}
                    onBlur={() => {
                      const n = parseInt(pageInput);
                      if (!isNaN(n)) scrollToPage(n);
                      else setPageInput(String(currentPage));
                    }}
                    className="w-9 text-center bg-bg-surface border border-border rounded px-1 py-0.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                  <span className="text-xs text-text-muted">/ {numPages}</span>
                </div>
                <button
                  onClick={() => scrollToPage(currentPage + 1)}
                  disabled={currentPage >= numPages}
                  className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Próxima página"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 3l4 4-4 4" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Right: zoom controls */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => applyZoom((highlighterRef.current?.viewer?.currentScale ?? scale ?? 1.0) - 0.1)}
              title="Diminuir zoom"
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="5.5" cy="5.5" r="3.5" />
                <path d="M9 9l3.5 3.5" />
                <path d="M3.5 5.5h4" />
              </svg>
            </button>
            <div className="flex items-center">
              <input
                type="text"
                value={zoomInput}
                onChange={(e) => setZoomInput(e.target.value)}
                onFocus={(e) => {
                  zoomEditingRef.current = true;
                  setZoomInput(scale !== null ? String(Math.round(scale * 100)) : "100");
                  e.currentTarget.select();
                }}
                onBlur={() => {
                  zoomEditingRef.current = false;
                  const n = parseInt(zoomInput);
                  if (!isNaN(n) && n >= 10 && n <= 500) applyZoom(n / 100);
                  else setZoomInput(scale !== null ? String(Math.round(scale * 100)) : "");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const n = parseInt(zoomInput);
                    if (!isNaN(n) && n >= 10 && n <= 500) applyZoom(n / 100);
                    else setZoomInput(scale !== null ? String(Math.round(scale * 100)) : "");
                    e.currentTarget.blur();
                  }
                  if (e.key === "Escape") {
                    zoomEditingRef.current = false;
                    setZoomInput(scale !== null ? String(Math.round(scale * 100)) : "");
                    e.currentTarget.blur();
                  }
                }}
                className="w-9 text-center bg-bg-surface border border-border rounded-l px-1 py-0.5 text-xs text-text-primary focus:outline-none focus:border-accent tabular-nums"
              />
              <span className="px-1 py-0.5 text-xs text-text-muted bg-bg-surface border border-l-0 border-border rounded-r select-none">%</span>
            </div>
            <button
              onClick={() => applyZoom((highlighterRef.current?.viewer?.currentScale ?? scale ?? 1.0) + 0.1)}
              title="Aumentar zoom"
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="5.5" cy="5.5" r="3.5" />
                <path d="M9 9l3.5 3.5" />
                <path d="M5.5 3.5v4M3.5 5.5h4" />
              </svg>
            </button>
            <button
              onClick={() => applyZoom(1.0)}
              title="Redefinir zoom para 100%"
              className="ml-1 px-2 py-0.5 text-xs text-text-muted hover:text-text-primary bg-bg-surface border border-border rounded hover:bg-bg-hover transition-colors"
            >
              reset
            </button>
          </div>
        </div>

        {/* ── Content row: TOC + PDF viewer ───────────────────────── */}
        <div className="flex flex-1 min-h-0">
          {/* TOC sidebar */}
          {showToc && (
            <div className="w-56 shrink-0 overflow-y-auto bg-bg-secondary border-r border-border">
              {outline.length > 0 ? (
                <OutlineTree
                  items={outline}
                  onNavigate={scrollToPage}
                  currentPage={currentPage}
                />
              ) : (
                <p className="px-4 py-6 text-xs text-text-muted text-center">
                  Sem índice disponível
                </p>
              )}
            </div>
          )}

          {/* PDF viewer */}
          <div ref={pdfWrapperRef} className="flex-1 relative overflow-hidden min-w-0">
            <PdfLoader
              url={`/api/files/raw/${pdfPath}`}
              beforeLoad={
                <div className="flex items-center justify-center h-full text-text-muted text-sm">
                  Carregando PDF…
                </div>
              }
            >
              {(pdfDocument) => (
                <>
                  <PdfDocMeta pdfDocument={pdfDocument} onLoad={handlePdfLoad} />
                  <PdfHighlighter
                    ref={highlighterRef}
                    pdfDocument={pdfDocument}
                    pdfScaleValue={scale !== null ? String(scale) : "auto"}
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
                        textToTranslate={content.text ?? undefined}
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
                                  highlightText={hl.content.text ?? undefined}
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
                </>
              )}
            </PdfLoader>
          </div>
        </div>
      </div>

      {/* Notes panel */}
      <div className="flex" ref={panelRef} style={{ width: 400 }}>
        <div
          className="w-0.75 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-accent active:bg-accent"
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
