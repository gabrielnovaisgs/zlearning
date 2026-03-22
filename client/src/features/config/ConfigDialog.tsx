import { useState } from 'react'
import { Settings, Palette } from 'lucide-react'
import { useConfigStore } from './config.store'
import { ConfigNav } from './ConfigNav'
import { ThemesSection } from './sections/ThemesSection'
import { ModelsSection } from './sections/ModelsSection'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@shared/ui/dialog'

type SectionId = 'themes' | 'models'

const NAV_ITEMS = [
  { id: 'themes' as SectionId, label: 'Temas', icon: <Palette className="size-4" /> },
  { id: 'models' as SectionId, label: 'Modelos', icon: <Settings className="size-4" /> },
]

export function ConfigDialog() {
  const isOpen = useConfigStore((s) => s.isOpen)
  const close = useConfigStore((s) => s.actions.close)
  const [activeSection, setActiveSection] = useState<SectionId>('themes')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent className="w-[640px] max-w-[640px] h-[400px] p-0 flex flex-col gap-0">
        <div className="flex items-center px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-base font-semibold">Configurações</DialogTitle>
        </div>
        <div className="flex flex-1 min-h-0">
          <ConfigNav
            items={NAV_ITEMS}
            activeId={activeSection}
            onSelect={(id) => setActiveSection(id as SectionId)}
          />
          <div className="flex-1 p-6 overflow-y-auto">
            {activeSection === 'themes' && <ThemesSection />}
            {activeSection === 'models' && <ModelsSection />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
