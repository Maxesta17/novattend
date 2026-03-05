import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Mock de react-router-dom: useNavigate y useLocation
const mockNavigate = vi.fn()
const mockLocationState = { convocatorias: [] }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState }),
  }
})

import ConvocatoriaPage from '../pages/ConvocatoriaPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <ConvocatoriaPage />
    </MemoryRouter>
  )
}

describe('ConvocatoriaPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renderiza titulo y subtitulo', () => {
    mockLocationState.convocatorias = []
    renderPage()
    expect(screen.getByText('Convocatorias')).toBeInTheDocument()
    expect(screen.getByText('Selecciona la convocatoria para pasar lista')).toBeInTheDocument()
  })

  it('muestra mensaje si no hay convocatorias', () => {
    mockLocationState.convocatorias = []
    renderPage()
    expect(screen.getByText('No hay convocatorias activas en este momento.')).toBeInTheDocument()
  })

  it('renderiza la lista de convocatorias', () => {
    mockLocationState.convocatorias = [
      { id: 'conv-1', nombre: 'Enero 2026', fecha_inicio: '2026-01-10', fecha_fin: '2026-01-31' },
      { id: 'conv-2', nombre: 'Febrero 2026', fecha_inicio: '2026-02-01', fecha_fin: '2026-02-28' },
    ]
    renderPage()
    expect(screen.getByText('Enero 2026')).toBeInTheDocument()
    expect(screen.getByText('Febrero 2026')).toBeInTheDocument()
  })

  it('muestra badge "Activa" para cada convocatoria', () => {
    mockLocationState.convocatorias = [
      { id: 'conv-1', nombre: 'Test', fecha_inicio: '2026-01-10', fecha_fin: '2026-01-31' },
    ]
    renderPage()
    expect(screen.getByText('Activa')).toBeInTheDocument()
  })

  it('formatea fechas correctamente', () => {
    mockLocationState.convocatorias = [
      { id: 'conv-1', nombre: 'Test', fecha_inicio: '2026-03-01', fecha_fin: '2026-03-31' },
    ]
    renderPage()
    // Verifica que se muestra el formato dia+mes abreviado en español
    const button = screen.getByRole('button')
    expect(button.textContent).toContain('mar')
  })

  it('navega a /attendance al seleccionar una convocatoria', async () => {
    const conv = { id: 'conv-1', nombre: 'Marzo 2026', fecha_inicio: '2026-03-01', fecha_fin: '2026-03-31' }
    mockLocationState.convocatorias = [conv]
    renderPage()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button'))

    expect(mockNavigate).toHaveBeenCalledWith('/attendance', {
      state: { convocatoria: conv },
    })
  })

  it('cada convocatoria es un boton independiente', async () => {
    const conv1 = { id: 'conv-1', nombre: 'Enero', fecha_inicio: '2026-01-10', fecha_fin: '2026-01-31' }
    const conv2 = { id: 'conv-2', nombre: 'Febrero', fecha_inicio: '2026-02-01', fecha_fin: '2026-02-28' }
    mockLocationState.convocatorias = [conv1, conv2]
    renderPage()

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)

    const user = userEvent.setup()
    await user.click(buttons[1])

    expect(mockNavigate).toHaveBeenCalledWith('/attendance', {
      state: { convocatoria: conv2 },
    })
  })
})
