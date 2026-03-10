import { useEffect, useState, useRef } from "react";
import type { IHighlight } from "react-pdf-highlighter";
import { PdfRenderer, type OutlineItem } from "./PdfRenderer";
import { Button } from "@shared/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/ui/tooltip";

interface OutlineItemLocal {
  title: string;
  page: number;
  level: number;
  items: OutlineItemLocal[];
}

function OutlineTree({
  items,
  onNavigate,
  currentPage,
}: {
  items: OutlineItemLocal[];
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

export interface PdfControllerProps {
  pdfPath: string;
  highlights: IHighlight[];
  currentPage: number;
  scale: number | null;

  onPdfLoad: (numPages: number, outline: OutlineItem[]) => void;
  onAddHighlight: (newHl: any, color: string, hideTip: () => void) => void;
  onChangeHighlightColor: (id: string, color: string) => void;
  onDeleteHighlight: (id: string) => void;
  onHighlightsChange: (highlights: IHighlight[]) => void;

  pdfWrapperRef: React.RefObject<HTMLDivElement | null>;
  highlighterRef: React.MutableRefObject<any>;
  scrollViewerToRef: React.MutableRefObject<(hl: IHighlight) => void>;

  onCurrentPageChange: (page: number) => void;
  onScaleChange: (scale: number) => void;

  showNotes: boolean;
  onToggleNotes: () => void;
}

export function PdfController({
  pdfPath,
  highlights,
  currentPage,
  scale,
  onPdfLoad,
  onAddHighlight,
  onChangeHighlightColor,
  onDeleteHighlight,
  onHighlightsChange,
  pdfWrapperRef,
  highlighterRef,
  scrollViewerToRef,
  onCurrentPageChange,
  onScaleChange,
  showNotes,
  onToggleNotes,
}: PdfControllerProps) {
  // ── State for controller ─────────────────────────────────────────
  const [numPages, setNumPages] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [showToc, setShowToc] = useState(false);

  // ── Zoom state ───────────────────────────────────────────────────
  const [zoomInput, setZoomInput] = useState<string>("");
  const zoomEditingRef = useRef(false);

  // Lê a escala atual do viewer (fonte de verdade), com fallback para a prop
  const getViewerScale = () =>
    highlighterRef.current?.viewer?.currentScale ?? scale ?? 1.0;

  const applyZoom = (newScale: number) => {
    const clamped = Math.round(Math.max(0.1, Math.min(5.0, newScale)) * 100) / 100;
    setZoomInput(String(Math.round(clamped * 100)));
    const viewer = highlighterRef.current?.viewer;
    if (viewer) viewer.currentScaleValue = String(clamped);
    onScaleChange(clamped);
  };

  const fitPage = () => {
    const viewer = highlighterRef.current?.viewer;
    if (!viewer) return;
    viewer.currentScaleValue = "page-fit";
    // PDF.js calcula a escala assincronamente; lê o valor após o layout
    setTimeout(() => {
      const s = viewer.currentScale;
      if (s > 0) {
        setZoomInput(String(Math.round(s * 100)));
        onScaleChange(s);
      }
    }, 50);
  };

  // ── Scroll to page ────────────────────────────────────────────────
  const scrollToPage = (pageNum: number) => {
    const clamped = Math.max(1, Math.min(pageNum, numPages || 1));
    setPageInput(String(clamped));
    onCurrentPageChange(clamped);
    const viewer = highlighterRef.current?.viewer;
    if (viewer) {
      viewer.scrollPageIntoView({ pageNumber: clamped });
    }
  };

  // ── Ctrl+wheel zoom ──────────────────────────────────────────────
  useEffect(() => {
    const wrapper = pdfWrapperRef.current;
    if (!wrapper) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      applyZoom(getViewerScale() + (e.deltaY > 0 ? -0.1 : 0.1));
    };
    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", handleWheel);
  }, [pdfWrapperRef]);

  // ── Sync zoom input with scale ───────────────────────────────────
  useEffect(() => {
    if (!zoomEditingRef.current) {
      setZoomInput(scale !== null ? String(Math.round(scale * 100)) : "");
    }
  }, [scale]);

  return (
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
            onClick={() => applyZoom(getViewerScale() - 0.1)}
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
                setZoomInput(String(Math.round(getViewerScale() * 100)));
                e.currentTarget.select();
              }}
              onBlur={() => {
                zoomEditingRef.current = false;
                const n = parseInt(zoomInput);
                if (!isNaN(n) && n >= 10 && n <= 500) applyZoom(n / 100);
                else setZoomInput(String(Math.round(getViewerScale() * 100)));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = parseInt(zoomInput);
                  if (!isNaN(n) && n >= 10 && n <= 500) applyZoom(n / 100);
                  else setZoomInput(String(Math.round(getViewerScale() * 100)));
                  e.currentTarget.blur();
                }
                if (e.key === "Escape") {
                  zoomEditingRef.current = false;
                  setZoomInput(String(Math.round(getViewerScale() * 100)));
                  e.currentTarget.blur();
                }
              }}
              className="w-9 text-center bg-bg-surface border border-border rounded-l px-1 py-0.5 text-xs text-text-primary focus:outline-none focus:border-accent tabular-nums"
            />
            <span className="px-1 py-0.5 text-xs text-text-muted bg-bg-surface border border-l-0 border-border rounded-r select-none">%</span>
          </div>
          <button
            onClick={() => applyZoom(getViewerScale() + 0.1)}
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={fitPage}
                  className="ml-0.5 text-text-muted hover:text-text-primary"
                  aria-label="Ajustar página"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 5V2h3M10 1h3v3M9 13h3v-3M4 13H1v-3" />
                  </svg>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Ajustar à página</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Notes toggle */}
        <div className="ml-2 flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onToggleNotes}
                  className={showNotes ? "text-accent bg-accent/10 hover:bg-accent/20" : "text-text-muted hover:text-text-primary"}
                  aria-label={showNotes ? "Esconder notas" : "Mostrar notas"}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
                    <rect x="1" y="1" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
                    <rect x="9" y="1" width="1" height="13" fill="currentColor" />
                    <rect x="11" y="4" width="2" height="1" rx="0.5" />
                    <rect x="11" y="6.5" width="2" height="1" rx="0.5" />
                    <rect x="11" y="9" width="2" height="1" rx="0.5" />
                  </svg>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {showNotes ? "Esconder notas" : "Mostrar notas"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* ── Content: TOC + PDF renderer ───────────────────────────── */}
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

        {/* PDF Renderer (wrapped by controller) */}
        <PdfRenderer
          pdfPath={pdfPath}
          highlights={highlights}
          currentPage={currentPage}
          scale={scale}
          onPdfLoad={(np, ol) => {
            setNumPages(np);
            setOutline(ol);
            onPdfLoad(np, ol);
          }}
          onAddHighlight={onAddHighlight}
          onChangeHighlightColor={onChangeHighlightColor}
          onDeleteHighlight={onDeleteHighlight}
          onHighlightsChange={onHighlightsChange}
          pdfWrapperRef={pdfWrapperRef}
          highlighterRef={highlighterRef}
          scrollViewerToRef={scrollViewerToRef}
          onCurrentPageChange={onCurrentPageChange}
        />
      </div>
    </div>
  );
}
