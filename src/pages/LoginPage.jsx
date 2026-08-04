import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { isApiEnabled } from '../config/api'
import { getConvocatorias, AuthError, PermissionError } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import ChangePasswordForm from '../components/features/ChangePasswordForm.jsx'
import ForgotPasswordForm from '../components/features/ForgotPasswordForm.jsx'
import PasswordInput from '../components/ui/PasswordInput.jsx'
import Button from '../components/ui/Button.jsx'

// Mensaje honesto compartido (login y getConvocatorias): no culpa a la
// conexion del profesor -- la causa es el borde de red de Google, no el
// cliente -- ni promete resolucion rapida (episodios medidos: 60-95 min).
const SERVER_SLOW_MESSAGE = 'El servidor está tardando en responder. Si el problema continúa, inténtalo de nuevo en unos minutos.'

/**
 * Pagina de autenticacion. Valida credenciales contra el backend real y
 * redirige segun el rol. Si el login devuelve must_change_password, muestra
 * el formulario de cambio de password forzado en vez de navegar.
 * @returns {JSX.Element}
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState(initialInfo(location.state))
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)
  // Aviso progresivo tras 6s. Latencia real bimodal (1-4s o 14-45s): en un
  // episodio degradado el aviso aparece en la mayoria de los intentos, no como excepcion.
  const [slow, setSlow] = useState(false)
  const slowTimerRef = useRef(null)
  // Sesion pendiente de cambio de password forzado (no navegamos hasta cambiarla).
  const [mustChange, setMustChange] = useState(null)
  // Pantalla de "olvide mi contrasena" (reset por email).
  const [forgot, setForgot] = useState(false)

  // Limpieza del aviso progresivo al desmontar (timer todavia en marcha).
  useEffect(() => () => clearTimeout(slowTimerRef.current), [])

  const clearSlowTimer = () => {
    clearTimeout(slowTimerRef.current)
    setSlow(false)
  }

  // Tras login OK: ramificar por rol. getConvocatorias() ya reintenta (dos
  // intentos de 12s, ver src/services/api/http.js). ceo va directo al dashboard.
  const routeBySession = async (sess) => {
    const rol = sess.rol ?? sess.role
    if (rol === 'ceo') {
      clearSlowTimer()
      navigate('/dashboard')
      return
    }
    if (!isApiEnabled()) {
      clearSlowTimer()
      navigate('/attendance')
      return
    }
    try {
      const convocatorias = await getConvocatorias()
      clearSlowTimer()
      if (!convocatorias || convocatorias.length === 0) {
        setError('No hay convocatorias activas')
        setLoading(false)
        return
      }
      if (convocatorias.length === 1) {
        navigate('/attendance', { state: { convocatoria: convocatorias[0] } })
      } else {
        navigate('/convocatorias', { state: { convocatorias } })
      }
    } catch {
      clearSlowTimer()
      setError(SERVER_SLOW_MESSAGE)
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setError('')
    setInfo('')
    setLoading(true)
    slowTimerRef.current = setTimeout(() => setSlow(true), 6000)
    let sess
    try {
      sess = await login((username || '').trim(), password)
    } catch (err) {
      clearSlowTimer()
      setLoading(false)
      setError(loginErrorMessage(err))
      setShake(true)
      setTimeout(() => setShake(false), 700)
      return
    }

    // Con must_change_password el token solo sirve para cambiarPassword.
    if (sess?.must_change_password) {
      clearSlowTimer()
      setLoading(false)
      setMustChange(sess)
      return
    }

    await routeBySession(sess)
  }

  // Tras cambiar la password, volver al login limpio con mensaje de exito.
  const handlePasswordChanged = () => {
    setMustChange(null)
    setPassword('')
    setInfo('Contraseña actualizada, inicia sesión con tu nueva contraseña')
  }

  return (
    <div className="min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-burgundy-dark relative overflow-hidden flex flex-col items-center justify-center px-5 py-6 box-border">
      <div className="relative flex flex-col items-center w-full max-w-[360px]">
        <img
          className="animate-fade-up delay-0 w-20 h-20 mb-7 object-cover shadow-xl rounded-xl"
          src="/logova1.png"
          alt="NovAttend"
        />

        <h1 className="animate-fade-up delay-1 font-cinzel text-[28px] font-bold text-gold m-0 mb-1.5 text-balance text-center">
          NovAttend
        </h1>

        <p className="animate-fade-up delay-2 font-montserrat text-[13px] text-white/55 m-0 mb-[22px] font-normal text-pretty">
          Control de Asistencia
        </p>

        <div className="animate-fade-up delay-3 flex items-center gap-2 mb-8 w-full justify-center">
          <div className="flex-1 h-px bg-gold/25" />
          <span className="font-montserrat text-[9px] text-gold/90 uppercase font-medium whitespace-nowrap">
            LINGNOVA ACADEMY
          </span>
          <div className="flex-1 h-px bg-gold/25" />
        </div>

        {mustChange ? (
          <ChangePasswordForm
            username={mustChange.nombre || username}
            onSuccess={handlePasswordChanged}
          />
        ) : forgot ? (
          <ForgotPasswordForm onBack={() => { setForgot(false); setError('') }} />
        ) : (
          <div className={`animate-fade-up delay-4 w-full flex flex-col gap-3 ${shake ? 'animate-shake' : ''}`}>
            {info && (
              <div className="text-success font-montserrat text-[13px] text-center text-pretty">
                {info}
              </div>
            )}

            <UsernameInput value={username} onChange={e => setUsername(e.target.value)} />
            <PasswordInput
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <Button onClick={handleLogin} fullWidth loading={loading}>
              {loading
                ? (slow ? 'El servidor va lento, seguimos...' : 'Cargando...')
                : 'Iniciar sesión'}
            </Button>
            {/* Region viva: un boton deshabilitado no re-anuncia su texto al lector de pantalla. */}
            {slow && <span className="sr-only" role="status" aria-live="polite">El servidor va lento, seguimos intentando</span>}

            <button
              type="button"
              onClick={() => { setForgot(true); setError('') }}
              className="font-montserrat text-xs text-white/45 hover:text-gold/90 transition-colors text-center bg-transparent border-0 cursor-pointer mt-1"
            >
              ¿No recuerdas tu contraseña?
            </button>

            {error && (
              <div className={`text-error mt-3 font-montserrat text-[13px] text-center text-pretty ${shake ? 'animate-shake' : ''}`}>
                {error}
              </div>
            )}
          </div>
        )}

        <p className="animate-fade-up delay-6 font-montserrat text-xs text-white/20 mt-5 text-center font-normal text-pretty">
          Acceso exclusivo profesores
        </p>
      </div>
    </div>
  )
}

