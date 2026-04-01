import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import StatCard from '../components/ui/StatCard.jsx'
import Button from '../components/ui/Button.jsx'

/**
 * Pagina de confirmacion post-guardado de asistencia.
 * Muestra resumen de presentes/ausentes y boton de retorno.
 * @returns {JSX.Element}
 */
export default function SavedPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state

  useEffect(() => {
    if (!state || state.present === undefined || state.total === undefined) {
      navigate('/attendance')
    }
  }, [state, navigate])

  if (!state) return null

  const { present, total, group, convocatoria } = state
  const absent = total - present
  const percentage = Math.round((present / total) * 100)
  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-off-white flex flex-col items-center justify-center p-5 box-border relative">
      {/* Logo animado */}
      <div className="relative mb-8">
        <img
          className="animate-pop-in size-[86px] rounded-full object-cover shadow-xl"
          src="/logova1.png"
          alt="NovAttend"
        />
      </div>

      {/* Titulo */}
      <h1 className="animate-fade-up delay-5 font-cinzel text-[22px] font-bold text-text-dark m-0 mb-2 text-balance text-center">
        Asistencia guardada
      </h1>

      {/* Subtitulo */}
      <p className="animate-fade-up delay-6 font-montserrat text-[13px] text-text-muted m-0 mb-7 text-pretty text-center">
        {group} · {today}
        {convocatoria && <span className="block mt-0.5 text-[11px]">{convocatoria.nombre}</span>}
      </p>

      {/* Card resumen */}
      <div className="animate-fade-up delay-7 w-full max-w-[340px] bg-white border-[1.5px] border-border rounded-2xl p-5 shadow-md grid grid-cols-3 gap-3 mb-8">
        <StatCard icon="✓" value={present} label="Presentes" color="success" className="text-[26px] [&>div:first-child]:text-[26px]" />
        <StatCard icon="✗" value={absent} label="Ausentes" color="error" className="text-[26px] [&>div:first-child]:text-[26px]" />
        <StatCard icon="◉" value={`${percentage}%`} label="Asistencia" color="burgundy" className="text-[26px] [&>div:first-child]:text-[26px]" />
      </div>

      {/* Boton volver */}
      <Button
        onClick={() => convocatoria
          ? navigate('/attendance', { state: { convocatoria } })
          : navigate('/attendance')
        }
        className="px-8"
      >
        Volver al inicio
      </Button>
    </div>
  )
}
