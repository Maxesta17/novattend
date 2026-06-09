import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

/**
 * Modal de confirmacion antes de guardar asistencia de un dia que no es hoy.
 * Avisa de que se sobrescribira cualquier registro previo de ese dia.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Si el modal esta visible
 * @param {string} props.dateLabel - Etiqueta legible del dia a registrar
 * @param {string} props.group - Grupo afectado (ej. "G1")
 * @param {() => void} props.onCancel - Cerrar sin guardar
 * @param {() => void} props.onConfirm - Confirmar y guardar
 * @returns {JSX.Element}
 */
export default function ConfirmPastDayModal({ isOpen, dateLabel, group, onCancel, onConfirm }) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} ariaLabel="Confirmar registro de dia pasado">
      <h3 className="font-cinzel text-lg font-semibold text-text-dark m-0 mb-2 capitalize">
        Registrar {dateLabel}
      </h3>
      <p className="font-montserrat text-[13px] text-text-body m-0 mb-5">
        Vas a guardar la asistencia de <strong>{group}</strong> para un dia
        que no es hoy. Esto sobrescribira cualquier registro previo de ese dia.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 font-montserrat text-sm font-semibold text-text-body bg-cream border border-border rounded-xl py-3 cursor-pointer hover:bg-border-light transition-colors duration-150"
        >
          Cancelar
        </button>
        <Button variant="primary" fullWidth onClick={onConfirm}>
          Confirmar
        </Button>
      </div>
    </Modal>
  )
}
