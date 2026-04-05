import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GroupTabs from '../components/features/GroupTabs.jsx'

const GROUPS = ['G1', 'G2', 'G3', 'G4']

describe('GroupTabs — ARIA WAI-ARIA Tabs', () => {
  it('tiene role=tablist con aria-label Grupos', () => {
    render(<GroupTabs groups={GROUPS} selected="G1" onChange={vi.fn()} />)
    expect(screen.getByRole('tablist', { name: 'Grupos' })).toBeInTheDocument()
  })

  it('tab activo tiene aria-selected=true y los demas false', () => {
    render(<GroupTabs groups={GROUPS} selected="G2" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: /Grupo G1/ })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: /Grupo G2/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Grupo G3/ })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: /Grupo G4/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('tab activo tiene tabIndex=0 y los demas tabIndex=-1', () => {
    render(<GroupTabs groups={GROUPS} selected="G3" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: /Grupo G1/ })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tab', { name: /Grupo G2/ })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tab', { name: /Grupo G3/ })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: /Grupo G4/ })).toHaveAttribute('tabindex', '-1')
  })

  it('ArrowRight llama onChange con el siguiente grupo', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<GroupTabs groups={GROUPS} selected="G1" onChange={onChange} />)
    // Foco en el tab activo (G1 tiene tabIndex=0)
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('G2')
  })

  it('ArrowRight desde el ultimo grupo hace wrap al primero (circular)', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<GroupTabs groups={GROUPS} selected="G4" onChange={onChange} />)
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('G1')
  })

  it('ArrowLeft llama onChange con el grupo anterior', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<GroupTabs groups={GROUPS} selected="G3" onChange={onChange} />)
    await user.tab()
    await user.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenCalledWith('G2')
  })

  it('click en un tab llama onChange con ese grupo', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<GroupTabs groups={GROUPS} selected="G1" onChange={onChange} />)
    await user.click(screen.getByRole('tab', { name: /Grupo G3/ }))
    expect(onChange).toHaveBeenCalledWith('G3')
  })
})
