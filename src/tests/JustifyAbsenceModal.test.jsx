import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JustifyAbsenceModal from '../components/features/JustifyAbsenceModal'

const baseAbsence = { alumno_id: 'a1', fecha: '2026-04-23' }

const renderModal = (props = {}) =>
  render(
    <JustifyAbsenceModal
      isOpen
      absence={baseAbsence}
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      onUnjustify={vi.fn()}
      {...props}
    />
  )

describe('JustifyAbsenceModal', () => {
  it('no renderiza nada si no hay falta', () => {
    const { container } = render(
      <JustifyAbsenceModal
        isOpen
        absence={null}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onUnjustify={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('muestra la fecha de la falta y el titulo', () => {
    renderModal()
    expect(screen.getByText('Justificar falta')).toBeInTheDocument()
    expect(screen.getByText('23/04/2026')).toBeInTheDocument()
  })

  it('no muestra mensaje de error cuando error es null', () => {
    renderModal({ error: null })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('muestra el mensaje de error cuando se pasa la prop error', () => {
    renderModal({ error: 'Falta no encontrada' })
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Falta no encontrada')
    expect(alert).toHaveClass('text-error')
  })

  it('confirma con el motivo seleccionado de la lista', async () => {
    const onConfirm = vi.fn()
    renderModal({ onConfirm })
    await userEvent.click(screen.getByRole('button', { name: 'Enfermedad' }))
    await userEvent.click(screen.getByRole('button', { name: 'Justificar' }))
    expect(onConfirm).toHaveBeenCalledWith('Enfermedad')
  })
})
