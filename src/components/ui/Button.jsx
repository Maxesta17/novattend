/**
 * Boton reutilizable con variantes de estilo.
 * @param {object} props
 * @param {'primary'|'ghost'|'disabled'} [props.variant='primary'] - Estilo visual
 * @param {boolean} [props.loading=false] - Muestra spinner y deshabilita
 * @param {React.ReactNode} [props.icon] - Icono a la izquierda del texto
 * @param {boolean} [props.fullWidth=false] - Ocupa todo el ancho
 * @param {React.ReactNode} props.children - Contenido del boton
 * @param {function} [props.onClick] - Handler de click
 * @param {string} [props.className] - Clases adicionales
 */
export default function Button({
  variant = 'primary',
  loading = false,
  icon,
  fullWidth = false,
  children,
  onClick,
  className = '',
  ...rest
}) {
  const base = [
    'font-montserrat text-sm font-bold rounded-[14px] py-[15px] px-4',
    'flex items-center justify-center gap-2',
    'transition-all duration-200 ease-out cursor-pointer',
    'hover:-translate-y-0.5 active:translate-y-0',
  ]

  const variants = {
    primary: 'bg-burgundy text-white shadow-lg hover:shadow-xl hover:bg-burgundy-light',
    ghost: 'bg-transparent border border-gold/25 text-white/80 hover:bg-white/[0.08] hover:border-gold',
    disabled: 'bg-disabled text-white cursor-not-allowed hover:translate-y-0',
  }

  const isDisabled = variant === 'disabled' || loading

  const classes = [
    ...base,
    variants[variant] || variants.primary,
    fullWidth ? 'w-full' : '',
    loading ? 'opacity-80' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button
      className={classes}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <svg
          aria-hidden="true"
          className="animate-spin"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  )
}
