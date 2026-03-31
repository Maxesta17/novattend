import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingSpinner from '../components/ui/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renderiza el texto "Cargando..."', () => {
    render(<LoadingSpinner />)
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  it('renderiza un elemento SVG (el spinner)', () => {
    const { container } = render(<LoadingSpinner />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('tiene un contenedor con clase min-h-screen', () => {
    const { container } = render(<LoadingSpinner />)
    const wrapper = container.firstChild
    expect(wrapper.className).toContain('min-h-screen')
  })
})
