import { formatDate } from './studentDetailHelpers'

// Normaliza una falta a objeto { fecha, justificada, motivo }.
// Acepta tanto strings (modo mock) como objetos (modo API).
const normalize = (absence) =>
  typeof absence === 'string'
    ? { fecha: absence, justificada: false, motivo: '' }
    : { fecha: absence.fecha, justificada: absence.justificada === true, motivo: absence.motivo || '' }

/**
 * Bloque de "Dias faltados" del detalle de alumno.
 * Distingue visualmente faltas justificadas (gold/warning) de no justificadas (rojo)
 * y, si se provee `onJustifyClick`, muestra un boton para justificar cada falta.
 * Si la carga fallo (`error`), lo muestra con opcion de reintentar: un fallo
 * de red no debe confundirse con "el alumno no tiene faltas".
 *
 * @param {object} props
 * @param {boolean} props.loading - Si se estan cargando las faltas desde la API
 * @param {string|null} [props.error] - Mensaje si la carga de faltas fallo (null = sin error)
 * @param {Array<string|{fecha: string, justificada?: boolean, motivo?: string}>} props.absences - Faltas
 * @param {function} [props.onJustifyClick] - Handler con la falta normalizada al pulsar "Justificar"
 * @param {function} [props.onRetry] - Handler del boton "Reintentar" cuando hay error
 */
export default function AbsencesBlock({ loading, error = null, absences, onJustifyClick, onRetry }) {
  if (loading) {
    return (
      <p className="mt-2 font-montserrat text-xs text-text-muted text-center">
        Cargando faltas...
      </p>
    )
  }
  if (error) {
    return (
      <div className="mt-2 mb-2 flex flex-col items-center gap-1.5" role="alert">
        <p className="font-montserrat text-xs font-medium text-error text-center text-pretty m-0">
          {error}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="font-montserrat text-xs font-semibold text-burgundy underline"
          >
            Reintentar
          </button>
        )}
      </div>
    )
  }
  if (!absences.length) return null

  return (
    <div className="mb-2">
      <h4 className="font-cinzel text-xs font-semibold text-text-dark mb-2">
        Dias faltados ({absences.length})
      </h4>
      <div className="flex flex-col gap-1.5">
        {absences.map((raw) => {
          const a = normalize(raw)
          return (
            <AbsenceRow
              key={a.fecha}
              absence={a}
              onJustifyClick={onJustifyClick}
            />
          )
        })}
      </div>
    </div>
  )
}

function AbsenceRow({ absence, onJustifyClick }) {
  const tone = absence.justificada
    ? 'bg-warning-soft text-warning'
    : 'bg-error-soft text-error'

  return (
    <div className="flex items-center gap-2">
      <span
        title={absence.justificada ? `Justificada: ${absence.motivo}` : 'Sin justificar'}
        className={`font-montserrat text-[10px] px-2 py-1 rounded-md font-medium tabular-nums ${tone}`}
      >
        {formatDate(absence.fecha)}
      </span>

      {absence.justificada && absence.motivo && (
        <span className="font-montserrat text-[10px] text-text-muted truncate flex-1">
          {absence.motivo}
        </span>
      )}

      {onJustifyClick && (
        <button
          type="button"
          onClick={() => onJustifyClick(absence)}
          className={[
            'ml-auto font-montserrat text-[10px] font-semibold px-2 py-1 rounded-md',
            'transition-all duration-200',
            absence.justificada
              ? 'text-warning hover:bg-warning-soft'
              : 'text-burgundy hover:bg-burgundy-soft',
          ].join(' ')}
        >
          {absence.justificada ? 'Justificada' : 'Justificar'}
        </button>
      )}
    </div>
  )
}
