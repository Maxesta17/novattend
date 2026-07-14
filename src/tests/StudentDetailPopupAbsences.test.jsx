import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StudentDetailPopup from '../components/features/StudentDetailPopup'
import { clearAbsencesCache } from '../components/features/studentDetailHelpers'
import { isApiEnabled } from '../config/api'
import { getAsistenciaAlumno, justificarFalta } from '../services/api'

vi.mock('../config/api', () => ({ isApiEnabled: vi.fn(() => true) }))
vi.mock('../services/api', () => ({
  getAsistenciaAlumno: vi.fn(),
  justificarFalta: vi.fn(),
}))

// Alumno abierto desde AttendancePage: solo id/nombre/grupo, sin metricas.
const apiStudent = { id: 'a1', name: 'Belen Cases', group: 3, teacherId: 'p1' }
const absenceRecord = { fecha: '2026-04-23', presente: false, justificada: false, motivo: '' }
const ERROR_MSG = 'No se pudieron cargar las faltas del alumno'

describe('StudentDetailPopup — faltas via API (error, metricas, cache, dirty)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // El cache de faltas es a nivel de modulo: se limpia para aislar tests.
    clearAbsencesCache()
    isApiEnabled.mockReturnValue(true)
  })

  it('muestra error y boton Reintentar si la carga de faltas falla', async () => {
    getAsistenciaAlumno.mockRejectedValueOnce(new Error('boom'))
    render(<StudentDetailPopup student={apiStudent} convocatoriaId="c1" onClose={vi.fn()} />)

    expect(await screen.findByText(ERROR_MSG)).toBeInTheDocument()

    // Reintentar recarga la lista saltando el cache y limpia el error.
    getAsistenciaAlumno.mockResolvedValueOnce([absenceRecord])
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('23/04/2026')).toBeInTheDocument()
    expect(screen.queryByText(ERROR_MSG)).not.toBeInTheDocument()
    expect(getAsistenciaAlumno).toHaveBeenCalledTimes(2)
  })

  it('sin metricas en el student no muestra el resumen 0/0 ni el banner semanal', async () => {
    getAsistenciaAlumno.mockResolvedValue([absenceRecord])
    render(<StudentDetailPopup student={apiStudent} convocatoriaId="c1" onClose={vi.fn()} />)

    await screen.findByText('23/04/2026')
    expect(screen.queryByText('Esta semana')).not.toBeInTheDocument()
    expect(screen.queryByText('Sin clases')).not.toBeInTheDocument()
    expect(screen.queryByText('Sin clases registradas esta semana')).not.toBeInTheDocument()
  })

  it('con metricas presentes (aunque valgan 0) si muestra el resumen', async () => {
    getAsistenciaAlumno.mockResolvedValue([])
    const withZeroMetrics = { ...apiStudent, faltasSemana: 0, clasesSemana: 0 }
    render(<StudentDetailPopup student={withZeroMetrics} convocatoriaId="c1" onClose={vi.fn()} />)

    expect(screen.getByText('Esta semana')).toBeInTheDocument()
    expect(screen.getByText('Sin clases registradas esta semana')).toBeInTheDocument()
    // Espera a que la carga (vacia) termine para no dejar updates fuera de act().
    await waitFor(() => expect(screen.queryByText('Cargando faltas...')).not.toBeInTheDocument())
  })

  it('la segunda apertura del mismo alumno no vuelve a llamar a la API (cache)', async () => {
    getAsistenciaAlumno.mockResolvedValue([absenceRecord])
    const { rerender } = render(
      <StudentDetailPopup student={apiStudent} convocatoriaId="c1" onClose={vi.fn()} />
    )
    expect(await screen.findByText('23/04/2026')).toBeInTheDocument()
    expect(getAsistenciaAlumno).toHaveBeenCalledTimes(1)

    // Cierra (student=null) y reabre con el mismo alumno.
    rerender(<StudentDetailPopup student={null} convocatoriaId="c1" onClose={vi.fn()} />)
    rerender(<StudentDetailPopup student={apiStudent} convocatoriaId="c1" onClose={vi.fn()} />)

    expect(await screen.findByText('23/04/2026')).toBeInTheDocument()
    expect(getAsistenciaAlumno).toHaveBeenCalledTimes(1)
  })

  it('justificar invalida el cache, recarga y dispara onDirtyClose al cerrar', async () => {
    getAsistenciaAlumno
      .mockResolvedValueOnce([absenceRecord])
      .mockResolvedValueOnce([{ ...absenceRecord, justificada: true, motivo: 'Enfermedad' }])
    justificarFalta.mockResolvedValue({})
    const onClose = vi.fn()
    const onDirtyClose = vi.fn()

    render(
      <StudentDetailPopup
        student={apiStudent}
        convocatoriaId="c1"
        allowJustify
        onClose={onClose}
        onDirtyClose={onDirtyClose}
      />
    )

    // Justifica la falta desde la fila -> modal de justificacion.
    await userEvent.click(await screen.findByRole('button', { name: 'Justificar' }))
    const dialog = screen.getByRole('dialog', { name: 'Justificar falta de asistencia' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enfermedad' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Justificar' }))

    // Tras justificar se invalido el cache y se recargo la lista (2 llamadas).
    expect(await screen.findByRole('button', { name: 'Justificada' })).toBeInTheDocument()
    expect(getAsistenciaAlumno).toHaveBeenCalledTimes(2)
    expect(onDirtyClose).not.toHaveBeenCalled()

    // Al cerrar con cambios pendientes (click en overlay) se notifica al padre.
    const detail = screen.getByRole('dialog', { name: 'Detalle de asistencia del alumno' })
    await userEvent.click(detail.parentElement)
    expect(onDirtyClose).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cerrar sin cambios NO dispara onDirtyClose', async () => {
    getAsistenciaAlumno.mockResolvedValue([absenceRecord])
    const onDirtyClose = vi.fn()
    render(
      <StudentDetailPopup
        student={apiStudent}
        convocatoriaId="c1"
        onClose={vi.fn()}
        onDirtyClose={onDirtyClose}
      />
    )
    await screen.findByText('23/04/2026')

    const detail = screen.getByRole('dialog', { name: 'Detalle de asistencia del alumno' })
    await userEvent.click(detail.parentElement)
    expect(onDirtyClose).not.toHaveBeenCalled()
  })
})
