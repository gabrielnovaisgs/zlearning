import { useState, useEffect } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";
import { translateText, getExamples, type TranslationExample } from "@core/services/translation";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@components/ui/dialog";
import { Button } from "@components/ui/button";

const COLORS = [
  { id: "yellow", bg: "#fef08a", label: "Yellow" },
  { id: "green", bg: "#86efac", label: "Green" },
  { id: "blue", bg: "#93c5fd", label: "Blue" },
  { id: "pink", bg: "#f9a8d4", label: "Pink" },
] as const;

// ── Translation dialog ─────────────────────────────────────────────────────

interface TranslationDialogProps {
  original: string;
  onClose: () => void;
}

function Spinner() {
  return (
    <svg className="animate-spin shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function TranslationDialog({ original, onClose }: TranslationDialogProps) {
  const [transStatus, setTransStatus] = useState<"loading" | "done" | "error">("loading");
  const [translation, setTranslation] = useState("");
  const [transError, setTransError] = useState("");

  const [exStatus, setExStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [examples, setExamples] = useState<TranslationExample[]>([]);
  const [exError, setExError] = useState("");

  useEffect(() => {
    translateText(original)
      .then((t) => { setTranslation(t); setTransStatus("done"); })
      .catch((err: unknown) => {
        setTransError(err instanceof Error ? err.message : "Falha na tradução");
        setTransStatus("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fetchExamples() {
    setExStatus("loading");
    getExamples(original)
      .then((ex) => { setExamples(ex); setExStatus("done"); })
      .catch((err: unknown) => {
        setExError(err instanceof Error ? err.message : "Falha ao buscar exemplos");
        setExStatus("error");
      });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        {/* stopPropagation prevents react-pdf-highlighter's document listener
            from closing the ColorPicker / HighlightActionMenu */}
        <DialogOverlay
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        />
        <DialogPrimitive.Content
          className="fixed top-[50%] left-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl bg-bg-secondary border border-border shadow-2xl p-5 flex flex-col gap-3 max-h-[90vh] overflow-y-auto outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Header */}
          <DialogHeader>
            <DialogTitle className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Tradução — EN → PT
            </DialogTitle>
          </DialogHeader>
          <DialogClose className="absolute top-4 right-4 p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
            <XIcon className="size-3" />
            <span className="sr-only">Close</span>
          </DialogClose>

          {/* Original */}
          <div className="rounded-lg bg-bg-surface border border-border px-3 py-2">
            <p className="text-[10px] text-text-muted mb-1">Original</p>
            <p className="text-sm text-text-secondary leading-relaxed line-clamp-6">{original}</p>
          </div>

          {/* Translation */}
          <div className="rounded-lg bg-bg-surface border border-border px-3 py-2 min-h-15 flex items-center">
            {transStatus === "loading" && (
              <div className="flex items-center gap-2 text-text-muted text-sm">
                <Spinner />
                Traduzindo…
              </div>
            )}
            {transStatus === "error" && (
              <p className="text-sm text-red-400">{transError}</p>
            )}
            {transStatus === "done" && (
              <div className="w-full">
                <p className="text-[10px] text-text-muted mb-1">Português</p>
                <p className="text-sm text-text-primary leading-relaxed">{translation}</p>
              </div>
            )}
          </div>

          {/* Examples section */}
          {exStatus !== "idle" && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Exemplos de uso</p>
              {exStatus === "loading" && (
                <div className="flex items-center gap-2 text-text-muted text-sm px-1">
                  <Spinner />
                  Buscando exemplos…
                </div>
              )}
              {exStatus === "error" && (
                <p className="text-sm text-red-400 px-1">{exError}</p>
              )}
              {exStatus === "done" && examples.map((ex, i) => (
                <div key={i} className="rounded-lg bg-bg-surface border border-border px-3 py-2 flex flex-col gap-1">
                  <p className="text-sm text-text-primary leading-relaxed">{ex.original}</p>
                  <p className="text-xs text-text-muted leading-relaxed italic">{ex.translation}</p>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <DialogFooter className="sm:flex-row sm:justify-between pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchExamples}
              disabled={exStatus === "loading"}
              className="gap-1.5"
            >
              {exStatus === "loading" ? <Spinner /> : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              )}
              Exemplos
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

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
      <div className="flex items-center gap-2 rounded-lg bg-bg-secondary border border-border shadow-2xl px-3 py-2">
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
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChangeColor(c.id);
            }}
          />
        ))}
        <div className="w-px h-4 bg-border shrink-0" />
        {highlightText && (
          <button
            title="Traduzir marcação"
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
        )}
        <button
          title="Deletar marcação"
          className="flex items-center justify-center w-6 h-6 rounded text-text-muted hover:text-red-400 hover:bg-bg-hover transition-colors shrink-0"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
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
