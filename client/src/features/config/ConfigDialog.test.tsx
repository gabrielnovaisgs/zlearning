// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useConfigStore } from './config.store'
import { ConfigDialog } from './ConfigDialog'

vi.mock('./sections/ThemesSection', () => ({
  ThemesSection: () => <div>themes-content</div>,
}))
vi.mock('./sections/ModelsSection', () => ({
  ModelsSection: () => <div>models-content</div>,
}))

beforeEach(() => {
  useConfigStore.setState({ isOpen: false })
})

describe('ConfigDialog', () => {
  it('renders nothing when closed', () => {
    render(<ConfigDialog />)
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument()
  })

  it('renders dialog when open', () => {
    useConfigStore.setState({ isOpen: true })
    render(<ConfigDialog />)
    expect(screen.getByText('Configurações')).toBeInTheDocument()
  })

  it('shows Temas section by default', () => {
    useConfigStore.setState({ isOpen: true })
    render(<ConfigDialog />)
    expect(screen.getByText('themes-content')).toBeInTheDocument()
  })

  it('switches to Modelos section when nav item clicked', async () => {
    useConfigStore.setState({ isOpen: true })
    render(<ConfigDialog />)
    await userEvent.click(screen.getByText('Modelos'))
    expect(screen.getByText('models-content')).toBeInTheDocument()
  })

  it('closes when store close() is called', () => {
    useConfigStore.setState({ isOpen: true })
    render(<ConfigDialog />)
    useConfigStore.getState().actions.close()
    expect(useConfigStore.getState().isOpen).toBe(false)
  })
})
