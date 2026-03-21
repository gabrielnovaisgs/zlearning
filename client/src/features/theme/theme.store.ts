import { create } from 'zustand'

type ThemeMode = 'dark' | 'light'
type ThemeName = 'indigo' | 'amber'

interface ThemeState {
  mode: ThemeMode
  theme: ThemeName
  actions: {
    setMode: (mode: ThemeMode) => void
    setTheme: (theme: ThemeName) => void
    toggleMode: () => void
  }
}

function applyTheme(theme: ThemeName, mode: ThemeMode) {
  const html = document.documentElement
  html.setAttribute('data-theme', theme)
  html.classList.toggle('dark', mode === 'dark')
  localStorage.setItem('theme', theme)
  localStorage.setItem('mode', mode)
}

const savedTheme = (localStorage.getItem('theme') as ThemeName) ?? 'indigo'
const savedMode  = (localStorage.getItem('mode')  as ThemeMode) ?? 'dark'

// Apply immediately on module load (before React renders)
applyTheme(savedTheme, savedMode)

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode:  savedMode,
  theme: savedTheme,
  actions: {
    setMode: (mode) => {
      set({ mode })
      applyTheme(get().theme, mode)
    },
    setTheme: (theme) => {
      set({ theme })
      applyTheme(theme, get().mode)
    },
    toggleMode: () => {
      const next = get().mode === 'dark' ? 'light' : 'dark'
      get().actions.setMode(next)
    },
  },
}))
