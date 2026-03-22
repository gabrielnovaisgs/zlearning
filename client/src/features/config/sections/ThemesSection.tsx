import { useThemeStore } from '@features/theme/theme.store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui/select'

const THEME_OPTIONS = [
  { value: 'indigo', label: 'Índigo' },
  { value: 'amber', label: 'Âmbar' },
] as const

export function ThemesSection() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.actions.setTheme)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="text-sm text-fg w-12 shrink-0">Tema</span>
        <Select value={theme} onValueChange={(v) => setTheme(v as 'indigo' | 'amber')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
