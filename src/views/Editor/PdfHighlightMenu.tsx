import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Props {
  anchorRect: DOMRect;
  onHighlight: (color: string) => void;
  onDismiss: () => void;
}

const COLORS = [
  { id: "yellow", bg: "#fef08a", label: "Yellow" },
  { id: "green", bg: "#86efac", label: "Green" },
  { id: "blue", bg: "#93c5fd", label: "Blue" },
  { id: "pink", bg: "#f9a8d4", label: "Pink" },
] as const;

const MENU_WIDTH = 228;
const MENU_HEIGHT = 44;
const GAP = 8;

export function PdfHighlightMenu({ anchorRect, onHighlight, onDismiss }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onDismiss]);

  // Position below the selection, keep within viewport
  let top = anchorRect.bottom + GAP;
  let left = anchorRect.left + anchorRect.width / 2 - MENU_WIDTH / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8));
  if (top + MENU_HEIGHT > window.innerHeight - 8) {
    top = anchorRect.top - MENU_HEIGHT - GAP;
  }

  return createPortal(
    <div
      ref={menuRef}
      style={{ top, left, width: MENU_WIDTH }}
      className="fixed z-[9999] flex items-center gap-2 rounded-lg bg-bg-secondary border border-border shadow-2xl px-3 py-2"
    >
      <span className="text-xs text-text-muted shrink-0">Destacar:</span>
      {COLORS.map((c) => (
        <button
          key={c.id}
          title={c.label}
          className="w-6 h-6 rounded-full border-2 border-white/20 hover:border-white/80 transition-all hover:scale-110 shrink-0"
          style={{ backgroundColor: c.bg }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onHighlight(c.id);
          }}
        />
      ))}
    </div>,
    document.body
  );
}
