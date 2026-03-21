import { useEffect } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon, BookOpen } from "lucide-react";
import { useTranslation } from "./use-translation";
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
  const {
    translation, isTranslating, translationError, translate,
    examples, isFetchingExamples, examplesError, hasRequestedExamples, fetchExamples,
  } = useTranslation(original);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    translate();
  }, []);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay
          className="bg-black/40 backdrop-blur-sm"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        />
        <DialogPrimitive.Content
          className="fixed top-[50%] left-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl bg-surface border border-border shadow-xl p-5 flex flex-col gap-3 max-h-[90vh] overflow-y-auto outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
          onPointerDownCapture={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <DialogHeader>
            <DialogTitle className="text-xs font-semibold text-fg-muted uppercase tracking-widest">
              Tradução — EN → PT
            </DialogTitle>
          </DialogHeader>
          <DialogClose className="absolute top-4 right-4 p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors">
            <XIcon className="size-3.5" />
            <span className="sr-only">Close</span>
          </DialogClose>

          {/* Original */}
          <div className="rounded-lg bg-bg border border-border px-3 py-2.5">
            <p className="text-xs text-fg-muted mb-1">Original</p>
            <p className="text-sm text-fg-secondary leading-relaxed line-clamp-6">{original}</p>
          </div>

          {/* Translation */}
          <div className="rounded-lg bg-bg border border-border px-3 py-2.5 min-h-14 flex items-center">
            {isTranslating && (
              <div className="flex items-center gap-2 text-fg-muted text-sm">
                <Spinner />
                Traduzindo…
              </div>
            )}
            {translationError && (
              <p className="text-sm text-red-400">{translationError}</p>
            )}
            {!isTranslating && !translationError && (
              <div className="w-full">
                <p className="text-xs text-fg-muted mb-1">Português</p>
                <p className="text-sm text-fg leading-relaxed">{translation}</p>
              </div>
            )}
          </div>

          {/* Examples section */}
          {hasRequestedExamples && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-widest">Exemplos de uso</p>
              {isFetchingExamples && (
                <div className="flex items-center gap-2 text-fg-muted text-sm px-1">
                  <Spinner />
                  Buscando exemplos…
                </div>
              )}
              {examplesError && (
                <p className="text-sm text-red-400 px-1">{examplesError}</p>
              )}
              {!isFetchingExamples && !examplesError && examples.map((ex, i) => (
                <div key={i} className="rounded-lg bg-bg border border-border px-3 py-2.5 flex flex-col gap-1">
                  <p className="text-sm text-fg leading-relaxed">{ex.original}</p>
                  <p className="text-xs text-fg-muted leading-relaxed italic">{ex.translation}</p>
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
              disabled={isFetchingExamples}
              className="gap-1.5"
            >
              {isFetchingExamples ? <Spinner /> : <BookOpen size={12} strokeWidth={1.75} />}
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
