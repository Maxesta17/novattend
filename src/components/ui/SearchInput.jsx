/**
 * Campo de busqueda con icono y boton de limpiar.
 * @param {object} props
 * @param {string} props.value - Valor actual del input
 * @param {function} props.onChange - Handler de cambio
 * @param {function} [props.onClear] - Handler al limpiar (boton X)
 * @param {string} [props.placeholder='Buscar...'] - Placeholder
 * @param {string} [props.className] - Clases adicionales
 * @param {string} [props.ariaLabel='Buscar alumno'] - Etiqueta accesible del input
 */
export default function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Buscar...',
  className = '',
  ariaLabel = 'Buscar alumno',
}) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <svg
        aria-hidden="true"
        className="absolute left-2.5 text-text-muted pointer-events-none"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>

      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        className="w-full pl-9 pr-9 py-2.5 border-[1.5px] border-border rounded-[14px] bg-white font-montserrat text-[13px] outline-none focus:border-gold/40 transition-colors"
      />

      {value && onClear && (
        <button
          onClick={onClear}
          aria-label="Limpiar busqueda"
          className="absolute right-2.5 bg-transparent border-none cursor-pointer text-text-muted text-lg leading-none hover:text-text-dark transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  )
}
