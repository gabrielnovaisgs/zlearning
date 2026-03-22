import { cn } from '@shared/ui/lib/utils'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
}

interface ConfigNavProps {
  items: NavItem[]
  activeId: string
  onSelect: (id: string) => void
}

export function ConfigNav({ items, activeId, onSelect }: ConfigNavProps) {
  return (
    <nav className="w-44 shrink-0 border-r border-border h-full py-3 px-2 flex flex-col gap-0.5">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={cn(
            'flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-left transition-colors',
            item.id === activeId
              ? 'bg-accent/10 text-fg'
              : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  )
}
