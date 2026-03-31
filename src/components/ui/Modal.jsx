import useFocusTrap from '../../hooks/useFocusTrap.js'

/**
 * Modal/popup con overlay oscuro, focus trap y cierre con Escape.
 * @param {object} props
 * @param {boolean} props.isOpen - Controla visibilidad
 * @param {function} props.onClose - Handler al cerrar (click en overlay o Escape)
 * @param {React.ReactNode} props.children - Contenido del modal
 * @param {string} [props.maxWidth='360px'] - Ancho maximo del contenedor
 * @param {string} [props.className] - Clases adicionales para el contenedor interno
 * @param {string} [props.ariaLabel=''] - Label accesible para screen readers
 */
export default function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = '360px',
  className = '',
  ariaLabel = '',
}) {
  const containerRef = useFocusTrap(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div
      className="animate-fade-in fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-5"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`animate-pop-up bg-white rounded-[20px] p-6 w-full shadow-2xl ${className}`}
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
