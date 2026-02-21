import { useEffect, useRef, useCallback, useState } from "react";
import {
  PdfLoader,
  PdfHighlighter,
} from "react-pdf-highlighter";
import type { IHighlight, NewHighlight } from "react-pdf-highlighter";
import "react-pdf-highlighter/dist/style.css";
import { HighlightMenu } from "./PdfHighlightMenu";

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: "rgba(253, 224, 71, 0.45)",
  green: "rgba(74, 222, 128, 0.45)",
  blue: "rgba(96, 165, 250, 0.45)",
  pink: "rgba(244, 114, 182, 0.45)",
};

// ── Outline ────────────────────────────────────────────────────────
export interface OutlineItem {
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

export interface PdfRendererProps {
  pdfPath: string;
  highlights: IHighlight[];
  currentPage: number;
  scale: number | null;

  onPdfLoad: (numPages: number, outline: OutlineItem[]) => void;
  onAddHighlight: (newHl: NewHighlight, color: string, hideTip: () => void) => void;
  onChangeHighlightColor: (id: string, color: string) => void;
  onDeleteHighlight: (id: string) => void;
  onHighlightsChange: (highlights: IHighlight[]) => void;

  pdfWrapperRef: React.RefObject<HTMLDivElement | null>;
  highlighterRef: React.MutableRefObject<any>;
  scrollViewerToRef: React.MutableRefObject<(hl: IHighlight) => void>;

  onCurrentPageChange: (page: number) => void;
}

export function PdfRenderer({
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
}: PdfRendererProps) {
  // ── Page tracking via scroll event ───────────────────────────
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
      onCurrentPageChange(bestPage);
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
  }, [pdfPath, onCurrentPageChange]);

  // Sync display scale with viewer's auto-computed scale after PDF loads
  const [numPages, setNumPages] = useState(0);
  useEffect(() => {
    if (numPages === 0) return;
    const timer = setTimeout(() => {
      const s = highlighterRef.current?.viewer?.currentScale;
      if (s && s > 0) {
        // Just for syncing, actual zoom state is managed by PdfViewer
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [numPages, highlighterRef]);

  return (
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
            <PdfDocMeta
              pdfDocument={pdfDocument}
              onLoad={(np, ol) => {
                setNumPages(np);
                onPdfLoad(np, ol);
              }}
            />
            <PdfHighlighter
              ref={highlighterRef}
              pdfDocument={pdfDocument}
              pdfScaleValue={scale !== null ? String(scale) : "auto"}
              enableAreaSelection={() => false}
              onScrollChange={() => {}}
              scrollRef={(scrollTo) => {
                scrollViewerToRef.current = scrollTo;
              }}
              onSelectionFinished={(position, content, hideTipAndSelection) => (
                <HighlightMenu
                  onColorSelect={(color) =>
                    onAddHighlight(
                      { position, content, comment: { text: "", emoji: color } },
                      color,
                      hideTipAndSelection
                    )
                  }
                  textToTranslate={content.text ?? undefined}
                  showLabel
                  useMouseDownForColor
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
                          <HighlightMenu
                            onColorSelect={(newColor) => {
                              onChangeHighlightColor(hl.id, newColor);
                              hideTip();
                            }}
                            selectedColor={hl.comment.emoji}
                            onDelete={() => {
                              onDeleteHighlight(hl.id);
                              hideTip();
                            }}
                            textToTranslate={hl.content.text ?? undefined}
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
  );
}
