import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TeacherCard from '../components/features/TeacherCard.jsx'

const MOCK_TEACHER = {
  id: 'prof-1',
  name: 'Samuel',
  initial: 'S',
  groups: [{
    id: 'G1-prof-1',
    number: 1,
    students: [
      { id: 'a1', name: 'Ana Garcia', weekly: 90, biweekly: 85, monthly: 88 },
      { id: 'a2', name: 'Carlos Ruiz', weekly: 70, biweekly: 65, monthly: 72 },
    ],
  }],
}

describe('TeacherCard — ARIA role=button expandible', () => {
  it('renderiza role=button en la cabecera del profesor', () => {
    render(
      <TeacherCard
        teacher={MOCK_TEACHER}
        isExpanded={false}
        onToggle={vi.fn()}
        onStudentClick={vi.fn()}
      />
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('aria-expanded=false cuando isExpanded es false', () => {
    render(
      <TeacherCard
        teacher={MOCK_TEACHER}
        isExpanded={false}
        onToggle={vi.fn()}
        onStudentClick={vi.fn()}
      />
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })

  it('aria-expanded cambia a true cuando isExpanded es true (via rerender)', () => {
    const { rerender } = render(
      <TeacherCard
        teacher={MOCK_TEACHER}
        isExpanded={false}
        onToggle={vi.fn()}
        onStudentClick={vi.fn()}
      />
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
    rerender(
      <TeacherCard
        teacher={MOCK_TEACHER}
        isExpanded={true}
        onToggle={vi.fn()}
        onStudentClick={vi.fn()}
      />
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })

  it('muestra el nombre del profesor y porcentaje de asistencia', () => {
    render(
      <TeacherCard
        teacher={MOCK_TEACHER}
        isExpanded={false}
        onToggle={vi.fn()}
        onStudentClick={vi.fn()}
      />
    )
    expect(screen.getByText('Samuel')).toBeInTheDocument()
    // Promedio monthly: (88 + 72) / 2 = 80 -> "80%"
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('Enter en el button llama onToggle', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(
      <TeacherCard
        teacher={MOCK_TEACHER}
        isExpanded={false}
        onToggle={onToggle}
        onStudentClick={vi.fn()}
      />
    )
    await user.tab()
    await user.keyboard('{Enter}')
    expect(onToggle).toHaveBeenCalled()
  })

  it('Space en el button llama onToggle', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(
      <TeacherCard
        teacher={MOCK_TEACHER}
        isExpanded={false}
        onToggle={onToggle}
        onStudentClick={vi.fn()}
      />
    )
    await user.tab()
    await user.keyboard(' ')
    expect(onToggle).toHaveBeenCalled()
  })

  it('Escape cuando isExpanded=true llama onToggle', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(
      <TeacherCard
        teacher={MOCK_TEACHER}
        isExpanded={true}
        onToggle={onToggle}
        onStudentClick={vi.fn()}
      />
    )
    await user.tab()
    await user.keyboard('{Escape}')
    expect(onToggle).toHaveBeenCalled()
  })

  it('Escape cuando isExpanded=false NO llama onToggle', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(
      <TeacherCard
        teacher={MOCK_TEACHER}
        isExpanded={false}
        onToggle={onToggle}
        onStudentClick={vi.fn()}
      />
    )
    await user.tab()
    await user.keyboard('{Escape}')
    expect(onToggle).not.toHaveBeenCalled()
  })
})
