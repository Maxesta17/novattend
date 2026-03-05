/**
 * Modal/popup con overlay oscuro. Se cierra al pulsar fuera.
 * @param {object} props
 * @param {boolean} props.isOpen - Controla visibilidad
 * @param {function} props.onClose - Handler al cerrar (click en overlay)
 * @param {React.ReactNode} props.children - Contenido del modal
 * @param {string} [props.maxWidth='360px'] - Ancho maximo del contenedor
 * @param {string} [props.className] - Clases adicionales para el contenedor interno
 */
export default function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = '360px',
  className = '',
}) {
  if (!isOpen) return null

  return (
    <div
      className="animate-fade-in fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-5"
      onClick={onClose}
    >
      <div
        className={`animate-pop-up bg-white rounded-[20px] p-6 w-full shadow-2xl ${className}`}
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
