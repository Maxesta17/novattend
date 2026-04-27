import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import StudentDetailPopup from '../components/features/StudentDetailPopup'

vi.mock('../config/api', () => ({ isApiEnabled: () => false }))
vi.mock('../services/api', () => ({ getAsistenciaAlumno: vi.fn() }))

const baseStudent = {
  id: 'a1',
  name: 'Belen Cases',
  teacher: 'Sven',
  group: 3,
  faltasSemana: 2,
  clasesSemana: 4,
  faltasMes: 5,
  clasesMes: 12,
  faltasTotal: 8,
  clasesTotal: 20,
  rachaFaltas: 0,
  ultimas8: [
    { fecha: '2026-04-21', presente: false },
    { fecha: '2026-04-22', presente: true },
    { fecha: '2026-04-23', presente: false },
  ],
  historicoSemanas: [
    { semana_inicio: '2026-04-13', clases: 4, faltas: 0 },
    { semana_inicio: '2026-04-20', clases: 4, faltas: 2 },
  ],
  absences: ['2026-04-23', '2026-04-21'],
}

describe('StudentDetailPopup', () => {
  it('no renderiza nada si student es null', () => {
    const { container } = render(<StudentDetailPopup student={null} onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('muestra nombre, profesor y grupo del alumno', () => {
    render(<StudentDetailPopup student={baseStudent} onClose={vi.fn()} />)
    expect(screen.getByText('Belen Cases')).toBeInTheDocument()
    expect(screen.getByText('Sven · Grupo 3')).toBeInTheDocument()
  })

  it('muestra faltas absolutas (semana, mes, convocatoria)', () => {
    render(<StudentDetailPopup student={baseStudent} onClose={vi.fn()} />)
    expect(screen.getByText('2 faltas / 4 clases')).toBeInTheDocument()
    expect(screen.getByText('5 faltas / 12 clases')).toBeInTheDocument()
    expect(screen.getByText('8 faltas / 20 clases')).toBeInTheDocument()
  })

  it('muestra "Sin clases" si la semana no tiene clases registradas', () => {
    const s = { ...baseStudent, faltasSemana: 0, clasesSemana: 0 }
    render(<StudentDetailPopup student={s} onClose={vi.fn()} />)
    expect(screen.getByText('Sin clases')).toBeInTheDocument()
    expect(screen.getByText('Sin clases registradas esta semana')).toBeInTheDocument()
  })

  it('muestra mensaje de Atencion con 2 faltas en la semana', () => {
    render(<StudentDetailPopup student={baseStudent} onClose={vi.fn()} />)
    expect(screen.getByText('Atencion — 2 faltas esta semana')).toBeInTheDocument()
  })

  it('muestra mensaje de Alerta con 3+ faltas en la semana', () => {
    const s = { ...baseStudent, faltasSemana: 3, clasesSemana: 4 }
    render(<StudentDetailPopup student={s} onClose={vi.fn()} />)
    expect(screen.getByText('Alerta — 3 faltas esta semana')).toBeInTheDocument()
  })

  it('muestra el bloque de ultimas clases con las fechas en formato corto', () => {
    render(<StudentDetailPopup student={baseStudent} onClose={vi.fn()} />)
    expect(screen.getByText('Ultimas clases')).toBeInTheDocument()
    expect(screen.getByText('21/04')).toBeInTheDocument()
    expect(screen.getByText('22/04')).toBeInTheDocument()
    expect(screen.getByText('23/04')).toBeInTheDocument()
  })

  it('muestra el historico semanal', () => {
    render(<StudentDetailPopup student={baseStudent} onClose={vi.fn()} />)
    expect(screen.getByText('Historico semanal')).toBeInTheDocument()
    expect(screen.getByText('Sem. 13/04')).toBeInTheDocument()
    expect(screen.getByText('Sem. 20/04')).toBeInTheDocument()
  })

  it('muestra los dias faltados desde props.absences (modo mock)', () => {
    render(<StudentDetailPopup student={baseStudent} onClose={vi.fn()} />)
    expect(screen.getByText('Dias faltados (2)')).toBeInTheDocument()
    expect(screen.getByText('23/04/2026')).toBeInTheDocument()
    expect(screen.getByText('21/04/2026')).toBeInTheDocument()
  })

  it('omite bloques opcionales si vienen vacios', () => {
    const s = { ...baseStudent, ultimas8: [], historicoSemanas: [], absences: [] }
    render(<StudentDetailPopup student={s} onClose={vi.fn()} />)
    expect(screen.queryByText('Ultimas clases')).not.toBeInTheDocument()
    expect(screen.queryByText('Historico semanal')).not.toBeInTheDocument()
    expect(screen.queryByText(/Dias faltados/)).not.toBeInTheDocument()
  })
})
