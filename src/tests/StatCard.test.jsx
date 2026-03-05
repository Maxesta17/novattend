import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StatCard from '../components/ui/StatCard'

describe('StatCard', () => {
  it('renderiza valor y etiqueta', () => {
    render(<StatCard value={12} label="Presentes" />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Presentes')).toBeInTheDocument()
  })

  it('renderiza icono junto al valor', () => {
    render(<StatCard icon="✓" value={5} label="Ok" />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('ejecuta onClick si se proporciona', async () => {
    const handleClick = vi.fn()
    render(<StatCard value={3} label="Alerta" onClick={handleClick} />)
    await userEvent.click(screen.getByText('3').closest('div[class]'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('aplica variant dark', () => {
    const { container } = render(<StatCard value="80%" label="Asistencia" variant="dark" />)
    expect(container.firstChild.className).toContain('bg-white/[0.06]')
  })
})
