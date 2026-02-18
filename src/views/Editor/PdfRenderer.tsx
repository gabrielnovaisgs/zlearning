import { useEffect, useRef, useState, useCallback } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  TextLayer,
  setLayerDimensions,
} from "pdfjs-dist";
import type { PdfHighlight } from "@core/types";

// Set up the worker (Vite resolves ?url to the asset path)
GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

export interface SelectionInfo {
  text: string;
  page: number;
  anchorRect: DOMRect;
  rects: Array<{ x: number; y: number; width: number; height: number }>;
}

interface Props {
  pdfPath: string;
  highlights: PdfHighlight[];
  scrollTarget: string | null;
  onScrollTargetHandled: () => void;
  onSelection: (info: SelectionInfo | null) => void;
}

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: "rgba(253, 224, 71, 0.4)",
  green: "rgba(74, 222, 128, 0.4)",
  blue: "rgba(96, 165, 250, 0.4)",
  pink: "rgba(244, 114, 182, 0.4)",
};

export function PdfRenderer({
  pdfPath,
  highlights,
  scrollTarget,
  onScrollTargetHandled,
  onSelection,
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<Awaited<ReturnType<typeof getDocument.prototype.promise>> | null>(null);
  const pageEls = useRef<Map<number, HTMLDivElement>>(new Map());
  const renderTasks = useRef<Map<number, { cancel: () => void }>>(new Map());
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const highlightRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Measure container width with ResizeObserver
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width);
      setContainerWidth((prev) => (Math.abs(prev - w) > 10 ? w : prev));
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    setNumPages(0);
    pageEls.current.clear();
    renderTasks.current.forEach((t) => t.cancel());
    renderTasks.current.clear();

    const task = getDocument(`/api/files/raw/${pdfPath}`);
    task.promise.then((pdf) => {
      if (cancelled) return;
      pdfRef.current = pdf;
      setNumPages(pdf.numPages);
    });

    return () => {
      cancelled = true;
      task.destroy();
      pdfRef.current?.destroy();
      pdfRef.current = null;
    };
  }, [pdfPath]);

  // Render a single page (canvas + text layer)
  const renderPage = useCallback(
    async (pageNum: number, width: number) => {
      const pdf = pdfRef.current;
      if (!pdf || width === 0) return;

      const container = pageEls.current.get(pageNum);
      if (!container) return;

      // Cancel any previous render for this page
      renderTasks.current.get(pageNum)?.cancel();

      const page = await pdf.getPage(pageNum);
      const baseVp = page.getViewport({ scale: 1 });
      const scale = width / baseVp.width;
      const viewport = page.getViewport({ scale });

      // ── Canvas ────────────────────────────────────────────────
      let canvas = container.querySelector("canvas") as HTMLCanvasElement | null;
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.style.display = "block";
        canvas.style.width = "100%";
        container.insertBefore(canvas, container.firstChild);
      }
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext("2d")!;
      const renderTask = page.render({ canvasContext: ctx, viewport });
      renderTasks.current.set(pageNum, renderTask);
      try {
        await renderTask.promise;
      } catch {
        return; // cancelled
      }

      // ── Text layer ────────────────────────────────────────────
      let textLayerEl = container.querySelector(".textLayer") as HTMLDivElement | null;
      if (textLayerEl) {
        textLayerEl.innerHTML = "";
      } else {
        textLayerEl = document.createElement("div");
        textLayerEl.className = "textLayer";
        container.appendChild(textLayerEl);
      }

      setLayerDimensions(textLayerEl, viewport);
      const tl = new TextLayer({
        textContentSource: page.streamTextContent(),
        container: textLayerEl,
        viewport,
      });
      try {
        await tl.render();
      } catch {
        return; // cancelled
      }
    },
    []
  );

  // Re-render all pages when PDF loads or container width changes
  useEffect(() => {
    if (numPages === 0 || containerWidth === 0) return;
    // Wait a frame so all page containers are in the DOM
    const id = requestAnimationFrame(() => {
      for (let p = 1; p <= numPages; p++) {
        renderPage(p, containerWidth);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [numPages, containerWidth, renderPage]);

  // Detect text selection → emit SelectionInfo
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    const handleMouseUp = () => {
      // Small delay so selection is finalized
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          onSelection(null);
          return;
        }

        const text = sel.toString().trim();
        const range = sel.getRangeAt(0);

        // Walk up from anchor node to find the page container (has data-page attr)
        let node: Node | null = range.startContainer;
        let pageEl: HTMLElement | null = null;
        while (node && node !== outer) {
          const el = node as HTMLElement;
          if (el.dataset?.page) {
            pageEl = el;
            break;
          }
          node = el.parentElement;
        }
        if (!pageEl) return;

        const page = parseInt(pageEl.dataset.page!);
        const pageRect = pageEl.getBoundingClientRect();
        const clientRects = Array.from(range.getClientRects()).filter(
          (r) => r.width > 0 && r.height > 0
        );
        if (clientRects.length === 0) return;

        // Convert to page-relative coords [0..1]
        const rects = clientRects.map((r) => ({
          x: (r.left - pageRect.left) / pageRect.width,
          y: (r.top - pageRect.top) / pageRect.height,
          width: r.width / pageRect.width,
          height: r.height / pageRect.height,
        }));

        // Anchor the menu below the last selection rect
        const last = clientRects[clientRects.length - 1];
        const anchorRect = new DOMRect(last.left, last.bottom, last.width, 0);

        onSelection({ text, page, anchorRect, rects });
      }, 10);
    };

    outer.addEventListener("mouseup", handleMouseUp);
    return () => outer.removeEventListener("mouseup", handleMouseUp);
  }, [onSelection]);

  // Scroll to a highlight when scrollTarget changes
  useEffect(() => {
    if (!scrollTarget) return;
    const highlight = highlights.find((h) => h.id === scrollTarget);
    if (!highlight) {
      onScrollTargetHandled();
      return;
    }
    const pageEl = pageEls.current.get(highlight.page);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        const el = highlightRefs.current.get(scrollTarget);
        if (el) {
          el.classList.add("pdf-highlight-pulse");
          setTimeout(() => el.classList.remove("pdf-highlight-pulse"), 1200);
        }
      }, 400);
    }
    onScrollTargetHandled();
  }, [scrollTarget, highlights, onScrollTargetHandled]);

  return (
    <div
      ref={outerRef}
      className="flex-1 overflow-y-auto bg-[#525659] select-text"
      style={{ padding: "16px 24px" }}
    >
      <div className="flex flex-col gap-4 items-center">
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
          <div
            key={pageNum}
            data-page={pageNum}
            className="relative bg-white shadow-lg"
            style={{ width: "100%" }}
            ref={(el) => {
              if (el) pageEls.current.set(pageNum, el);
              else pageEls.current.delete(pageNum);
            }}
          >
            {/* Highlight overlays */}
            {highlights
              .filter((h) => h.page === pageNum)
              .map((h) =>
                h.rects.map((rect, ri) => (
                  <div
                    key={`${h.id}-${ri}`}
                    ref={(el) => {
                      if (ri === 0) {
                        if (el) highlightRefs.current.set(h.id, el);
                        else highlightRefs.current.delete(h.id);
                      }
                    }}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${rect.x * 100}%`,
                      top: `${rect.y * 100}%`,
                      width: `${rect.width * 100}%`,
                      height: `${rect.height * 100}%`,
                      backgroundColor:
                        HIGHLIGHT_COLORS[h.color] ?? HIGHLIGHT_COLORS.yellow,
                      zIndex: 3,
                      mixBlendMode: "multiply",
                    }}
                  />
                ))
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
