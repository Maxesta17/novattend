/**
 * Aviso discreto tras restaurar marcas de asistencia sin guardar.
 *
 * Fix M5 (auditoria): si un 401 expulsa al profesor a mitad de lista, las
 * marcas se restauran desde sessionStorage al volver a montar AttendancePage
 * (ver hooks/useStudents + utils/pendingMarksStorage). Este banner informa
 * de esa restauracion y se puede cerrar manualmente.
 *
 * @param {object} props
 * @param {boolean} props.show - Si se muestra el aviso.
 * @param {function} props.onDismiss - Callback al cerrar.
 * @returns {JSX.Element|null}
 */
export default function RestoredMarksBanner({ show, onDismiss }) {
  if (!show) return null

  return (
    <div
      role="status"
      className="mx-4 mb-3 flex items-center justify-between gap-2 bg-success-soft border border-success/30 rounded-lg px-3 py-2"
    >
      <p className="font-montserrat text-[11px] font-semibold text-success m-0">
        Se restauraron tus marcas sin guardar
      </p>
      <button
        onClick={onDismiss}
        className="shrink-0 text-success/70 hover:text-success font-bold text-sm leading-none p-1"
        aria-label="Cerrar aviso"
      >
        ×
      </button>
    </div>
  )
}
