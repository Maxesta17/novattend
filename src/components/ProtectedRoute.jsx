import { Navigate } from 'react-router-dom'
import { getSession, isExpired } from '../config/session'

/**
 * Guardia de ruta (solo UX): valida que exista sesion con token vigente y rol.
 *
 * La autoridad real es el backend (rechaza tokens forjados); este guard solo
 * evita render innecesario. Si no hay sesion, falta token o esta expirado,
 * redirige al login. Para autorizar usa `rol` con compat a `role` durante la
 * transicion (un undefined aqui dejaria fuera a usuarios legitimos).
 *
 * @param {object} props
 * @param {string} props.allowedRole - Rol permitido ('teacher' | 'ceo')
 * @param {React.ReactNode} props.children - Contenido protegido
 */
export default function ProtectedRoute({ allowedRole, children }) {
  const session = getSession()
  if (!session) return <Navigate to="/" replace />

  // Si hay token (modo auth real) y esta expirado, expulsar al login con
  // state.expired para que LoginPage muestre "Tu sesión expiró".
  if (session.token && isExpired()) {
    return <Navigate to="/" state={{ expired: true }} replace />
  }

  const rol = session.rol ?? session.role
  if (rol !== allowedRole) return <Navigate to="/" replace />

  return children
}
