// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useConfigStore } from '../config.store'
import { ModelsSection } from './ModelsSection'

vi.mock('../config.store', () => ({
  useConfigStore: vi.fn(),
}))

const mockActions = { open: vi.fn(), close: vi.fn(), setModel: vi.fn() }
const mockModelConfig = {
  chat: { model: 'qwen3.5:4b', provider: 'ollama' },
  translate: { model: 'qwen3.5:4b', provider: 'ollama' },
}

beforeEach(() => {
  vi.mocked(useConfigStore).mockImplementation((selector: (s: any) => any) =>
    selector({ isOpen: false, modelConfig: mockModelConfig, actions: mockActions })
  )
})

describe('ModelsSection', () => {
  it('renders Chat and Tradução labels', () => {
    render(<ModelsSection />)
    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByText('Tradução')).toBeInTheDocument()
  })

  it('shows the current model in the chat trigger button', () => {
    render(<ModelsSection />)
    const triggers = screen.getAllByRole('button')
    const chatTrigger = triggers.find((b) => b.textContent?.includes('ollama/qwen3.5:4b'))
    expect(chatTrigger).toBeInTheDocument()
  })
})
