import { memo } from 'react'
import Avatar from '../ui/Avatar.jsx'
import ToggleSwitch from '../ui/ToggleSwitch.jsx'

/**
 * Fila de alumno para la vista de asistencia.
 * @param {object} props
 * @param {string} props.name - Nombre completo del alumno
 * @param {string} props.initials - Iniciales del alumno
 * @param {boolean} props.isPresent - Si esta marcado como presente
 * @param {function} props.onToggle - Handler al cambiar estado
 * @param {number} [props.delay=0] - Delay de animacion en segundos
 * @param {React.ReactNode} [props.stats] - Contenido extra (stats para dashboard)
 */
export default memo(function StudentRow({
  name,
  initials,
  isPresent,
  onToggle,
  delay = 0,
  stats,
}) {
  return (
    <div
      className={[
        'animate-slide-up flex items-center gap-3 p-3 mb-2 rounded-xl cursor-pointer',
        'transition-all duration-300 border-[1.5px]',
        isPresent
          ? 'bg-burgundy-soft border-burgundy/20'
          : 'bg-white border-border-light',
      ].join(' ')}
      style={{ animationDelay: `${delay}s` }}
      onClick={onToggle}
    >
      {/* Avatar */}
      <Avatar
        initials={isPresent ? '✓' : initials}
        variant={isPresent ? 'active' : 'inactive'}
      />

      {/* Nombre y stats opcionales */}
      <div className="flex-1 min-w-0">
        <p
          className={[
            'font-montserrat text-[14.5px] m-0 truncate',
            isPresent
              ? 'font-semibold text-burgundy'
              : 'font-normal text-text-dark',
          ].join(' ')}
        >
          {name}
        </p>
        {stats}
      </div>

      {/* Toggle */}
      <ToggleSwitch checked={isPresent} onChange={onToggle} />
    </div>
  )
})
