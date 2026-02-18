const COLORS = [
  { id: "yellow", bg: "#fef08a", label: "Yellow" },
  { id: "green", bg: "#86efac", label: "Green" },
  { id: "blue", bg: "#93c5fd", label: "Blue" },
  { id: "pink", bg: "#f9a8d4", label: "Pink" },
] as const;

interface Props {
  onPick: (color: string) => void;
}

export function ColorPicker({ onPick }: Props) {
  return (
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
    </div>
  );
}
