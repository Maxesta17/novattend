import { useState, useEffect, useCallback } from 'react'
import { formatLocalDate } from '../utils/dateUtils'

/**
 * Revalida client-side, al volver la pestana a primer plano, que la
 * convocatoria activa siga vigente y que el dia no haya cambiado de fondo.
 *
 * Problema (auditoria M5): si el profesor deja la pestana en background y
 * vuelve al dia siguiente (o la convocatoria ya vencio), nadie lo avisa: la
 * pagina sigue mostrando el estado con el que se quedo, con riesgo de
 * guardar asistencia bajo una fecha/convocatoria que ya no corresponde.
 *
 * No llama a la API (comparacion puramente local); si hace falta un dato
 * fresco, el aviso resultante le pide al profesor recargar la pagina.
 *
 * @param {{fecha_inicio?: string, fecha_fin?: string}|null} convocatoria - Convocatoria activa en state
 * @param {string} expectedDateIso - Dia con el que se monto la pagina (yyyy-MM-dd)
 * @returns {{stale: boolean, message: string|null}}
 */
export default function useRevalidateOnVisible(convocatoria, expectedDateIso) {
  const [reason, setReason] = useState(null)

  const revalidate = useCallback(() => {
    const currentDate = formatLocalDate(new Date())

    if (expectedDateIso && currentDate !== expectedDateIso) {
      setReason('day-changed')
      return
    }
    const { fecha_inicio, fecha_fin } = convocatoria || {}
    const expired = Boolean(
      fecha_inicio && fecha_fin && (currentDate < fecha_inicio || currentDate > fecha_fin)
    )
    setReason(expired ? 'expired' : null)
  }, [convocatoria, expectedDateIso])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') revalidate()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [revalidate])

  const messages = {
    expired: 'Esta convocatoria ya no está vigente. Recarga la página antes de guardar.',
    'day-changed': 'El día cambió mientras la pestaña estaba en segundo plano. Recarga la página antes de guardar.',
  }

  return { stale: reason !== null, message: reason ? messages[reason] : null }
}
