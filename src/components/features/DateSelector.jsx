import { getLast7Days } from '../../utils/dateUtils'

/**
 * Panel desplegable para elegir uno de los ultimos 7 dias (hoy incluido).
 *
 * No usa libreria externa de date-picker: renderiza 7 botones, lo que
 * garantiza por construccion que no se puedan elegir fechas futuras ni
 * mas alla de 7 dias atras.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Si el panel esta visible
 * @param {string} props.selectedDate - Fecha activa en formato yyyy-MM-dd
 * @param {(iso: string) => void} props.onSelectDate - Callback al elegir un dia
 * @param {() => void} props.onClose - Callback para cerrar el panel tras elegir
 * @returns {JSX.Element|null}
 */
export default function DateSelector({ isOpen, selectedDate, onSelectDate, onClose }) {
  if (!isOpen) return null

  const days = getLast7Days()
  const todayIso = days[0].iso

  const handlePick = (iso) => {
    onSelectDate(iso)
    onClose()
  }

  return (
    <div className="bg-cream border border-border rounded-2xl p-3 mt-2 shadow-md">
      <p className="font-montserrat text-[10px] text-text-muted mb-2 uppercase tracking-wide">
        Elige el dia a registrar
      </p>
      <div className="flex flex-wrap gap-2">
        {days.map(({ iso, label }) => {
          const isActive = iso === selectedDate
          const isToday = iso === todayIso
          const classes = [
            'font-montserrat text-[11px] font-semibold rounded-lg px-2.5 py-1.5 capitalize transition-colors duration-150',
            isActive
              ? 'bg-burgundy text-white'
              : 'bg-white border border-border text-text-body hover:border-burgundy',
          ].join(' ')
          return (
            <button key={iso} onClick={() => handlePick(iso)} className={classes}>
              {isToday ? 'Hoy' : label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
