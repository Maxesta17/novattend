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

// Mock de api.js: getConvocatorias + clases de error reales para instanceof
vi.mock('../services/api', () => {
  class AuthError extends Error {
    constructor(message, reason) { super(message); this.name = 'AuthError'; this.code = 401; this.reason = reason }
  }
  class PermissionError extends Error {
    constructor(message, reason) { super(message); this.name = 'PermissionError'; this.code = 403; this.reason = reason }
  }
  return { getConvocatorias: vi.fn(), AuthError, PermissionError }
})

// Mock de config/api.js
vi.mock('../config/api', () => ({
  isApiEnabled: vi.fn(() => false),
  API_URL: '',
}))

// Mock del hook useAuth: controlamos el resultado del login en cada test
const mockLogin = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ login: mockLogin, loading: false, error: null }),
}))

import LoginPage from '../pages/LoginPage'
import { getConvocatorias, AuthError } from '../services/api'
import { isApiEnabled } from '../config/api'

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

async function submitLogin(user, username = 'samuel', password = 'secreto') {
  await user.type(screen.getByPlaceholderText('Usuario'), username)
  await user.type(screen.getByPlaceholderText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
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

  it('muestra error de credenciales cuando login lanza AuthError 401', async () => {
    mockLogin.mockRejectedValue(new AuthError('credenciales', 'credentials'))
    renderLogin()
    const user = userEvent.setup()
    await submitLogin(user, 'falso', 'wrong')

    await waitFor(() => {
      expect(screen.getByText('Usuario o contraseña incorrectos')).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('muestra mensaje de red distinto cuando login lanza error generico', async () => {
    mockLogin.mockRejectedValue(new Error('Network down'))
    renderLogin()
    const user = userEvent.setup()
    await submitLogin(user)

    await waitFor(() => {
      expect(screen.getByText(/El servidor está tardando en responder/i)).toBeInTheDocument()
    })
  })

  it('navega a /dashboard para rol ceo', async () => {
    mockLogin.mockResolvedValue({ rol: 'ceo', nombre: 'CEO', profesor_id: 'prof-admin' })
    renderLogin()
    const user = userEvent.setup()
    await submitLogin(user, 'admin', 'secreto')

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('navega a /attendance para teacher sin API', async () => {
    isApiEnabled.mockReturnValue(false)
    mockLogin.mockResolvedValue({ rol: 'teacher', nombre: 'Samuel', profesor_id: 'prof-samuel' })
    renderLogin()
    const user = userEvent.setup()
    await submitLogin(user)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/attendance')
    })
  })

  it('navega a /attendance con state si API devuelve 1 convocatoria', async () => {
    isApiEnabled.mockReturnValue(true)
    mockLogin.mockResolvedValue({ rol: 'teacher', nombre: 'Samuel', profesor_id: 'prof-samuel' })
    const mockConv = { id: 'conv-1', nombre: 'Test' }
    getConvocatorias.mockResolvedValue([mockConv])

    renderLogin()
    const user = userEvent.setup()
    await submitLogin(user)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/attendance', {
        state: { convocatoria: mockConv },
      })
    })
  })

  it('navega a /convocatorias con state si API devuelve 2+ convocatorias', async () => {
    isApiEnabled.mockReturnValue(true)
    mockLogin.mockResolvedValue({ rol: 'teacher', nombre: 'Samuel', profesor_id: 'prof-samuel' })
    const mockConvs = [
      { id: 'conv-1', nombre: 'Enero' },
      { id: 'conv-2', nombre: 'Febrero' },
    ]
    getConvocatorias.mockResolvedValue(mockConvs)

    renderLogin()
    const user = userEvent.setup()
    await submitLogin(user)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/convocatorias', {
        state: { convocatorias: mockConvs },
      })
    })
  })

  it('muestra error si getConvocatorias falla para teacher', async () => {
    isApiEnabled.mockReturnValue(true)
    mockLogin.mockResolvedValue({ rol: 'teacher', nombre: 'Samuel', profesor_id: 'prof-samuel' })
    getConvocatorias.mockRejectedValue(new Error('Network error'))

    renderLogin()
    const user = userEvent.setup()
    await submitLogin(user)

    await waitFor(() => {
      expect(screen.getByText('El servidor está tardando en responder. Si el problema continúa, inténtalo de nuevo en unos minutos.')).toBeInTheDocument()
    })
  })

  it('muestra el formulario de cambio de password si must_change_password=true', async () => {
    mockLogin.mockResolvedValue({ rol: 'teacher', nombre: 'Samuel', profesor_id: 'prof-samuel', must_change_password: true })
    renderLogin()
    const user = userEvent.setup()
    await submitLogin(user)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nueva contraseña')).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
