import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeekAlerts from '../components/features/WeekAlerts'

const mkStudent = (overrides = {}) => ({
  id: 'a1',
  name: 'Belen Cases',
  teacher: 'Sven',
  group: 3,
  faltasSemana: 2,
  clasesSemana: 4,
  rachaFaltas: 0,
  ...overrides,
})

describe('WeekAlerts', () => {
  it('muestra mensaje verde cuando no hay alertas ni rachas', () => {
    render(<WeekAlerts weekStudents={[]} streakStudents={[]} onStudentClick={vi.fn()} />)
    expect(screen.getByText('Sin alertas esta semana')).toBeInTheDocument()
  })

  it('renderiza la seccion de 2+ faltas con el alumno', () => {
    const s = mkStudent({ faltasSemana: 2, clasesSemana: 4 })
    render(<WeekAlerts weekStudents={[s]} streakStudents={[]} onStudentClick={vi.fn()} />)
    expect(screen.getByText('2+ faltas esta semana')).toBeInTheDocument()
    expect(screen.getByText('Belen Cases')).toBeInTheDocument()
    expect(screen.getByText('2 faltas / 4 clases')).toBeInTheDocument()
  })

  it('renderiza la seccion de racha activa', () => {
    const s = mkStudent({ id: 'a2', name: 'Carlos Garcia', faltasSemana: 0, rachaFaltas: 3 })
    render(<WeekAlerts weekStudents={[]} streakStudents={[s]} onStudentClick={vi.fn()} />)
    expect(screen.getByText('Racha activa (2+ faltas seguidas)')).toBeInTheDocument()
    expect(screen.getByText('Carlos Garcia')).toBeInTheDocument()
    expect(screen.getByText('3 faltas seguidas')).toBeInTheDocument()
  })

  it('llama onStudentClick al pulsar un alumno de la lista', async () => {
    const s = mkStudent()
    const handleClick = vi.fn()
    render(<WeekAlerts weekStudents={[s]} streakStudents={[]} onStudentClick={handleClick} />)
    await userEvent.click(screen.getByText('Belen Cases'))
    expect(handleClick).toHaveBeenCalledWith(s)
  })

  it('muestra ambas secciones a la vez si aplica', () => {
    const a = mkStudent({ id: 'a1', name: 'Belen Cases', faltasSemana: 2 })
    const b = mkStudent({ id: 'a2', name: 'Noelia Morillo', faltasSemana: 0, rachaFaltas: 2 })
    render(<WeekAlerts weekStudents={[a]} streakStudents={[b]} onStudentClick={vi.fn()} />)
    expect(screen.getByText('Belen Cases')).toBeInTheDocument()
    expect(screen.getByText('Noelia Morillo')).toBeInTheDocument()
  })

  it('default props: no rompe si no recibe weekStudents/streakStudents', () => {
    render(<WeekAlerts onStudentClick={vi.fn()} />)
    expect(screen.getByText('Sin alertas esta semana')).toBeInTheDocument()
  })
})
