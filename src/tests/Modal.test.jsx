import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Modal from '../components/ui/Modal.jsx'

describe('Modal', () => {
  it('renderiza children cuando isOpen es true', () => {
    render(
      <Modal isOpen onClose={() => {}}>
        <p>Contenido del modal</p>
      </Modal>
    )
    expect(screen.getByText('Contenido del modal')).toBeInTheDocument()
  })

  it('no renderiza nada cuando isOpen es false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Oculto</p>
      </Modal>
    )
    expect(screen.queryByText('Oculto')).not.toBeInTheDocument()
  })

  it('tiene role="dialog" en el contenedor interno', () => {
    render(
      <Modal isOpen onClose={() => {}} ariaLabel="Test modal">
        <p>Contenido</p>
      </Modal>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('tiene aria-modal="true"', () => {
    render(
      <Modal isOpen onClose={() => {}} ariaLabel="Test modal">
        <p>Contenido</p>
      </Modal>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('aplica aria-label desde prop ariaLabel', () => {
    render(
      <Modal isOpen onClose={() => {}} ariaLabel="Lista de alertas">
        <p>Contenido</p>
      </Modal>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-label', 'Lista de alertas')
  })
})
