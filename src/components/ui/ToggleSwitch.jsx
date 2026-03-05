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
    <div
      className={[
        'relative w-12 h-7 rounded-full transition-all duration-300 cursor-pointer',
        checked
          ? 'bg-gradient-to-br from-burgundy to-burgundy-light shadow-[0_2px_8px_rgba(128,0,0,0.3)]'
          : 'bg-[#CDCDCD]',
        className,
      ].filter(Boolean).join(' ')}
      onClick={onChange}
    >
      <div
        className={[
          'absolute top-0.5 w-6 h-6 rounded-[11px] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-[left] duration-300',
          checked ? 'left-6' : 'left-0.5',
        ].join(' ')}
      />
    </div>
  )
}
