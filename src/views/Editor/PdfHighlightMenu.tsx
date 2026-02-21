import { useState } from "react";
import { Button } from "@components/ui/button";
import { TranslationDialog } from "./TranslationDialog";

const COLORS = [
  { id: "yellow", bg: "#fef08a", label: "Yellow" },
  { id: "green", bg: "#86efac", label: "Green" },
  { id: "blue", bg: "#93c5fd", label: "Blue" },
  { id: "pink", bg: "#f9a8d4", label: "Pink" },
] as const;

// ── Color picker shown on text selection ───────────────────────────────────

interface ColorPickerProps {
  onPick: (color: string) => void;
  textToTranslate?: string;
}

export function ColorPicker({ onPick, textToTranslate }: ColorPickerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg bg-bg-secondary border border-border shadow-2xl px-3 py-2">
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
              onPick(c.id);
            }}
          />
        ))}
        {textToTranslate && (
          <>
            <div className="w-px h-4 bg-border shrink-0" />
            <button
              title="Traduzir seleção"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shrink-0"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDialogOpen(true);
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 8l6 6" />
                <path d="M4 14s1-1 4-1 5 2 5 2" />
                <path d="M2 5h12" />
                <path d="M7 2v3" />
                <path d="M22 22l-5-10-5 10" />
                <path d="M14 18h6" />
              </svg>
              Traduzir
            </button>
          </>
        )}
      </div>
      {dialogOpen && textToTranslate && (
        <TranslationDialog
          original={textToTranslate}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}

// ── Action menu shown when clicking an existing highlight ──────────────────

interface HighlightActionMenuProps {
  currentColor: string;
  onChangeColor: (color: string) => void;
  onDelete: () => void;
  highlightText?: string;
}

export function HighlightActionMenu({
  currentColor,
  onChangeColor,
  onDelete,
  highlightText,
}: HighlightActionMenuProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg bg-secondary border border-border shadow-2xl px-3 py-2">
        {COLORS.map((c) => (
          <button
            key={c.id}
            title={c.label}
            className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 shrink-0 ${
              c.id === currentColor
                ? "border-white/80 scale-110 ring-2 ring-white/30"
                : "border-white/20 hover:border-white/80"
            }`}
            style={{ backgroundColor: c.bg }}
            onClick={() => {
              onChangeColor(c.id);
            }}
          />
        ))}
        <div className="w-px h-4 bg-border shrink-0" />
        {highlightText && (
          <Button
            title="Traduzir marcação"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shrink-0"
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8l6 6" />
              <path d="M4 14s1-1 4-1 5 2 5 2" />
              <path d="M2 5h12" />
              <path d="M7 2v3" />
              <path d="M22 22l-5-10-5 10" />
              <path d="M14 18h6" />
            </svg>
            Traduzir
          </Button>
        )}
        <Button
          title="Deletar marcação"
          className="flex items-center justify-center w-6 h-6 rounded text-text-muted hover:text-red-400 hover:bg-bg-hover transition-colors shrink-0"
          onClick={() => {
            onDelete();
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </Button>
      </div>
      {dialogOpen && highlightText && (
        <TranslationDialog
          original={highlightText}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}
