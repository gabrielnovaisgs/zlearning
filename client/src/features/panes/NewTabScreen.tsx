import { registry } from "@features/command-palette/CommandRegistry";
import { useFileStore } from "@shared/file.store";
import { FolderOpen, FilePlus } from "lucide-react";

export function NewTabScreen() {

  function handleOpenFile() {
    registry.execute("open-file");
  }

  function handleNewFile() {
    useFileStore.getState().actions.createUntitledFile("");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-8">
        <span className="font-serif text-[28px] font-normal tracking-[-0.02em] text-fg-muted opacity-40">
          ZLearning
        </span>
        <p className="text-[12px] text-fg-muted tracking-[0.01em]">O que deseja fazer?</p>
        <div className="flex gap-3">
          <button
            onClick={handleOpenFile}
            className="group flex flex-col items-center gap-2.5 px-7 py-5 w-[130px] rounded-[14px] cursor-pointer border border-border bg-surface transition-all hover:border-accent hover:bg-surface-2 hover:-translate-y-px"
          >
            <div className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-surface-2 text-fg-secondary group-hover:bg-accent-dim group-hover:text-accent transition-colors">
              <FolderOpen size={16} strokeWidth={1.75} />
            </div>
            <div className="text-center">
              <div className="text-[12px] font-medium text-fg-secondary group-hover:text-accent transition-colors">Abrir arquivo</div>
              <div className="text-[10px] font-mono text-fg-muted mt-0.5">Ctrl+O</div>
            </div>
          </button>
          <button
            onClick={handleNewFile}
            className="group flex flex-col items-center gap-2.5 px-7 py-5 w-[130px] rounded-[14px] cursor-pointer border border-border bg-surface transition-all hover:border-accent hover:bg-surface-2 hover:-translate-y-px"
          >
            <div className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-surface-2 text-fg-secondary group-hover:bg-accent-dim group-hover:text-accent transition-colors">
              <FilePlus size={16} strokeWidth={1.75} />
            </div>
            <div className="text-center">
              <div className="text-[12px] font-medium text-fg-secondary group-hover:text-accent transition-colors">Novo arquivo</div>
              <div className="text-[10px] font-mono text-fg-muted mt-0.5">Ctrl+N</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
