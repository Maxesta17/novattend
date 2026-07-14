import { useEffect, useState } from 'react'
import { count, QUEUE_CHANGED_EVENT } from '../../services/offlineQueue'

/**
 * Banner discreto que avisa de guardados pendientes de sincronizar.
 * Lee la cola offline directamente (no recibe props), se actualiza con el
 * evento QUEUE_CHANGED_EVENT y desaparece solo cuando la cola queda vacia.
 * @returns {JSX.Element|null}
 */
export default function PendingSyncBanner() {
  const [pending, setPending] = useState(0)

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      count()
        .then(n => { if (!cancelled) setPending(n) })
        .catch(() => {})
    }
    refresh()
    window.addEventListener(QUEUE_CHANGED_EVENT, refresh)
    window.addEventListener('online', refresh)
    return () => {
      cancelled = true
      window.removeEventListener(QUEUE_CHANGED_EVENT, refresh)
      window.removeEventListener('online', refresh)
    }
  }, [])

  if (pending === 0) return null

  return (
    <div
      role="status"
      className="mx-4 mb-3 flex items-center gap-2 bg-warning-soft border border-warning/30 rounded-lg px-3 py-2"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="text-warning shrink-0"
        aria-hidden="true"
      >
        <path d="M12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" />
      </svg>
      <p className="font-montserrat text-[11px] font-semibold text-warning m-0 text-pretty">
        {pending === 1
          ? '1 guardado pendiente de sincronizar'
          : `${pending} guardados pendientes de sincronizar`}
      </p>
    </div>
  )
}
