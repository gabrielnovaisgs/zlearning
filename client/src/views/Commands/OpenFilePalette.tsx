import { useState, useEffect, useMemo } from "react";
import { store, useFileStore } from "@core/store";
import { flattenFiles, fuzzyMatch } from "./fuzzy-match";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const fileTree = useFileStore((state) => state.fileTree);

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
                  store.openFile(file.path);
                  handleOpenChange(false);
                }}
                className="flex flex-col items-start gap-0.5 px-4 py-2 rounded-none cursor-pointer"
              >
                <span className="text-sm">
                  <HighlightedName name={file.name} matches={file.matches} />
                </span>
                <span className="text-xs text-muted-foreground">{file.path}</span>
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
