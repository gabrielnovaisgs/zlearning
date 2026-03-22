// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfigNav } from './ConfigNav'

const items = [
  { id: 'themes', label: 'Temas', icon: null },
  { id: 'models', label: 'Modelos', icon: null },
]

describe('ConfigNav', () => {
  it('renders all nav items', () => {
    render(<ConfigNav items={items} activeId="themes" onSelect={vi.fn()} />)
    expect(screen.getByText('Temas')).toBeInTheDocument()
    expect(screen.getByText('Modelos')).toBeInTheDocument()
  })

  it('calls onSelect with item id when clicked', async () => {
    const onSelect = vi.fn()
    render(<ConfigNav items={items} activeId="themes" onSelect={onSelect} />)
    await userEvent.click(screen.getByText('Modelos'))
    expect(onSelect).toHaveBeenCalledWith('models')
  })

  it('applies active styles to the active item', () => {
    render(<ConfigNav items={items} activeId="themes" onSelect={vi.fn()} />)
    const activeBtn = screen.getByText('Temas').closest('button')
    expect(activeBtn?.className).toContain('bg-accent/10')
  })
})
