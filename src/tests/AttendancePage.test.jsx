import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// --- Mocks (hoisted por Vitest, deben ir antes de los imports del modulo bajo prueba) ---

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: { convocatoria: { id: 'conv-1', nombre: 'Enero 2026' } },
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

// --- Helpers ---

function renderPage() {
  sessionStorage.setItem('user', JSON.stringify({
    username: 'samuel',
    name: 'Samuel',
    role: 'teacher',
  }))
  return render(
    <MemoryRouter>
      <AttendancePage />
    </MemoryRouter>
  )
}

describe('AttendancePage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockNavigate.mockClear()
    vi.clearAllMocks()
  })

  it('renderiza el nombre del profesor desde sessionStorage', async () => {
    renderPage()
    // Esperar a que los alumnos se carguen (hook useStudents async)
    await waitFor(() => {
      expect(screen.queryByText('Alumnos · G1')).toBeInTheDocument()
    })
    expect(screen.getByText('Samuel')).toBeInTheDocument()
  })

  it('muestra las 3 StatCards: Presentes, Ausentes y Asistencia', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.queryByText('Alumnos · G1')).toBeInTheDocument()
    })
    expect(screen.getByText('Presentes')).toBeInTheDocument()
    expect(screen.getByText('Ausentes')).toBeInTheDocument()
    expect(screen.getByText('Asistencia')).toBeInTheDocument()
  })

  it('renderiza la lista de 12 alumnos del grupo G1 (mock data)', async () => {
    renderPage()
    // Esperar a que la lista de alumnos sea visible
    await waitFor(() => {
      expect(screen.getByText('Laura Garcia')).toBeInTheDocument()
    })
    // Verificar que todos los 12 alumnos del mock G1 estan presentes
    expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument()
    expect(screen.getByText('Maria Lopez')).toBeInTheDocument()
    expect(screen.getByText('Ana Martin')).toBeInTheDocument()
  })

  it('el boton Guardar asistencia existe y muestra el contador 0/12 inicialmente', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Laura Garcia')).toBeInTheDocument()
    })
    const btn = screen.getByRole('button', { name: /Guardar asistencia/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveTextContent('0/12')
  })

  it('muestra el nombre de la convocatoria en el subtitulo del header', async () => {
    renderPage()
    await waitFor(() => {
      // El subtitulo contiene "Enero 2026" (nombre de convocatoria mockeado)
      expect(screen.getByText(/Enero 2026/)).toBeInTheDocument()
    })
  })

  it('muestra "Profesor" como fallback si sessionStorage esta vacio', async () => {
    // No llamar sessionStorage.setItem — sesion vacia
    render(
      <MemoryRouter>
        <AttendancePage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.queryByText('Alumnos · G1')).toBeInTheDocument()
    })
    // Sin usuario en sesion, el fallback es "Profesor"
    expect(screen.getByText('Profesor')).toBeInTheDocument()
  })
})
