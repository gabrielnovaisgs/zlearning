import { useState, useEffect, useMemo } from "react";
import { usePaneController } from "@features/panes/pane-controller.store";
import { flattenFiles, fuzzyMatch } from "./fuzzy-match";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@shared/ui/command";
import { useFiles } from "@shared/hooks/use-files";
import { FileText, BookOpen } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const { fileTree } = useFiles();

  const files = useMemo(() => flattenFiles(fileTree), [fileTree]);
  const results = useMemo(() => fuzzyMatch(query, files), [query, files]);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  function handleOpenChange(o: boolean) {
    if (!o) {
      setQuery("");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="overflow-hidden p-0 top-[15vh] translate-y-0 max-w-lg"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Open file</DialogTitle>
          <DialogDescription>Search for a file to open</DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} className="bg-transparent">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Open file..."
          />
          <CommandList className="max-h-80">
            <CommandEmpty>No files found</CommandEmpty>
            {results.map((file) => (
              <CommandItem
                key={file.path}
                value={file.path}
                onSelect={() => {
                  usePaneController.getState().actions.openFileInPane(file.path);
                  handleOpenChange(false);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer hover:bg-accent/10"
              >
                {file.path.endsWith('.pdf')
                  ? <BookOpen size={14} className="text-[#E07B54] shrink-0" />
                  : <FileText size={14} className="text-fg-secondary shrink-0" />
                }
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm">
                    <HighlightedName name={file.name} matches={file.matches} />
                  </span>
                  <span className="text-xs text-fg-muted truncate">{file.path}</span>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function HighlightedName({ name, matches }: { name: string; matches: number[] }) {
  if (matches.length === 0) return <>{name}</>;

  const matchSet = new Set(matches);
  return (
    <>
      {[...name].map((char, i) =>
        matchSet.has(i) ? (
          <span key={i} className="text-accent font-semibold">
            {char}
          </span>
        ) : (
          <span key={i}>{char}</span>
        )
      )}
    </>
  );
}
