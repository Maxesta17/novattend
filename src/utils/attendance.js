/**
 * Utilidades de dominio para calculos de asistencia.
 * Formula unica compartida: round((clases - faltas) / clases * 100).
 * Centraliza la logica antes duplicada en useDashboard y TeacherCard.
 */

/**
 * % de asistencia de un alumno: presentes / clases totales.
 * Con fallback al campo monthly viejo (mocks sin campos nuevos).
 * @param {Object} student - Alumno con clasesTotal/faltasTotal (o monthly)
 * @returns {number} Porcentaje redondeado (0-100)
 */
export function singleAttendance(student) {
  if (typeof student.clasesTotal === 'number' && student.clasesTotal > 0) {
    const presentes = student.clasesTotal - (student.faltasTotal ?? 0)
    return Math.round((presentes / student.clasesTotal) * 100)
  }
  return student.monthly ?? 0
}

/**
 * % de asistencia agregado de una lista de alumnos: suma faltas/clases
 * (no media de medias). Fallback a media de monthly si ningun alumno
 * tiene los campos nuevos.
 * @param {Array<Object>} students - Lista de alumnos
 * @returns {number} Porcentaje redondeado (0-100)
 */
export function aggregateAttendance(students) {
  if (students.length === 0) return 0
  let totalClases = 0
  let totalFaltas = 0
  let hasNew = false
  students.forEach(s => {
    if (typeof s.clasesTotal === 'number') {
      totalClases += s.clasesTotal
      totalFaltas += s.faltasTotal ?? 0
      if (s.clasesTotal > 0) hasNew = true
    }
  })
  if (hasNew && totalClases > 0) {
    return Math.round(((totalClases - totalFaltas) / totalClases) * 100)
  }
  // Fallback a monthly viejo (mocks que aun no tienen campos nuevos)
  return Math.round(students.reduce((acc, s) => acc + (s.monthly ?? 0), 0) / students.length)
}

/**
 * Devuelve clases Tailwind segun el porcentaje de asistencia.
 * Umbrales: >=80 optimo, 60-79 alerta, <60 critico.
 * @param {number} pct - Porcentaje de asistencia (0-100)
 * @returns {{text: string, bg: string, status: string}} Tokens Tailwind + etiqueta
 */
export function getAttendanceScheme(pct) {
  if (pct >= 80) return { text: 'text-success', bg: 'bg-success-soft', status: 'Asistencia regular' }
  if (pct >= 60) return { text: 'text-warning', bg: 'bg-warning-soft', status: 'Requiere atencion' }
  return { text: 'text-error', bg: 'bg-error-soft', status: 'Alerta — contactar alumno' }
}
