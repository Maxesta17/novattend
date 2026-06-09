import DateSelector from './DateSelector.jsx'

/**
 * Control de cabecera para elegir el dia de asistencia a registrar.
 *
 * Por defecto invita a "registrar otro dia"; al desplegarse muestra el
 * DateSelector (ultimos 7 dias). Cuando el dia activo no es hoy, muestra
 * un aviso visible para evitar registrar en el dia equivocado.
 *
 * @param {object} props
 * @param {string} props.selectedDate - Fecha activa en formato yyyy-MM-dd
 * @param {string} props.selectedLabel - Etiqueta legible de la fecha activa
 * @param {boolean} props.isPastDay - Si la fecha activa no es hoy
 * @param {boolean} props.isOpen - Si el selector esta desplegado
 * @param {() => void} props.onToggle - Abrir/cerrar el selector
 * @param {(iso: string) => void} props.onSelectDate - Elegir un dia
 * @param {() => void} props.onClose - Cerrar el selector
 * @returns {JSX.Element}
 */
export default function DateHeaderControl({
  selectedDate,
  selectedLabel,
  isPastDay,
  isOpen,
  onToggle,
  onSelectDate,
  onClose,
}) {
  return (
    <div className="mt-2">
      {isPastDay && (
        <span className="inline-block font-montserrat text-[10px] font-bold text-warning bg-warning-soft rounded px-2 py-0.5 mb-1.5 uppercase tracking-wide">
          Registrando dia pasado
        </span>
      )}
      <button
        onClick={onToggle}
        className="block font-montserrat text-[11px] text-white/55 underline underline-offset-2 bg-transparent border-none cursor-pointer hover:text-white/80 transition-colors duration-150"
      >
        {isOpen
          ? 'Cerrar selector'
          : isPastDay
            ? `Cambiando: ${selectedLabel}`
            : 'Registrar otro dia'}
      </button>
      <DateSelector
        isOpen={isOpen}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        onClose={onClose}
      />
    </div>
  )
}
