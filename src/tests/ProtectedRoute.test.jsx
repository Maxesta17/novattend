import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'

function renderWithRouter(allowedRole) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/" element={<div>Login</div>} />
        <Route path="/protected" element={
          <ProtectedRoute allowedRole={allowedRole}>
            <div>Contenido protegido</div>
          </ProtectedRoute>
        } />
      </Routes>
    </MemoryRouter>
  )
}

// exp 8h en el futuro (segundos Unix), sesion vigente
const futureExp = Math.floor(Date.now() / 1000) + 8 * 3600
const pastExp = Math.floor(Date.now() / 1000) - 60

describe('ProtectedRoute', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('redirige a login si no hay sesion', () => {
    renderWithRouter('teacher')
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('redirige a login si el rol no coincide', () => {
    sessionStorage.setItem('user', JSON.stringify({ rol: 'ceo' }))
    renderWithRouter('teacher')
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('renderiza contenido si el rol coincide (rol)', () => {
    sessionStorage.setItem('user', JSON.stringify({ rol: 'teacher' }))
    renderWithRouter('teacher')
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })

  it('permite acceso ceo a ruta ceo', () => {
    sessionStorage.setItem('user', JSON.stringify({ rol: 'ceo' }))
    renderWithRouter('ceo')
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })

  it('acepta sesiones viejas con role (compat) durante la transicion', () => {
    sessionStorage.setItem('user', JSON.stringify({ role: 'teacher' }))
    renderWithRouter('teacher')
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })

  it('renderiza contenido si hay token con exp vigente', () => {
    sessionStorage.setItem('user', JSON.stringify({ rol: 'teacher', token: 'tok', exp: futureExp }))
    renderWithRouter('teacher')
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })

  it('redirige a login si el token esta expirado', () => {
    sessionStorage.setItem('user', JSON.stringify({ rol: 'teacher', token: 'tok', exp: pastExp }))
    renderWithRouter('teacher')
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })
})
