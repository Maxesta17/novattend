import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Listener global del evento 'auth:expired' (emitido por clearSession en un 401).
 *
 * Redirige al login con state { expired: true }. Deduplicado: varios 401 casi
 * simultaneos (p.ej. getProfesores + getResumen en paralelo) disparan multiples
 * eventos, pero solo se navega una vez. La marca se libera al llegar al login.
 *
 * Debe renderizarse DENTRO del Router (usa useNavigate).
 *
 * @returns {null}
 */
export default function AuthExpiredListener() {
  const navigate = useNavigate()
  const redirectingRef = useRef(false)

  useEffect(() => {
    const handleExpired = () => {
      if (redirectingRef.current) return
      redirectingRef.current = true
      navigate('/', { state: { expired: true } })
      // Liberar tras un tick para permitir futuras expiraciones de sesion.
      setTimeout(() => { redirectingRef.current = false }, 1000)
    }

    window.addEventListener('auth:expired', handleExpired)
    return () => window.removeEventListener('auth:expired', handleExpired)
  }, [navigate])

  return null
}
