/**
 * Interruptor toggle tipo iOS.
 *
 * Por defecto es un boton interactivo (role=switch). Con `presentational`
 * se renderiza como indicador visual puro (<span aria-hidden>), sin ser un
 * control: util cuando el contenedor ya es el elemento interactivo y anidar
 * otro boton seria HTML invalido (ej. StudentRow).
 *
 * @param {object} props
 * @param {boolean} props.checked - Estado actual
 * @param {function} [props.onChange] - Handler al cambiar (ignorado si presentational)
 * @param {boolean} [props.presentational=false] - Renderiza solo el indicador visual
 * @param {string} [props.className] - Clases adicionales
 */
export default function ToggleSwitch({
  checked,
  onChange,
  presentational = false,
  className = '',
}) {
  const trackClasses = [
    'relative w-12 h-7 rounded-full transition-all duration-200 border-none',
    presentational ? '' : 'cursor-pointer',
    checked ? 'bg-burgundy shadow-sm' : 'bg-disabled',
    className,
  ].filter(Boolean).join(' ')

  const knob = (
    <div
      className={[
        'absolute top-0.5 size-6 rounded-[11px] bg-white shadow-sm transition-[left] duration-200',
        checked ? 'left-6' : 'left-0.5',
      ].join(' ')}
    />
  )

  // Indicador visual puro: el contenedor padre es el control accesible.
  if (presentational) {
    return (
      <span aria-hidden="true" className={trackClasses}>
        {knob}
      </span>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={trackClasses}
      onClick={onChange}
    >
      {knob}
    </button>
  )
}
