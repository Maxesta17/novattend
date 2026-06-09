/**
 * Utilidades de fecha para el marcado de asistencia.
 *
 * Importante: usamos formateo en zona LOCAL (no UTC). El patron anterior
 * `new Date().toISOString()` devuelve la fecha en UTC, lo que en Espana
 * (GMT+1/+2) puede dar el dia anterior cerca de medianoche.
 *
 * @module utils/dateUtils
 */

/**
 * Formatea un Date a 'yyyy-MM-dd' usando la zona horaria LOCAL del dispositivo.
 * @param {Date} date
 * @returns {string} Fecha en formato yyyy-MM-dd
 */
export function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Genera los ultimos 7 dias (hoy incluido), del mas reciente al mas antiguo.
 * @returns {Array<{iso: string, label: string}>} iso=yyyy-MM-dd, label legible es-ES
 */
export function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    return {
      iso: formatLocalDate(date),
      label: date.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
    }
  })
}

/**
 * Etiqueta legible (es-ES) para una fecha iso 'yyyy-MM-dd'.
 * Construye el Date en hora local (mediodia) para evitar saltos de dia por zona horaria.
 * @param {string} iso - Fecha en formato yyyy-MM-dd
 * @returns {string} Etiqueta tipo "lun, 9 jun"
 */
export function labelFromIso(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12, 0, 0)
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
