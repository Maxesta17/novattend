import { Navigate } from 'react-router-dom'

/**
 * Guardia de ruta que valida sesion y rol.
 * @param {object} props
 * @param {string} props.allowedRole - Rol permitido ('teacher' | 'ceo')
 * @param {React.ReactNode} props.children - Contenido protegido
 */
export default function ProtectedRoute({ allowedRole, children }) {
  const raw = sessionStorage.getItem('novattend_user')
  if (!raw) return <Navigate to="/" replace />

  const user = JSON.parse(raw)
  if (user.role !== allowedRole) return <Navigate to="/" replace />

  return children
}
