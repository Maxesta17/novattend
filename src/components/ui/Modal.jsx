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
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Overlay: cierre por click fuera; equivalencia teclado (Escape) cubierta por useFocusTrap */}
      <div
        className="animate-fade-in fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-5"
        onClick={onClose}
      >
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Dialog: stopPropagation no es interactividad; role="dialog" es no-interactivo con teclado via useFocusTrap */}
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
    </>
  )
}
