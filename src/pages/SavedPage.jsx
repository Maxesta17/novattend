import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import StatCard from '../components/ui/StatCard.jsx'
import Button from '../components/ui/Button.jsx'
import { formatLocalDate, formatLongDate, labelFromIso } from '../utils/dateUtils'

/**
 * Pagina de confirmacion post-guardado de asistencia.
 * Muestra resumen de presentes/ausentes y boton de retorno.
 * Variante queued (state.queued=true): el guardado quedo en la cola offline
 * y se muestra como "pendiente de sincronizar" (estilo warning, no exito).
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

  const { present, total, group, convocatoria, savedDate } = state
  const queued = Boolean(state.queued)
  const absent = total - present
  // Proteger la division: con total 0 mostrariamos "NaN%"
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0
  const todayIso = formatLocalDate(new Date())
  const isPastDay = Boolean(savedDate) && savedDate !== todayIso
  const dateText = savedDate ? labelFromIso(savedDate) : formatLongDate(new Date())

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

      {/* Titulo (variante warning si quedo en cola offline) */}
      <h1 className="animate-fade-up delay-5 font-cinzel text-[22px] font-bold text-text-dark m-0 mb-2 text-balance text-center">
        {queued ? 'Guardado pendiente de sincronizar' : 'Asistencia guardada'}
      </h1>

      {/* Subtitulo */}
      <p className="animate-fade-up delay-6 font-montserrat text-[13px] text-text-muted m-0 mb-7 text-pretty text-center capitalize">
        {group} · {dateText}
        {isPastDay && (
          <span className="block mt-1 not-italic font-bold text-warning normal-case">
            (dia pasado)
          </span>
        )}
        {convocatoria && <span className="block mt-0.5 text-[11px] normal-case">{convocatoria.nombre}</span>}
      </p>

      {/* Aviso de cola offline: sin red, el guardado quedo pendiente */}
      {queued && (
        <div className="animate-fade-up delay-6 w-full max-w-[340px] flex items-start gap-2 bg-warning-soft border border-warning/30 rounded-xl px-4 py-3 mb-6">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-warning shrink-0 mt-0.5" aria-hidden="true">
            <path d="M12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" />
          </svg>
          <p className="font-montserrat text-[12px] font-semibold text-warning m-0 text-pretty">
            Se enviará automáticamente al recuperar la conexión.
          </p>
        </div>
      )}

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
