import { useEffect, useState } from 'react'
import { subscribeDataSource } from '../services/cacheStatus'

/**
 * Hook que expone si los datos que se estan pintando ahora mismo provienen
 * del fallback de cache del Service Worker (backend lento o inalcanzable)
 * en lugar de una respuesta de red fresca, junto con el estado de red del
 * navegador para poder distinguir "sin conexion" de "el servidor va lento".
 *
 * Se suscribe al evento de cacheStatus.js y a los eventos online/offline de
 * window mientras el componente esta montado. `isStale` inicia en `false`
 * (se asume red hasta la primera notificacion), lo que es correcto en dev y
 * en modo mock: ahi el Service Worker no corre, el evento nunca llega, y el
 * valor se queda en `false`.
 *
 * @returns {{isStale: boolean, online: boolean}} isStale: true si los
 *   ultimos datos pintados vienen de cache. online: navigator.onLine en
 *   vivo, solo para elegir el texto del banner (nunca para decidir logica).
 */
export default function useOfflineData() {
  const [isStale, setIsStale] = useState(false)
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  )

  useEffect(() => {
    const unsubscribe = subscribeDataSource((source) => {
      setIsStale(source === 'cache')
    })
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isStale, online }
}
