import { useState } from 'react'
import { isApiEnabled } from '../../config/api'
import { cambiarPassword } from '../../services/api'
import { clearSession } from '../../config/session'
import { validatePassword } from '../../utils/passwordPolicy'
import Button from '../ui/Button.jsx'
import PasswordInput from '../ui/PasswordInput.jsx'

/**
 * Formulario de cambio de password forzado (must_change_password).
 *
 * Flujo critico: handleCambiarPassword en el backend incrementa token_version,
 * lo que REVOCA el token actual. Por eso, tras un cambio correcto se limpia la
 * sesion (clearSession) y se notifica al padre para volver al login con un
 * mensaje de exito. NO se intenta reutilizar el token viejo (daria 401).
 *
 * La validacion de cliente (len>=10, no contiene usuario, no termina en 2026)
 * es solo para UX: la autoridad es el backend.
 *
 * @param {object} props
 * @param {string} props.username - usuario actual (para validar que no se incluya)
 * @param {function} props.onSuccess - callback tras cambio correcto (sesion ya limpiada)
 * @returns {JSX.Element}
 */
export default function ChangePasswordForm({ username, onSuccess }) {
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')

    if (nueva !== repetir) {
      setError('Las contraseñas no coinciden')
      return
    }

    // Validacion de cliente para feedback rapido (el backend re-valida).
    const check = validatePassword(nueva, username)
    if (!check.valid) {
      setError(check.error)
      return
    }

    setLoading(true)
    try {
      if (isApiEnabled()) {
        await cambiarPassword(nueva)
      } else {
        // Modo mock: simular latencia minima.
        await new Promise(r => setTimeout(r, 300))
      }
      // El token actual queda revocado: limpiar sesion y volver al login.
      clearSession()
      onSuccess()
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contraseña. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-up w-full flex flex-col gap-3">
      <p className="font-montserrat text-[13px] text-white/65 text-center text-pretty mb-1">
        Por seguridad, crea una nueva contraseña antes de continuar.
      </p>

      <PasswordInput
        placeholder="Nueva contraseña"
        value={nueva}
        onChange={e => setNueva(e.target.value)}
      />
      <PasswordInput
        placeholder="Repetir contraseña"
        value={repetir}
        onChange={e => setRepetir(e.target.value)}
      />

      <Button onClick={handleSubmit} fullWidth loading={loading}>
        {loading ? 'Guardando...' : 'Cambiar contraseña'}
      </Button>

      {error && (
        <div className="text-error mt-2 font-montserrat text-[13px] text-center text-pretty">
          {error}
        </div>
      )}
    </div>
  )
}
