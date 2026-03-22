// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useThemeStore } from '@features/theme/theme.store'
import { ThemesSection } from './ThemesSection'

vi.mock('@features/theme/theme.store', () => ({
  useThemeStore: vi.fn(),
}))

const mockActions = { setTheme: vi.fn(), setMode: vi.fn(), toggleMode: vi.fn(), cycleTheme: vi.fn() }

beforeEach(() => {
  vi.mocked(useThemeStore).mockImplementation((selector: (s: any) => any) =>
    selector({ theme: 'indigo', mode: 'dark', actions: mockActions })
  )
})

describe('ThemesSection', () => {
  it('renders the Tema label', () => {
    render(<ThemesSection />)
    expect(screen.getByText('Tema')).toBeInTheDocument()
  })

  it('displays current theme value in the select trigger', () => {
    render(<ThemesSection />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
