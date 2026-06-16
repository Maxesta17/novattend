import Avatar from '../ui/Avatar.jsx'
import { formatDate, formatShort, weekTone } from './studentDetailHelpers'

/**
 * Cabecera del popup: avatar, nombre, profesor y grupo.
 * @param {object} props
 * @param {string} props.initials - Iniciales del alumno
 * @param {object} props.student - Datos del alumno
 */
export function Header({ initials, student }) {
  return (
    <div className="flex flex-col items-center mb-4">
      <Avatar
        initials={initials}
        variant="colored"
        color="bg-burgundy"
        size="lg"
        className="mb-3 text-gold shadow-md"
      />
      <h3 className="font-cinzel text-lg font-bold text-text-dark m-0 mb-1 text-balance text-center">
        {student.name}
      </h3>
      <p className="font-montserrat text-xs text-text-muted m-0 text-pretty text-center">
        {student.teacher && <>{student.teacher} · </>}Grupo {student.group}
      </p>
    </div>
  )
}

function SummaryRow({ label, faltas, clases, isTotal }) {
  const tone = weekTone(faltas)
  const showTone = !isTotal && clases > 0
  const meta = clases === 0
    ? 'Sin clases'
    : `${faltas} ${faltas === 1 ? 'falta' : 'faltas'} / ${clases} ${clases === 1 ? 'clase' : 'clases'}`
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-light last:border-b-0">
      <span className="font-montserrat text-xs font-medium text-text-dark">{label}</span>
      <span className={`font-montserrat text-xs tabular-nums ${showTone ? tone.color + ' font-semibold' : 'text-text-body'}`}>
        {meta}
      </span>
    </div>
  )
}

/**
 * Resumen de faltas/clases por ventana (semana, mes, convocatoria).
 * @param {object} props
 */
export function SummaryRows({ faltasSemana, clasesSemana, faltasMes, clasesMes, faltasTotal, clasesTotal }) {
  return (
    <div className="bg-cream rounded-[10px] px-3 py-1 mb-4">
      <SummaryRow label="Esta semana" faltas={faltasSemana} clases={clasesSemana} />
      <SummaryRow label="Este mes" faltas={faltasMes} clases={clasesMes} />
      <SummaryRow label="Convocatoria" faltas={faltasTotal} clases={clasesTotal} isTotal />
    </div>
  )
}

// Estilo de cada celda segun estado: presente (verde), falta justificada
// (gold/warning, no penaliza) o falta sin justificar (rojo).
function last8Tone(record) {
  if (record.presente) return { cell: 'bg-success-soft text-success', label: 'Presente' }
  if (record.justificada) return { cell: 'bg-warning-soft text-warning', label: 'Falta justificada' }
  return { cell: 'bg-error-soft text-error', label: 'Falta' }
}

/**
 * Mini-historial visual de las ultimas clases (presente/falta por fecha).
 * Las faltas justificadas se distinguen en gold y no penalizan el porcentaje.
 * @param {object} props
 * @param {Array<{fecha: string, presente: boolean, justificada?: boolean}>} props.records
 */
export function Last8Block({ records }) {
  return (
    <div className="mb-4">
      <h4 className="font-cinzel text-xs font-semibold text-text-dark mb-2">
        Ultimas clases
      </h4>
      <div className="flex items-center gap-1.5 flex-wrap">
        {records.map(r => {
          const tone = last8Tone(r)
          return (
            <div
              key={r.fecha}
              title={`${formatDate(r.fecha)} · ${tone.label}`}
              className={[
                'w-7 h-7 rounded-md flex items-center justify-center',
                'font-cinzel text-[9px] font-semibold tabular-nums',
                tone.cell,
              ].join(' ')}
            >
              {formatShort(r.fecha)}
            </div>
          )
        })}
      </div>
      <p className="font-montserrat text-[10px] text-text-muted mt-1.5">
        Mas antiguo a la izquierda, mas reciente a la derecha
      </p>
    </div>
  )
}

/**
 * Historico de faltas/clases semana a semana.
 * Si la semana tuvo faltas justificadas, se indican aparte en gold.
 * @param {object} props
 * @param {Array<{semana_inicio: string, faltas: number, clases: number, justificadas?: number}>} props.weeks
 */
export function WeeklyHistoryBlock({ weeks }) {
  return (
    <div className="mb-4">
      <h4 className="font-cinzel text-xs font-semibold text-text-dark mb-2">
        Historico semanal
      </h4>
      <ul className="bg-cream rounded-[10px] px-3 py-1">
        {weeks.map(w => {
          const tone = weekTone(w.faltas)
          const justificadas = w.justificadas ?? 0
          return (
            <li key={w.semana_inicio} className="flex items-center justify-between py-1.5 border-b border-border-light last:border-b-0">
              <span className="font-montserrat text-[11px] text-text-body">
                Sem. {formatShort(w.semana_inicio)}
              </span>
              <span className="font-montserrat text-[11px] font-semibold flex items-center gap-1.5">
                <span className={tone.color}>
                  {w.faltas} {w.faltas === 1 ? 'falta' : 'faltas'} / {w.clases}
                </span>
                {justificadas > 0 && (
                  <span className="text-warning">
                    +{justificadas} just.
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
