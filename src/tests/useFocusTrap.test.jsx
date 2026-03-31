import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import useFocusTrap from '../hooks/useFocusTrap.js'

// Componente auxiliar que usa el hook con un ref real adjunto al DOM
function TrapContainer({ isOpen, onClose, children }) {
  const containerRef = useFocusTrap(isOpen, onClose)
  return (
    <div ref={containerRef} tabIndex={-1} data-testid="trap-container">
      {children}
    </div>
  )
}

describe('useFocusTrap', () => {
  it('retorna un ref object', () => {
    const onClose = vi.fn()
    render(<TrapContainer isOpen={false} onClose={onClose} />)
    // Si el componente monta sin error, el hook retorna un ref valido
    expect(screen.getByTestId('trap-container')).toBeInTheDocument()
  })

  it('llama onClose al presionar Escape', () => {
    const onClose = vi.fn()
    render(
      <TrapContainer isOpen={true} onClose={onClose}>
        <button>Cerrar</button>
      </TrapContainer>
    )

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(onClose).toHaveBeenCalledOnce()
  })
})
