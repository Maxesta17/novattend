import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { USERS } from '../config/users'
import { isApiEnabled } from '../config/api'
import { getConvocatorias } from '../services/api'
import Button from '../components/ui/Button.jsx'

/**
 * Pagina de autenticacion. Valida credenciales y redirige segun rol.
 * @returns {JSX.Element}
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    const found = USERS.find(u =>
      u.username.toLowerCase() === (username || '').trim().toLowerCase() && u.password === password
    )
    if (!found) {
      setError('Usuario o contraseña incorrectos')
      setShake(true)
      setTimeout(() => setShake(false), 700)
      return
    }
    try { sessionStorage.setItem('user', JSON.stringify(found)) } catch { /* ignorar error de storage */ }

    if (found.role === 'ceo') {
      navigate('/dashboard')
      return
    }

    if (!isApiEnabled()) {
      navigate('/attendance')
      return
    }

    // Mostrar loading inmediatamente
    setLoading(true)

    // Timeout de seguridad para que el usuario no espere demasiado
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))

    try {
      const convocatorias = await Promise.race([getConvocatorias(), timeout])
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
      setError('Error al conectar con el servidor. Reintenta.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-burgundy-dark relative overflow-hidden flex flex-col items-center justify-center px-5 py-6 box-border">
      {/* Contenedor principal */}
      <div className="relative flex flex-col items-center w-full max-w-[360px]">
        {/* Logo */}
        <img
          className="animate-fade-up delay-0 w-20 h-20 mb-7 object-cover shadow-xl rounded-xl"
          src="/logova1.png"
          alt="NovAttend"
        />

        {/* Titulo */}
        <h1 className="animate-fade-up delay-1 font-cinzel text-[28px] font-bold text-gold m-0 mb-1.5 text-balance text-center">
          NovAttend
        </h1>

        {/* Subtitulo */}
        <p className="animate-fade-up delay-2 font-montserrat text-[13px] text-white/55 m-0 mb-[22px] font-normal text-pretty">
          Control de Asistencia
        </p>

        {/* Separador con texto */}
        <div className="animate-fade-up delay-3 flex items-center gap-2 mb-8 w-full justify-center">
          <div className="flex-1 h-px bg-gold/25" />
          <span className="font-montserrat text-[9px] text-gold/90 uppercase font-medium whitespace-nowrap">
            LINGNOVA ACADEMY
          </span>
          <div className="flex-1 h-px bg-gold/25" />
        </div>

        {/* Formulario */}
        <div className={`animate-fade-up delay-4 w-full flex flex-col gap-3 ${shake ? 'animate-shake' : ''}`}>
          <LoginInput
            icon={<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/><path d="M6 20c0-2.21 3.58-4 6-4s6 1.79 6 4"/></svg>}
            placeholder="Usuario"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <LoginInput
            icon={<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V8a5 5 0 0 1 10 0v3"/></svg>}
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <Button onClick={handleLogin} fullWidth loading={loading}>
            {loading ? 'Cargando...' : 'Iniciar sesión'}
          </Button>

          {error && (
            <div className={`text-error mt-3 font-montserrat text-[13px] text-center text-pretty ${shake ? 'animate-shake' : ''}`}>
              {error}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <p className="animate-fade-up delay-6 font-montserrat text-xs text-white/20 mt-5 text-center font-normal text-pretty">
          Acceso exclusivo profesores
        </p>
      </div>
    </div>
  )
}

function LoginInput({ icon, placeholder, type = 'text', value, onChange }) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="relative w-full">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/90">
        {icon}
      </div>
      <input
        type={isPassword && showPassword ? 'text' : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full bg-white/[0.06] border border-gold/15 rounded-[14px] py-[15px] ${isPassword ? 'pr-11' : 'pr-4'} pl-12 text-white font-montserrat text-sm outline-none box-border placeholder:text-white/30 focus:border-gold/30 transition-colors`}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer p-0"
          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {showPassword ? (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          ) : (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          )}
        </button>
      )}
    </div>
  )
}
