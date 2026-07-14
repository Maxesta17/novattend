/**
 * Helpers de formato y tono de color para el detalle de asistencia del alumno.
 * Se separan de los componentes para cumplir react-refresh/only-export-components.
 * @module features/studentDetailHelpers
 */

/** Formatea 'yyyy-MM-dd' a 'dd/MM/yyyy'. */
export const formatDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

/** Formatea 'yyyy-MM-dd' a 'dd/MM' (forma corta). */
export const formatShort = (dateStr) => {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

/** Color segun faltas absolutas en una semana de clases (lun-jue). */
export const weekTone = (faltas) => {
  if (faltas >= 3) return { color: 'text-error', bg: 'bg-error-soft', border: 'border-error' }
  if (faltas >= 2) return { color: 'text-warning', bg: 'bg-warning-soft', border: 'border-warning' }
  return { color: 'text-success', bg: 'bg-success-soft', border: 'border-success' }
}

/** Etiqueta de estado semanal segun numero de faltas. */
export function weekStatusLabel(faltas, clases) {
  if (clases === 0) return 'Sin clases registradas esta semana'
  if (faltas >= 3) return `Alerta — ${faltas} faltas esta semana`
  if (faltas >= 2) return `Atencion — ${faltas} faltas esta semana`
  return 'Asistencia regular esta semana'
}

// --- Cache de faltas por alumno (a nivel de modulo) ---
// Evita repetir el peaje de ~1,6s de Apps Script al reabrir el popup del
// mismo alumno. Se invalida tras justificar/quitar una justificacion.
const absencesCache = new Map()

/** Clave de cache para las faltas de un alumno en una convocatoria. */
export const absencesCacheKey = (convocatoriaId, alumnoId) => `${convocatoriaId}:${alumnoId}`

/** Devuelve las faltas cacheadas para la clave, o null si no hay entrada. */
export const getCachedAbsences = (key) => absencesCache.get(key) ?? null

/** Guarda las faltas de un alumno en el cache. */
export const setCachedAbsences = (key, items) => { absencesCache.set(key, items) }

/** Invalida la entrada de cache de un alumno (tras justificar/desjustificar). */
export const invalidateCachedAbsences = (key) => { absencesCache.delete(key) }

/** Vacia el cache completo (util para tests). */
export const clearAbsencesCache = () => { absencesCache.clear() }
