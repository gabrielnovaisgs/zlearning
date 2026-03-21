import { registry } from "@features/command-palette/CommandRegistry";
import { useFileStore } from "@shared/file.store";

export function NewTabScreen() {

  function handleOpenFile() {
    registry.execute("open-file");
  }

  function handleNewFile() {
    useFileStore.getState().actions.createUntitledFile("");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-6">
        <p className="text-fg-muted text-sm">O que deseja fazer?</p>
        <div className="flex gap-4">
          <button
            onClick={handleOpenFile}
            className="
              flex flex-col items-center gap-3 px-8 py-6 w-44 rounded-xl cursor-pointer
              border border-border bg-surface transition-all
              hover:border-accent/50 hover:bg-surface-2 hover:-translate-y-px
              group
            "
          >
            <span className="text-3xl">📂</span>
            <div className="text-center">
              <div className="text-sm font-medium text-fg-secondary group-hover:text-accent transition-colors">Abrir arquivo</div>
              <div className="text-xs font-mono text-fg-muted mt-1">Ctrl+O</div>
            </div>
          </button>
          <button
            onClick={handleNewFile}
            className="
              flex flex-col items-center gap-3 px-8 py-6 w-44 rounded-xl cursor-pointer
              border border-border bg-surface transition-all
              hover:border-accent/50 hover:bg-surface-2 hover:-translate-y-px
              group
            "
          >
            <span className="text-3xl">✏️</span>
            <div className="text-center">
              <div className="text-sm font-medium text-fg-secondary group-hover:text-accent transition-colors">Novo arquivo</div>
              <div className="text-xs font-mono text-fg-muted mt-1">Ctrl+N</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
