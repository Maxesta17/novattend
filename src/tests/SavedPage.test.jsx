import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock useNavigate y useLocation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: vi.fn(),
  }
})

import { useLocation } from 'react-router-dom'
import SavedPage from '../pages/SavedPage'

describe('SavedPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('no redirige cuando present es 0 (muestra la pagina)', () => {
    useLocation.mockReturnValue({
      state: { present: 0, total: 10, group: 'G1', convocatoria: null },
    })
    render(<SavedPage />)
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(screen.getByText('Asistencia guardada')).toBeInTheDocument()
  })

  it('no muestra "NaN%" cuando total es 0 (division protegida)', () => {
    useLocation.mockReturnValue({
      state: { present: 0, total: 0, group: 'G1', convocatoria: null },
    })
    render(<SavedPage />)
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
  })

  it('redirige a /attendance cuando state es null', () => {
    useLocation.mockReturnValue({ state: null })
    render(<SavedPage />)
    expect(mockNavigate).toHaveBeenCalledWith('/attendance')
  })

  it('redirige cuando present es undefined', () => {
    useLocation.mockReturnValue({
      state: { total: 10, group: 'G1' },
    })
    render(<SavedPage />)
    expect(mockNavigate).toHaveBeenCalledWith('/attendance')
  })

  it('variante queued: muestra "Guardado pendiente de sincronizar" en vez de exito', () => {
    useLocation.mockReturnValue({
      state: { present: 5, total: 10, group: 'G2', convocatoria: null, queued: true },
    })
    render(<SavedPage />)
    expect(screen.getByText('Guardado pendiente de sincronizar')).toBeInTheDocument()
    expect(screen.queryByText('Asistencia guardada')).not.toBeInTheDocument()
    expect(screen.getByText(/Se enviará automáticamente al recuperar la conexión/)).toBeInTheDocument()
  })

  it('sin queued: muestra el titulo de exito normal', () => {
    useLocation.mockReturnValue({
      state: { present: 5, total: 10, group: 'G2', convocatoria: null },
    })
    render(<SavedPage />)
    expect(screen.getByText('Asistencia guardada')).toBeInTheDocument()
    expect(screen.queryByText(/pendiente de sincronizar/)).not.toBeInTheDocument()
  })
})
