import Modal from '../ui/Modal.jsx'

/**
 * Popup con lista de alumnos en alerta (asistencia baja).
 * @param {object} props
 * @param {Array} props.students - Lista de alumnos con datos de asistencia
 * @param {function} props.onStudentClick - Handler al pulsar un alumno
 * @param {function} props.onClose - Handler al cerrar
 */
export default function AlertList({ students, onStudentClick, onClose }) {
  return (
    <Modal isOpen onClose={onClose} className="max-h-[70vh] overflow-auto">
      <h2 className="font-cinzel text-lg font-bold text-text-dark m-0 mb-1">
        Alumnos en Alerta
      </h2>
      <p className="font-montserrat text-xs text-text-muted m-0 mb-4">
        Asistencia semanal ≤80%
      </p>

      {students.map(student => (
        <div
          key={student.id}
          onClick={() => onStudentClick(student)}
          className={[
            'bg-white border border-border rounded-[10px] p-3 mb-2 cursor-pointer',
            'transition-all duration-200',
            'hover:bg-error-soft',
          ].join(' ')}
        >
          <div className="font-montserrat text-[13px] font-medium text-text-dark mb-0.5">
            {student.name}
          </div>
          <div className="font-montserrat text-[11px] text-text-muted mb-1.5">
            {student.teacher} · Grupo {student.group}
          </div>
          <span className="inline-block bg-error text-white px-2 py-0.5 rounded font-cinzel text-[10px] font-semibold">
            {student.weekly}% semanal
          </span>
        </div>
      ))}
    </Modal>
  )
}
