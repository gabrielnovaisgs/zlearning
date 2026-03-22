import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useConfigStore } from '../config.store'
import { Button } from '@shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@shared/ui/command'
import { cn } from '@shared/ui/lib/utils'

type Provider = 'openrouter' | 'google' | 'ollama'

interface ModelOption {
  label: string
  model: string
  provider: Provider
}

const AVAILABLE_MODELS: ModelOption[] = [
  { label: 'ollama/qwen3.5:4b', model: 'qwen3.5:4b', provider: 'ollama' },
]

interface ModelComboboxProps {
  service: 'chat' | 'translate'
}

function ModelCombobox({ service }: ModelComboboxProps) {
  const [open, setOpen] = useState(false)
  const modelConfig = useConfigStore((s) => s.modelConfig)
  const setModel = useConfigStore((s) => s.actions.setModel)
  const current = modelConfig[service]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="button"
          className="w-56 justify-between font-normal"
        >
          <span className="truncate">{current.provider}/{current.model}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0">
        <Command>
          <CommandInput placeholder="Buscar modelo..." />
          <CommandList>
            <CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>
            <CommandGroup>
              {AVAILABLE_MODELS.map((m) => (
                <CommandItem
                  key={m.label}
                  value={m.label}
                  onSelect={() => {
                    setModel(service, { model: m.model, provider: m.provider })
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      current.model === m.model ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {m.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function ModelsSection() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <span className="text-sm text-fg w-16 shrink-0">Chat</span>
        <ModelCombobox service="chat" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-fg w-16 shrink-0">Tradução</span>
        <ModelCombobox service="translate" />
      </div>
    </div>
  )
}
