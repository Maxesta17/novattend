import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// --- Mocks (hoisted por Vitest, deben ir antes de los imports del modulo bajo prueba) ---

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: {
        convocatoria: {
          id: 'conv-1',
          nombre: 'Enero 2020',
          fecha_inicio: '2020-01-01',
          fecha_fin: '2020-01-31', // convocatoria vencida hace mucho
        },
      },
    }),
  }
})

vi.mock('../services/api', () => ({
  getAlumnos: vi.fn(),
  guardarAsistencia: vi.fn(),
}))

vi.mock('../config/api', () => ({
  isApiEnabled: vi.fn(() => false),
  API_URL: '',
}))

import AttendancePage from '../pages/AttendancePage'

/** Simula que la pestana vuelve a primer plano tras estar en segundo plano. */
function comeBackToForeground() {
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  fireEvent(document, new Event('visibilitychange'))
}

describe('AttendancePage — revalidacion de convocatoria al volver del background (fix M5)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockNavigate.mockClear()
    vi.clearAllMocks()
    sessionStorage.setItem('user', JSON.stringify({
      profesor_id: 'prof-samuel',
      nombre: 'Samuel',
      rol: 'teacher',
    }))
  })

  it('deshabilita Guardar y muestra aviso si la convocatoria ya no esta vigente al volver de segundo plano', async () => {
    render(
      <MemoryRouter>
        <AttendancePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Laura Garcia')).toBeInTheDocument()
    })

    // Marcar un alumno presente para que canSave sea true de entrada
    // (aislar que el bloqueo posterior viene de la revalidacion, no de canSave).
    fireEvent.click(screen.getByText('Laura Garcia'))

    const btn = screen.getByRole('button', { name: /Guardar asistencia/i })
    await waitFor(() => expect(btn).not.toBeDisabled())

    comeBackToForeground()

    await waitFor(() => {
      expect(screen.getByText(/ya no está vigente/i)).toBeInTheDocument()
    })
    expect(btn).toBeDisabled()
  })

  it('no muestra aviso mientras la pestana permanece en primer plano desde el inicio', async () => {
    render(
      <MemoryRouter>
        <AttendancePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Laura Garcia')).toBeInTheDocument()
    })

    // Sin evento visibilitychange: la revalidacion no corre en el montaje inicial.
    expect(screen.queryByText(/ya no está vigente/i)).not.toBeInTheDocument()
  })
})
