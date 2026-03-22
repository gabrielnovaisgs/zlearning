import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Provider = 'openrouter' | 'google' | 'ollama'

interface ModelEntry {
  model: string
  provider: Provider
}

interface ConfigState {
  isOpen: boolean
  modelConfig: {
    chat: ModelEntry
    translate: ModelEntry
  }
  actions: {
    open: () => void
    close: () => void
    setModel: (service: 'chat' | 'translate', entry: ModelEntry) => void
  }
}

const DEFAULT_MODEL: ModelEntry = { model: 'qwen3.5:4b', provider: 'ollama' }

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      isOpen: false,
      modelConfig: {
        chat: DEFAULT_MODEL,
        translate: DEFAULT_MODEL,
      },
      actions: {
        open: () => set({ isOpen: true }),
        close: () => set({ isOpen: false }),
        setModel: (service, entry) =>
          set((s) => ({
            modelConfig: { ...s.modelConfig, [service]: entry },
          })),
      },
    }),
    {
      name: 'zlearning-config',
      partialize: (s) => ({ modelConfig: s.modelConfig }),
    },
  ),
)
