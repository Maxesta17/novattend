import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// --- Mocks (hoisted por Vitest) ---

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/useDashboard.js', () => ({
  default: vi.fn(),
}))

import DashboardPage from '../pages/DashboardPage'
import useDashboard from '../hooks/useDashboard.js'

// --- Estado mock completo del hook ---

const MOCK_STATE = {
  convocatorias: [{ id: 'c1', nombre: 'Enero 2026' }],
  convocatoria: { id: 'c1', nombre: 'Enero 2026' },
  reload: vi.fn(),
  teachers: [
    {
      id: 'prof-1',
      name: 'Samuel',
      initial: 'S',
      groups: [{
        id: 'G1-prof-1',
        number: 1,
        students: [
          { id: 'a1', name: 'Ana Garcia', weekly: 90, biweekly: 85, monthly: 88 },
        ],
      }],
    },
  ],
  loading: false,
  error: null,
  expandedTeacher: null,
  searchQuery: '',
  setSearchQuery: vi.fn(),
  selectedStudent: null,
  setSelectedStudent: vi.fn(),
  handleStudentClose: vi.fn(),
  handleClear: vi.fn(),
  handleTeacherToggle: vi.fn(),
  handleConvChange: vi.fn(),
  totalStudents: 48,
  globalAttendance: 83,
  alertStudents: [],
  streakStudents: [],
  searchResults: [],
}

function renderPage() {
  sessionStorage.setItem('user', JSON.stringify({ username: 'admin', name: 'Admin', role: 'ceo' }))
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockNavigate.mockClear()
    vi.clearAllMocks()
    useDashboard.mockReturnValue(MOCK_STATE)
  })

  it('renderiza el titulo Dashboard cuando hay datos cargados', () => {
    renderPage()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('muestra el total de alumnos y porcentaje de asistencia global en StatCards', () => {
    renderPage()
    expect(screen.getByText('48')).toBeInTheDocument()
    expect(screen.getByText('83%')).toBeInTheDocument()
    expect(screen.getByText('Alumnos')).toBeInTheDocument()
    expect(screen.getByText('Asistencia')).toBeInTheDocument()
  })

  it('muestra skeleton y no el titulo cuando loading=true', () => {
    useDashboard.mockReturnValue({ ...MOCK_STATE, loading: true })
    renderPage()
    // DashboardSkeleton no renderiza el titulo "Dashboard"
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('muestra el mensaje de error y el boton Reintentar cuando hay error', () => {
    useDashboard.mockReturnValue({ ...MOCK_STATE, loading: false, error: 'Error de red' })
    renderPage()
    expect(screen.getByText('Error de red')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument()
  })

  it('renderiza TeacherCard para cada profesor en teachers', () => {
    renderPage()
    expect(screen.getByText('Samuel')).toBeInTheDocument()
  })

  it('click en Reintentar llama reload del hook', async () => {
    const reload = vi.fn()
    useDashboard.mockReturnValue({ ...MOCK_STATE, loading: false, error: 'Error', reload })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/i }))
    expect(reload).toHaveBeenCalled()
  })
})
