/**
 * Banner de actualizacion del Service Worker.
 * Aparece en la parte inferior cuando hay una nueva version disponible.
 * @param {object} props
 * @param {boolean} props.needRefresh - Si es true, muestra el banner; si es false, retorna null
 * @param {function} props.onUpdate - Funcion llamada al pulsar el boton "Actualizar"
 */
export default function UpdateBanner({ needRefresh, onUpdate }) {
  if (!needRefresh) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-[430px] mx-auto bg-gold-soft border-t border-gold/40 px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-text-dark text-sm font-montserrat">
          Nueva version disponible
        </span>
        <button
          className="bg-burgundy text-white text-xs font-semibold font-montserrat rounded-lg px-4 py-2 min-h-[44px] shrink-0 hover:bg-burgundy-light transition-colors duration-200"
          onClick={onUpdate}
        >
          Actualizar
        </button>
      </div>
    </div>
  )
}
