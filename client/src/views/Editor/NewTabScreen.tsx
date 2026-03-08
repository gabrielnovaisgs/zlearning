import { registry } from "@core/commands/CommandRegistry";
import { store } from "@core/store";



export function NewTabScreen() {

  function handleOpenFile() {
    registry.execute("open-file");
  }

  function handleNewFile() {
    store.createUntitledFile("");
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <p className="text-text-muted text-sm">O que deseja fazer?</p>
        <div className="flex gap-4">
          <button
            onClick={handleOpenFile}
            className="flex flex-col items-center gap-3 px-8 py-6 rounded-xl border border-border bg-bg-secondary hover:bg-bg-secondary/80 hover:border-accent/50 transition-colors group w-44"
          >
            <span className="text-3xl">📂</span>
            <div className="text-center">
              <div className="text-text-primary text-sm font-medium group-hover:text-accent transition-colors">Abrir arquivo</div>
              <div className="text-text-muted text-xs mt-1">Ctrl+O</div>
            </div>
          </button>
          <button
            onClick={handleNewFile}
            className="flex flex-col items-center gap-3 px-8 py-6 rounded-xl border border-border bg-bg-secondary hover:bg-bg-secondary/80 hover:border-accent/50 transition-colors group w-44"
          >
            <span className="text-3xl">✏️</span>
            <div className="text-center">
              <div className="text-text-primary text-sm font-medium group-hover:text-accent transition-colors">Novo arquivo</div>
              <div className="text-text-muted text-xs mt-1">Ctrl+N</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
