import { Eye, Pencil } from "lucide-react";

type ViewMode = "edit" | "read";

interface Props {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Modo de visualização"
      className="flex overflow-hidden rounded-md border border-border bg-surface-2 text-xs font-medium"
    >
      <button
        aria-pressed={mode === "edit"}
        onClick={() => onChange("edit")}
        className={`flex items-center gap-1.5 px-2.5 py-1 transition-colors ${
          mode === "edit"
            ? "bg-surface text-accent"
            : "text-fg-muted hover:text-fg-secondary"
        }`}
      >
        <Pencil size={13} />
        Editar
      </button>
      <button
        aria-pressed={mode === "read"}
        onClick={() => onChange("read")}
        className={`flex items-center gap-1.5 px-2.5 py-1 transition-colors ${
          mode === "read"
            ? "bg-surface text-accent"
            : "text-fg-muted hover:text-fg-secondary"
        }`}
      >
        <Eye size={13} />
        Leitura
      </button>
    </div>
  );
}
