import { useState } from "react";
import { Button } from "@components/ui/button";
import { TranslationDialog } from "./TranslationDialog";

const COLORS = [
  { id: "yellow", bg: "#fef08a", label: "Yellow" },
  { id: "green", bg: "#86efac", label: "Green" },
  { id: "blue", bg: "#93c5fd", label: "Blue" },
  { id: "pink", bg: "#f9a8d4", label: "Pink" },
] as const;

const TRANSLATE_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8l6 6" />
    <path d="M4 14s1-1 4-1 5 2 5 2" />
    <path d="M2 5h12" />
    <path d="M7 2v3" />
    <path d="M22 22l-5-10-5 10" />
    <path d="M14 18h6" />
  </svg>
);

const DELETE_ICON = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 2l8 8M10 2l-8 8" />
  </svg>
);

// ── Unified highlight menu component ────────────────────────────────────────

interface ColorButtonProps {
  color: typeof COLORS[number];
  isSelected?: boolean;
  onSelect: (colorId: string) => void;
  useMouseDown?: boolean;
}

function ColorButton({ color, isSelected, onSelect, useMouseDown }: ColorButtonProps) {
  const className = isSelected
    ? `w-6 h-6 rounded-full border-2 transition-all hover:scale-110 shrink-0 border-white/80 scale-110 ring-2 ring-white/30`
    : `w-6 h-6 rounded-full border-2 border-white/20 hover:border-white/80 transition-all hover:scale-110 shrink-0`;

  const handleInteraction = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (useMouseDown) {
      e.preventDefault();
      e.stopPropagation();
    }
    onSelect(color.id);
  };

  return (
    <button
      key={color.id}
      title={color.label}
      className={className}
      style={{ backgroundColor: color.bg }}
      onClick={useMouseDown ? undefined : handleInteraction}
      onMouseDown={useMouseDown ? handleInteraction : undefined}
    />
  );
}

// ── Main unified menu component ─────────────────────────────────────────────

interface HighlightMenuProps {
  onColorSelect: (color: string) => void;
  selectedColor?: string;
  onDelete?: () => void;
  textToTranslate?: string;
  showLabel?: boolean;
  useMouseDownForColor?: boolean;
}

export function HighlightMenu({
  onColorSelect,
  selectedColor,
  onDelete,
  textToTranslate,
  showLabel = false,
  useMouseDownForColor = false,
}: HighlightMenuProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const bgClass = onDelete ? "bg-secondary" : "bg-bg-secondary";

  return (
    <>
      <div className={`flex items-center gap-2 rounded-lg ${bgClass} border border-border shadow-2xl px-3 py-2`}>
        {showLabel && <span className="text-xs text-text-muted shrink-0">Destacar:</span>}
        {COLORS.map((c) => (
          <ColorButton
            key={c.id}
            color={c}
            isSelected={selectedColor ? c.id === selectedColor : undefined}
            onSelect={onColorSelect}
            useMouseDown={useMouseDownForColor}
          />
        ))}
        {(textToTranslate || onDelete) && (
          <div className="w-px h-4 bg-border shrink-0" />
        )}
        {textToTranslate && (
          <button
            title={onDelete ? "Traduzir marcação" : "Traduzir seleção"}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shrink-0"
            {...(useMouseDownForColor
              ? {
                  onMouseDown: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDialogOpen(true);
                  },
                }
              : {
                  onClick: () => setDialogOpen(true),
                })}
          >
            {TRANSLATE_ICON}
            Traduzir
          </button>
        )}
        {onDelete && (
          <Button
            title="Deletar marcação"
            className="flex items-center justify-center w-6 h-6 rounded text-text-muted hover:text-red-400 hover:bg-bg-hover transition-colors shrink-0"
            onClick={onDelete}
          >
            {DELETE_ICON}
          </Button>
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

// ── Wrapper components for backward compatibility ────────────────────────────

interface ColorPickerProps {
  onPick: (color: string) => void;
  textToTranslate?: string;
}

export function ColorPicker({ onPick, textToTranslate }: ColorPickerProps) {
  return (
    <HighlightMenu
      onColorSelect={onPick}
      textToTranslate={textToTranslate}
      showLabel
      useMouseDownForColor
    />
  );
}

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
  return (
    <HighlightMenu
      onColorSelect={onChangeColor}
      selectedColor={currentColor}
      onDelete={onDelete}
      textToTranslate={highlightText}
    />
  );
}
