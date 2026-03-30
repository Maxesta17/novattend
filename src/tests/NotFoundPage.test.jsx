import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import NotFoundPage from '../pages/NotFoundPage'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('NotFoundPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('muestra el heading 404', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('muestra el mensaje Pagina no encontrada', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>)
    expect(screen.getByText('Pagina no encontrada')).toBeInTheDocument()
  })

  it('tiene boton Volver al inicio que navega a /', async () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>)
    const btn = screen.getByRole('button', { name: /volver al inicio/i })
    expect(btn).toBeInTheDocument()
    await userEvent.click(btn)
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
