import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { JUSTIFICATION_REASONS, OTHER_REASON } from '../../config/justificationReasons'

const formatDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

// Determina el estado inicial del selector a partir del motivo guardado.
const initialSelection = (currentReason) => {
  if (!currentReason) return { reason: '', freeText: '' }
  // Si el motivo guardado coincide con uno predefinido, lo seleccionamos;
  // si no, asumimos que fue texto libre ("Otro").
  if (JUSTIFICATION_REASONS.includes(currentReason) && currentReason !== OTHER_REASON) {
    return { reason: currentReason, freeText: '' }
  }
  return { reason: OTHER_REASON, freeText: currentReason }
}

/**
 * Modal para justificar (o quitar la justificacion de) una falta concreta.
 * Permite elegir un motivo de la lista predefinida o escribir uno libre ("Otro").
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Controla visibilidad
 * @param {function} props.onClose - Handler al cerrar sin confirmar
 * @param {{alumno_id: string, fecha: string}} props.absence - Falta a justificar
 * @param {string} [props.currentReason] - Motivo actual (si ya estaba justificada)
 * @param {boolean} [props.isJustified] - Si la falta ya esta justificada
 * @param {boolean} [props.loading] - Deshabilita los botones mientras el padre resuelve
 * @param {function} props.onConfirm - Callback con el motivo final (string)
 * @param {function} props.onUnjustify - Callback para quitar la justificacion
 */
export default function JustifyAbsenceModal({
  isOpen,
  onClose,
  absence,
  currentReason = '',
  isJustified = false,
  loading = false,
  onConfirm,
  onUnjustify,
}) {
  const init = initialSelection(currentReason)
  const [selectedReason, setSelectedReason] = useState(init.reason)
  const [freeText, setFreeText] = useState(init.freeText)

  // Patron "ajustar estado durante render": al cambiar de falta (otra fecha)
  // reseteamos la seleccion al motivo guardado de la nueva falta, sin useEffect.
  const [trackedFecha, setTrackedFecha] = useState(absence?.fecha)
  if (absence?.fecha !== trackedFecha) {
    setTrackedFecha(absence?.fecha)
    setSelectedReason(init.reason)
    setFreeText(init.freeText)
  }

  if (!absence) return null

  const isOther = selectedReason === OTHER_REASON
  const finalReason = isOther ? freeText.trim() : selectedReason
  const canConfirm = !loading && finalReason.length > 0

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm(finalReason)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Justificar falta de asistencia">
      <h3 className="font-cinzel text-base font-bold text-text-dark m-0 mb-1 text-center">
        Justificar falta
      </h3>
      <p className="font-montserrat text-xs text-text-muted m-0 mb-4 text-center tabular-nums">
        {formatDate(absence.fecha)}
      </p>

      <fieldset className="border-0 p-0 m-0 mb-4">
        <legend className="font-montserrat text-[11px] font-semibold text-text-dark mb-2">
          Motivo
        </legend>
        <div className="flex flex-col gap-1.5">
          {JUSTIFICATION_REASONS.map((reason) => {
            const active = selectedReason === reason
            return (
              <button
                key={reason}
                type="button"
                onClick={() => setSelectedReason(reason)}
                aria-pressed={active}
                className={[
                  'font-montserrat text-xs font-medium text-left px-3 py-2.5 rounded-[10px]',
                  'border transition-all duration-200',
                  active
                    ? 'bg-burgundy text-white border-burgundy'
                    : 'bg-white text-text-dark border-border-light hover:bg-cream',
                ].join(' ')}
              >
                {reason}
              </button>
            )
          })}
        </div>

        {isOther && (
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Describe el motivo..."
            rows={3}
            aria-label="Motivo de texto libre"
            className="mt-2 w-full font-montserrat text-xs text-text-dark px-3 py-2 rounded-[10px] border border-border-light bg-white resize-none focus:outline-none focus:border-burgundy"
          />
        )}
      </fieldset>

      <Button
        variant={canConfirm ? 'primary' : 'disabled'}
        fullWidth
        loading={loading}
        onClick={handleConfirm}
      >
        {isJustified ? 'Actualizar justificacion' : 'Justificar'}
      </Button>

      {isJustified && (
        <button
          type="button"
          onClick={onUnjustify}
          disabled={loading}
          className="mt-2.5 w-full font-montserrat text-xs font-semibold text-error py-2 rounded-[10px] hover:bg-error-soft transition-all duration-200 disabled:opacity-50"
        >
          Quitar justificacion
        </button>
      )}
    </Modal>
  )
}
