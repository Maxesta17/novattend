import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UpdateBanner from '../components/ui/UpdateBanner'

describe('UpdateBanner', () => {
  it('renderiza null cuando needRefresh es false', () => {
    const { container } = render(
      <UpdateBanner needRefresh={false} onUpdate={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renderiza el banner con texto "Nueva version disponible" cuando needRefresh es true', () => {
    render(<UpdateBanner needRefresh={true} onUpdate={vi.fn()} />)
    expect(screen.getByText('Nueva version disponible')).toBeInTheDocument()
  })

  it('renderiza boton con texto "Actualizar"', () => {
    render(<UpdateBanner needRefresh={true} onUpdate={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument()
  })

  it('llama onUpdate al pulsar el boton "Actualizar"', async () => {
    const handleUpdate = vi.fn()
    render(<UpdateBanner needRefresh={true} onUpdate={handleUpdate} />)
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(handleUpdate).toHaveBeenCalledOnce()
  })

  it('no tiene boton de cierre (no hay boton X)', () => {
    render(<UpdateBanner needRefresh={true} onUpdate={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveTextContent('Actualizar')
  })

  it('tiene role="status" y aria-live="polite"', () => {
    render(<UpdateBanner needRefresh={true} onUpdate={vi.fn()} />)
    const banner = screen.getByRole('status')
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveAttribute('aria-live', 'polite')
  })
})
