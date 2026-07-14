import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Regresion "guardado fantasma": API activa + sin convocatoria (URL directa
// o icono PWA) debe redirigir al login, nunca caer a mocks ni simular exito.

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }), // sin convocatoria
  }
})

vi.mock('../config/api', () => ({
  isApiEnabled: vi.fn(() => true),
  API_URL: 'https://api.test',
}))

vi.mock('../services/api', () => ({
  getAlumnos: vi.fn(() => Promise.resolve([])),
  getAsistencia: vi.fn(() => Promise.resolve([])),
  guardarAsistencia: vi.fn(),
  getAsistenciaAlumno: vi.fn(),
  justificarFalta: vi.fn(),
}))

import AttendancePage from '../pages/AttendancePage'
import { guardarAsistencia, getAlumnos } from '../services/api'

describe('AttendancePage — anti guardado fantasma (API activa sin convocatoria)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('redirige a / (replace) sin cargar datos mock ni permitir guardado simulado', async () => {
    sessionStorage.setItem('user', JSON.stringify({
      profesor_id: 'prof-samuel', nombre: 'Samuel', rol: 'teacher',
    }))
    render(
      <MemoryRouter>
        <AttendancePage />
      </MemoryRouter>
    )

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    )

    // Nunca debe mostrar el roster mock ni simular un guardado con exito
    expect(screen.queryByText('Laura Garcia')).not.toBeInTheDocument()
    expect(guardarAsistencia).not.toHaveBeenCalled()
    expect(getAlumnos).not.toHaveBeenCalled()
  })
})
