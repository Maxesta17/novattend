import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { USERS } from '../config/users'
import { isApiEnabled } from '../config/api'
import { getConvocatorias } from '../services/api'
import Button from '../components/ui/Button.jsx'

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
    <div className="min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-[linear-gradient(170deg,#1A1A1A_0%,#2A1A1A_40%,#5C0000_100%)] relative overflow-hidden flex flex-col items-center justify-center px-5 py-6 box-border">
      {/* Patron decorativo diagonal */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(197,160,89,0.02)_2px,rgba(197,160,89,0.02)_4px)] pointer-events-none" />

      {/* Resplandor granate arriba centro */}
      <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(128,0,0,0.3)_0%,transparent_70%)] blur-[60px] pointer-events-none" />

      {/* Resplandor dorado abajo derecha */}
      <div className="absolute -bottom-[5%] -right-[10%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(197,160,89,0.15)_0%,transparent_70%)] blur-[40px] pointer-events-none" />

      {/* Contenedor principal */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-[360px]">
        {/* Logo */}
        <img
          className="animate-float animate-fade-up delay-0 w-20 h-20 mb-7 object-cover shadow-[0_0_30px_rgba(128,0,0,0.4),0_0_60px_rgba(128,0,0,0.2)]"
          src="/logova1.png"
          alt="NovAttend"
        />

        {/* Titulo */}
        <h1 className="animate-fade-up delay-1 font-cinzel text-[28px] font-bold text-gold m-0 mb-1.5 -tracking-[0.5px] text-center">
          NovAttend
        </h1>

        {/* Subtitulo */}
        <p className="animate-fade-up delay-2 font-montserrat text-[13px] text-white/55 m-0 mb-[22px] font-normal">
          Control de Asistencia
        </p>

        {/* Separador con texto */}
        <div className="animate-fade-up delay-3 flex items-center gap-2 mb-8 w-full justify-center">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/25" />
          <span className="font-montserrat text-[9px] text-gold/90 tracking-[3px] font-medium whitespace-nowrap">
            LINGNOVA ACADEMY
          </span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/25" />
        </div>

        {/* Formulario */}
        <div className={`animate-fade-up delay-4 w-full flex flex-col gap-3 ${shake ? 'animate-shake' : ''}`}>
          <LoginInput
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/><path d="M6 20c0-2.21 3.58-4 6-4s6 1.79 6 4"/></svg>}
            placeholder="Usuario"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <LoginInput
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V8a5 5 0 0 1 10 0v3"/></svg>}
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <Button onClick={handleLogin} fullWidth loading={loading}>
            {loading ? 'Cargando...' : 'Iniciar sesión'}
          </Button>

          {error && (
            <div className={`text-[#FF4D4F] mt-3 font-montserrat text-[13px] text-center ${shake ? 'animate-shake' : ''}`}>
              {error}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <p className="animate-fade-up delay-6 font-montserrat text-xs text-white/20 mt-5 text-center font-normal">
          Acceso exclusivo profesores
        </p>
      </div>
    </div>
  )
}

function LoginInput({ icon, placeholder, type = 'text', value, onChange }) {
  return (
    <div className="relative w-full">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/90">
        {icon}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-white/[0.06] border border-gold/15 rounded-[14px] py-[15px] pr-4 pl-12 text-white font-montserrat text-sm outline-none box-border placeholder:text-white/30 focus:border-gold/30 transition-colors"
      />
    </div>
  )
}