/**
 * Mensaje informativo inicial segun el state de navegacion.
 * (sesion expirada al ser redirigido por el listener auth:expired).
 * @param {object|null} state
 * @returns {string}
 */
function initialInfo(state) {
  if (state?.expired) return 'Tu sesión expiró, vuelve a entrar'
  return ''
}

/**
 * Traduce un error de login a mensaje de usuario, distinguiendo causas.
 * @param {Error} err
 * @returns {string}
 */
function loginErrorMessage(err) {
  if (err instanceof AuthError) {
    if (err.reason === 'lockout') {
      return 'Demasiados intentos. Espera unos minutos antes de reintentar.'
    }
    return 'Usuario o contraseña incorrectos'
  }
  if (err instanceof PermissionError) {
    return 'Acceso no permitido para este usuario'
  }
  // Error de red / timeout: mismo mensaje honesto que routeBySession.
  return SERVER_SLOW_MESSAGE
}

/**
 * Campo de usuario con icono de persona.
 * @param {object} props
 * @param {string} props.value
 * @param {function} props.onChange
 * @returns {JSX.Element}
 */
function UsernameInput({ value, onChange }) {
  return (
    <div className="relative w-full">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/90">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/><path d="M6 20c0-2.21 3.58-4 6-4s6 1.79 6 4"/></svg>
      </div>
      <input
        type="text"
        placeholder="Usuario"
        value={value}
        onChange={onChange}
        className="w-full bg-white/[0.06] border border-gold/15 rounded-[14px] py-[15px] pr-4 pl-12 text-white font-montserrat text-sm outline-none box-border placeholder:text-white/30 focus:border-gold/30 transition-colors"
      />
    </div>
  )
}
