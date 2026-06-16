import { memo } from 'react'
import Avatar from '../ui/Avatar.jsx'
import ToggleSwitch from '../ui/ToggleSwitch.jsx'

/**
 * Contenido visual interno del control switch: avatar, nombre, stats y el
 * indicador toggle (presentacional). Compartido por ambas variantes de fila.
 * @param {object} props
 * @param {string} props.name - Nombre completo del alumno
 * @param {string} props.initials - Iniciales del alumno
 * @param {boolean} props.isPresent - Si esta marcado como presente
 * @param {React.ReactNode} [props.stats] - Contenido extra (stats para dashboard)
 */
function SwitchContent({ name, initials, isPresent, stats }) {
  return (
    <>
      <Avatar
        initials={isPresent ? '✓' : initials}
        variant={isPresent ? 'active' : 'inactive'}
      />

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

      {/* Indicador visual (no interactivo: el contenedor ya es el control) */}
      <ToggleSwitch checked={isPresent} presentational />
    </>
  )
}

const rowClasses = (isPresent) => [
  'animate-slide-up flex items-center gap-3 p-3 rounded-xl text-left w-full',
  'transition-all duration-300 border-[1.5px]',
  isPresent
    ? 'bg-burgundy-soft border-burgundy/20'
    : 'bg-white border-border-light',
].join(' ')

/**
 * Fila de alumno para la vista de asistencia.
 *
 * Sin `onInfo`: la fila ENTERA es el control switch (un solo control
 * interactivo). Con `onInfo`: la fila pasa a ser un contenedor con DOS
 * controles hermanos no anidados — el switch grande y un boton "info" aparte
 * para abrir el detalle del alumno (no se anida boton dentro de boton).
 *
 * @param {object} props
 * @param {string} props.name - Nombre completo del alumno
 * @param {string} props.initials - Iniciales del alumno
 * @param {boolean} props.isPresent - Si esta marcado como presente
 * @param {function} props.onToggle - Handler al cambiar estado
 * @param {function} [props.onInfo] - Handler para abrir el detalle del alumno
 * @param {number} [props.delay=0] - Delay de animacion en segundos
 * @param {React.ReactNode} [props.stats] - Contenido extra (stats para dashboard)
 */
export default memo(function StudentRow({
  name,
  initials,
  isPresent,
  onToggle,
  onInfo,
  delay = 0,
  stats,
}) {
  const content = (
    <SwitchContent
      name={name}
      initials={initials}
      isPresent={isPresent}
      stats={stats}
    />
  )

  // Caso simple: la fila entera es el control switch (uso original, dashboard).
  if (!onInfo) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isPresent}
        aria-label={`Asistencia de ${name}: ${isPresent ? 'presente' : 'ausente'}`}
        className={`${rowClasses(isPresent)} mb-2`}
        style={{ animationDelay: `${delay}s` }}
        onClick={onToggle}
      >
        {content}
      </button>
    )
  }

  // Con detalle: contenedor con dos controles hermanos (switch + info).
  return (
    <div
      className={`${rowClasses(isPresent)} mb-2`}
      style={{ animationDelay: `${delay}s` }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={isPresent}
        aria-label={`Asistencia de ${name}: ${isPresent ? 'presente' : 'ausente'}`}
        className="flex items-center gap-3 flex-1 min-w-0 text-left bg-transparent border-none p-0 cursor-pointer"
        onClick={onToggle}
      >
        {content}
      </button>

      <button
        type="button"
        aria-label={`Ver detalle de ${name}`}
        className="shrink-0 size-10 -my-1 -mr-1 flex items-center justify-center rounded-full text-text-muted bg-transparent border-none cursor-pointer transition-colors duration-200 hover:bg-burgundy-soft hover:text-burgundy"
        onClick={onInfo}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      </button>
    </div>
  )
})
