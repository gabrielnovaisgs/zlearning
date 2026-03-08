import { useState, useEffect } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";
import { translateText, getExamples, type TranslationExample } from "./translation.service";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@shared/ui/dialog";
import { Button } from "@shared/ui/button";

function Spinner() {
  return (
    <svg className="animate-spin shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

export interface TranslationDialogProps {
  original: string;
  onClose: () => void;
}

export function TranslationDialog({ original, onClose }: TranslationDialogProps) {
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
            from closing the HighlightMenu */}
        <DialogOverlay
          className="bg-black/50"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        />
        <DialogPrimitive.Content
          className="fixed top-[50%] left-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl bg-bg-secondary border border-border shadow-2xl p-5 flex flex-col gap-3 max-h-[90vh] overflow-y-auto outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
          onPointerDownCapture={(e) => {
            e.stopPropagation();
          }}
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
