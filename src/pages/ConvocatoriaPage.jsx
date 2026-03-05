import { useNavigate, useLocation } from 'react-router-dom'
import Badge from '../components/ui/Badge.jsx'

/**
 * Selector de convocatoria activa.
 * Se muestra tras login cuando hay 2+ convocatorias activas.
 * @param {object} props
 * @param {Array} location.state.convocatorias - Lista de convocatorias activas
 */
export default function ConvocatoriaPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const convocatorias = location.state?.convocatorias || []

  const handleSelect = (conv) => {
    navigate('/attendance', { state: { convocatoria: conv } })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-')
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-off-white flex flex-col box-border">
      {/* Header */}
      <div className="bg-gradient-to-br from-burgundy to-burgundy-light px-5 pt-10 pb-6 rounded-b-[20px]">
        <Badge>LINGNOVA</Badge>
        <h1 className="font-cinzel text-[22px] font-bold text-white mt-3 mb-1">
          Convocatorias
        </h1>
        <p className="font-montserrat text-[13px] text-white/60">
          Selecciona la convocatoria para pasar lista
        </p>
      </div>

      {/* Lista de convocatorias */}
      <div className="flex-1 px-4 pt-5 pb-6">
        {convocatorias.length === 0 && (
          <div className="text-center py-10">
            <p className="font-montserrat text-sm text-text-muted">
              No hay convocatorias activas en este momento.
            </p>
          </div>
        )}

        {convocatorias.map((conv, idx) => (
          <button
            key={conv.id}
            onClick={() => handleSelect(conv)}
            className="animate-fade-up w-full bg-white border border-border rounded-2xl p-4 mb-3 cursor-pointer transition-all duration-200 hover:border-gold/40 hover:shadow-[0_4px_16px_rgba(128,0,0,0.08)] text-left"
            style={{ animationDelay: `${idx * 0.06}s` }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-cinzel text-[15px] font-semibold text-text-dark">
                {conv.nombre}
              </h3>
              <Badge variant="status" color="bg-success/10" textColor="text-success">
                Activa
              </Badge>
            </div>
            <p className="font-montserrat text-[12px] text-text-muted">
              {formatDate(conv.fecha_inicio)} — {formatDate(conv.fecha_fin)}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
