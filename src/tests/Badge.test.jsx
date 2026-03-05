import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Badge from '../components/ui/Badge'

describe('Badge', () => {
  it('renderiza el texto', () => {
    render(<Badge>LINGNOVA</Badge>)
    expect(screen.getByText('LINGNOVA')).toBeInTheDocument()
  })

  it('usa variant gold por defecto', () => {
    render(<Badge>Test</Badge>)
    expect(screen.getByText('Test').className).toContain('bg-gold')
  })

  it('aplica variant admin', () => {
    render(<Badge variant="admin">ADMIN</Badge>)
    expect(screen.getByText('ADMIN').className).toContain('bg-gold')
  })

  it('aplica variant status con color custom', () => {
    render(<Badge variant="status" color="bg-error">Alerta</Badge>)
    expect(screen.getByText('Alerta').className).toContain('bg-error')
  })

  it('acepta className adicional', () => {
    render(<Badge className="ml-2">Extra</Badge>)
    expect(screen.getByText('Extra').className).toContain('ml-2')
  })
})
