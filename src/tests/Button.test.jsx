import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '../components/ui/Button'

describe('Button', () => {
  it('renderiza el texto', () => {
    render(<Button>Guardar</Button>)
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })

  it('ejecuta onClick al hacer click', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('no ejecuta onClick cuando variant es disabled', async () => {
    const handleClick = vi.fn()
    render(<Button variant="disabled" onClick={handleClick}>Disabled</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('no ejecuta onClick cuando loading es true', async () => {
    const handleClick = vi.fn()
    render(<Button loading onClick={handleClick}>Loading</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('muestra spinner cuando loading', () => {
    render(<Button loading>Cargando</Button>)
    const svg = screen.getByRole('button').querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('aplica fullWidth', () => {
    render(<Button fullWidth>Full</Button>)
    expect(screen.getByRole('button').className).toContain('w-full')
  })

  it('variante disabled usa clase bg-disabled (token Tailwind, no hex)', () => {
    render(<Button variant="disabled">Off</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-disabled')
    expect(btn.className).not.toContain('bg-[#')
  })
})
