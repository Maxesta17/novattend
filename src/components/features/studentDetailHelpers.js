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
