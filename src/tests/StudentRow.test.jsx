import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StudentRow from '../components/features/StudentRow'

describe('StudentRow', () => {
  const defaultProps = {
    name: 'Ana Garcia',
    initials: 'AG',
    isPresent: false,
    onToggle: vi.fn(),
  }

  it('renderiza el nombre del alumno', () => {
    render(<StudentRow {...defaultProps} />)
    expect(screen.getByText('Ana Garcia')).toBeInTheDocument()
  })

  it('muestra iniciales cuando no esta presente', () => {
    render(<StudentRow {...defaultProps} isPresent={false} />)
    expect(screen.getByText('AG')).toBeInTheDocument()
  })

  it('muestra checkmark cuando esta presente', () => {
    render(<StudentRow {...defaultProps} isPresent={true} />)
    // Cuando isPresent=true, Avatar muestra checkmark en vez de iniciales
    expect(screen.queryByText('AG')).not.toBeInTheDocument()
  })

  it('ejecuta onToggle al hacer click en la fila', async () => {
    const handleToggle = vi.fn()
    render(<StudentRow {...defaultProps} onToggle={handleToggle} />)

    const user = userEvent.setup()
    await user.click(screen.getByText('Ana Garcia'))
    expect(handleToggle).toHaveBeenCalled()
  })

  it('aplica clases de presente cuando isPresent es true', () => {
    const { container } = render(<StudentRow {...defaultProps} isPresent={true} />)
    expect(container.firstChild.className).toContain('bg-burgundy-soft')
    expect(container.firstChild.className).toContain('border-burgundy/20')
  })

  it('aplica clases de ausente cuando isPresent es false', () => {
    const { container } = render(<StudentRow {...defaultProps} isPresent={false} />)
    expect(container.firstChild.className).toContain('bg-white')
    expect(container.firstChild.className).toContain('border-border-light')
  })

  it('renderiza stats opcionales', () => {
    const stats = <span>85% asistencia</span>
    render(<StudentRow {...defaultProps} stats={stats} />)
    expect(screen.getByText('85% asistencia')).toBeInTheDocument()
  })

  it('aplica animationDelay segun prop delay', () => {
    const { container } = render(<StudentRow {...defaultProps} delay={0.3} />)
    expect(container.firstChild.style.animationDelay).toBe('0.3s')
  })
})
