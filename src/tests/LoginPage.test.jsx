import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Mock de react-router-dom: useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Mock de api.js
vi.mock('../services/api', () => ({
  getConvocatorias: vi.fn(),
}))

// Mock de config/api.js
vi.mock('../config/api', () => ({
  isApiEnabled: vi.fn(() => false),
  API_URL: '',
}))

import LoginPage from '../pages/LoginPage'
import { getConvocatorias } from '../services/api'
import { isApiEnabled } from '../config/api'

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockNavigate.mockClear()
    vi.clearAllMocks()
    isApiEnabled.mockReturnValue(false)
  })

  it('renderiza el formulario con campos y boton', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('Usuario')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('renderiza titulo y subtitulo', () => {
    renderLogin()
    expect(screen.getByText('NovAttend')).toBeInTheDocument()
    expect(screen.getByText('Control de Asistencia')).toBeInTheDocument()
  })

  it('muestra error con credenciales incorrectas', async () => {
    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Usuario'), 'falso')
    await user.type(screen.getByPlaceholderText('Contraseña'), 'wrong')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    expect(screen.getByText('Usuario o contraseña incorrectos')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('navega a /dashboard para rol ceo', async () => {
    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Usuario'), 'admin')
    await user.type(screen.getByPlaceholderText('Contraseña'), 'lingnova2026')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('guarda usuario en sessionStorage al hacer login correcto', async () => {
    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Usuario'), 'admin')
    await user.type(screen.getByPlaceholderText('Contraseña'), 'lingnova2026')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    const stored = JSON.parse(sessionStorage.getItem('user'))
    expect(stored.role).toBe('ceo')
    expect(stored.username).toBe('admin')
  })

  it('navega a /attendance para teacher sin API', async () => {
    isApiEnabled.mockReturnValue(false)
    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Usuario'), 'samuel')
    await user.type(screen.getByPlaceholderText('Contraseña'), 'samuel2026')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/attendance')
  })

  it('navega a /attendance con state si API devuelve 1 convocatoria', async () => {
    isApiEnabled.mockReturnValue(true)
    const mockConv = { id: 'conv-1', nombre: 'Test' }
    getConvocatorias.mockResolvedValue([mockConv])

    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Usuario'), 'samuel')
    await user.type(screen.getByPlaceholderText('Contraseña'), 'samuel2026')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/attendance', {
        state: { convocatoria: mockConv },
      })
    })
  })

  it('navega a /convocatorias con state si API devuelve 2+ convocatorias', async () => {
    isApiEnabled.mockReturnValue(true)
    const mockConvs = [
      { id: 'conv-1', nombre: 'Enero' },
      { id: 'conv-2', nombre: 'Febrero' },
    ]
    getConvocatorias.mockResolvedValue(mockConvs)

    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Usuario'), 'samuel')
    await user.type(screen.getByPlaceholderText('Contraseña'), 'samuel2026')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/convocatorias', {
        state: { convocatorias: mockConvs },
      })
    })
  })

  it('muestra error si API falla para teacher', async () => {
    isApiEnabled.mockReturnValue(true)
    getConvocatorias.mockRejectedValue(new Error('Network error'))

    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Usuario'), 'samuel')
    await user.type(screen.getByPlaceholderText('Contraseña'), 'samuel2026')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(screen.getByText('Error al conectar con el servidor. Reintenta.')).toBeInTheDocument()
    })
  })
})
