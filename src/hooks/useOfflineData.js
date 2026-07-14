import { useEffect, useState } from 'react'
import { subscribeDataSource } from '../services/cacheStatus'

/**
 * Hook que expone si los datos que se estan pintando ahora mismo provienen
 * del fallback de cache del Service Worker (offline/red caida) en lugar de
 * una respuesta de red fresca.
 *
 * Se suscribe al evento de cacheStatus.js mientras el componente esta
 * montado. El valor inicial es `false` (se asume red hasta la primera
 * notificacion), lo que es correcto en dev y en modo mock: ahi el Service
 * Worker no corre, el evento nunca llega, y el valor se queda en `false`.
 *
 * @returns {boolean} true si los ultimos datos pintados vienen de cache.
 */
export default function useOfflineData() {
  const [isOfflineData, setIsOfflineData] = useState(false)

  useEffect(() => {
    return subscribeDataSource((source) => {
      setIsOfflineData(source === 'cache')
    })
  }, [])

  return isOfflineData
}
