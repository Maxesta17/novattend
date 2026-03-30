/**
 * Banner de error inline reutilizable.
 * @param {object} props
 * @param {string|null} props.message - Mensaje de error. Si es null/empty, no renderiza.
 * @param {function} [props.onDismiss] - Callback al cerrar. Si no se pasa, no muestra boton X.
 */
export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null

  const classes = [
    'flex items-center gap-2 mb-2 px-3 py-2',
    'bg-error-soft border border-error/30 rounded-lg',
    'text-error text-xs font-montserrat',
  ].join(' ')

  return (
    <div className={classes} role="alert">
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-error/70 hover:text-error font-bold text-sm leading-none p-1"
          aria-label="Cerrar error"
        >
          ×
        </button>
      )}
    </div>
  )
}
