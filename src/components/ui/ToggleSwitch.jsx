/**
 * Interruptor toggle tipo iOS.
 * @param {object} props
 * @param {boolean} props.checked - Estado actual
 * @param {function} props.onChange - Handler al cambiar
 * @param {string} [props.className] - Clases adicionales
 */
export default function ToggleSwitch({
  checked,
  onChange,
  className = '',
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={[
        'relative w-12 h-7 rounded-full transition-all duration-200 cursor-pointer border-none',
        checked
          ? 'bg-burgundy shadow-sm'
          : 'bg-[#CDCDCD]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy',
        className,
      ].filter(Boolean).join(' ')}
      onClick={onChange}
    >
      <div
        className={[
          'absolute top-0.5 size-6 rounded-[11px] bg-white shadow-sm transition-[left] duration-200',
          checked ? 'left-6' : 'left-0.5',
        ].join(' ')}
      />
    </button>
  )
}
