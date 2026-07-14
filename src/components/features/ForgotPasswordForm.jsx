import { useState } from 'react'
import { solicitarReset } from '../../services/api'
import Button from '../ui/Button.jsx'

/**
 * Formulario "olvide mi contrasena". Pide el usuario Y el email registrado
 * (segundo factor) y solicita al backend un reset por email. El email debe
 * coincidir con el de la hoja: eleva el coste de forzar el reset de una cuenta
 * ajena. El backend responde SIEMPRE de forma generica (anti-enumeracion), asi
 * que tras enviar mostramos un mensaje neutro sin confirmar si los datos existen.
 *
 * @param {object} props
 * @param {function} props.onBack - volver a la pantalla de login
 * @returns {JSX.Element}
 */
export default function ForgotPasswordForm({ onBack }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    setError('')
    const user = username.trim()
    const mail = email.trim()
    if (!user || !mail) {
      setError('Escribe tu usuario y tu email')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError('Escribe un email válido')
      return
    }
    setLoading(true)
    try {
      await solicitarReset(user, mail)
      setSent(true)
    } catch {
      setError('No se pudo enviar. Comprueba tu conexión e inténtalo de nuevo.')
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="animate-fade-up w-full flex flex-col gap-4 text-center">
        <p className="font-montserrat text-[13px] text-white/75 text-pretty">
          Si los datos son correctos, te hemos enviado un correo con una contraseña temporal.
          Revisa tu bandeja de entrada (y la carpeta de spam).
        </p>
        <Button onClick={onBack} fullWidth>
          Volver a iniciar sesión
        </Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-up w-full flex flex-col gap-3">
      <p className="font-montserrat text-[13px] text-white/65 text-center text-pretty mb-1">
        Escribe tu usuario y tu email. Si coinciden, te enviaremos una contraseña temporal a tu correo.
      </p>

      <input
        type="text"
        placeholder="Usuario"
        value={username}
        onChange={e => setUsername(e.target.value)}
        className="w-full bg-white/[0.06] border border-gold/15 rounded-[14px] py-[15px] px-4 text-white font-montserrat text-sm outline-none box-border placeholder:text-white/30 focus:border-gold/30 transition-colors"
      />
      <input
        type="email"
        placeholder="Tu email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full bg-white/[0.06] border border-gold/15 rounded-[14px] py-[15px] px-4 text-white font-montserrat text-sm outline-none box-border placeholder:text-white/30 focus:border-gold/30 transition-colors"
      />

      <Button onClick={handleSubmit} fullWidth loading={loading}>
        {loading ? 'Enviando...' : 'Enviar contraseña temporal'}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="font-montserrat text-[13px] text-white/50 hover:text-white/80 transition-colors text-center bg-transparent border-0 cursor-pointer"
      >
        Volver a iniciar sesión
      </button>

      {error && (
        <div className="text-error mt-1 font-montserrat text-[13px] text-center text-pretty">
          {error}
        </div>
      )}
    </div>
  )
}
