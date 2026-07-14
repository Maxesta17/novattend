/**
 * Persistencia de marcas de asistencia sin guardar en sessionStorage.
 *
 * Problema (auditoria M5): si el token expira mientras el profesor pasa
 * lista, el 401 dispara clearSession() -> evento 'auth:expired' -> el
 * listener global redirige al login. AttendancePage se desmonta y las
 * marcas en memoria (useState de useStudents) se pierden.
 *
 * clearSession() SOLO borra la clave 'user' de sessionStorage (ver
 * config/session.js) y no toca ninguna otra clave, asi que un snapshot
 * guardado aqui sobrevive al 401 dentro de la MISMA pestana y permite
 * restaurar las marcas al volver a montar AttendancePage.
 *
 * Solo se guardan ids/nombres de alumno y booleans -- nunca token ni datos
 * de sesion. Todos los accesos van envueltos en try/catch porque
 * sessionStorage puede fallar (modo privado / cuota) y nunca debe romper
 * la pagina.
 *
 * @module utils/pendingMarksStorage
 */

const KEY_PREFIX = 'novattend_pending_marks'
// Vida maxima de un snapshot: cubre una sesion de token (~8h) con margen.
// Pasado este tiempo se considera basura y se ignora/purga al leerlo.
const MAX_AGE_MS = 12 * 60 * 60 * 1000
// Debounce simple para no escribir en sessionStorage en cada tick de un
// "marcar todo" u otra rafaga de toggles.
const DEBOUNCE_MS = 300

const pendingTimers = new Map()

/**
 * Construye la clave determinista de sessionStorage para un snapshot.
 * @param {string} convocatoriaId
 * @param {string} grupo
 * @param {string} fecha - yyyy-MM-dd
 * @returns {string}
 */
export function pendingMarksKey(convocatoriaId, grupo, fecha) {
  return `${KEY_PREFIX}:${convocatoriaId}:${grupo}:${fecha}`
}

/**
 * Guarda (con debounce) las marcas actuales de un grupo/dia.
 * No-op si falta convocatoriaId o la lista de alumnos esta vacia.
 * @param {string} convocatoriaId
 * @param {string} grupo
 * @param {string} fecha - yyyy-MM-dd
 * @param {Array<{id?: string, name: string, present: boolean}>} students
 */
export function savePendingMarks(convocatoriaId, grupo, fecha, students) {
  if (!convocatoriaId || !grupo || !fecha || !students?.length) return

  const key = pendingMarksKey(convocatoriaId, grupo, fecha)
  const existingTimer = pendingTimers.get(key)
  if (existingTimer) clearTimeout(existingTimer)

  const timer = setTimeout(() => {
    pendingTimers.delete(key)
    try {
      const marks = {}
      students.forEach(s => { marks[s.id || s.name] = s.present === true })
      sessionStorage.setItem(key, JSON.stringify({ marks, savedAt: Date.now() }))
    } catch {
      // Silencioso: si no se puede persistir, el peor caso es no poder
      // restaurar tras un 401 -- nunca romper la pagina de marcado.
    }
  }, DEBOUNCE_MS)
  pendingTimers.set(key, timer)
}

/**
 * Lee el snapshot pendiente de un grupo/dia si existe y sigue vigente.
 * Purga automaticamente snapshots caducados (mas viejos que MAX_AGE_MS).
 * @param {string} convocatoriaId
 * @param {string} grupo
 * @param {string} fecha - yyyy-MM-dd
 * @returns {{marks: Object<string, boolean>, savedAt: number}|null}
 */
export function loadPendingMarks(convocatoriaId, grupo, fecha) {
  if (!convocatoriaId || !grupo || !fecha) return null
  const key = pendingMarksKey(convocatoriaId, grupo, fecha)
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.marks || typeof parsed.savedAt !== 'number') {
      sessionStorage.removeItem(key)
      return null
    }
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(key)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/**
 * Elimina el snapshot pendiente de un grupo/dia (tras guardar con exito,
 * online o encolado offline).
 * @param {string} convocatoriaId
 * @param {string} grupo
 * @param {string} fecha - yyyy-MM-dd
 */
export function clearPendingMarks(convocatoriaId, grupo, fecha) {
  if (!convocatoriaId || !grupo || !fecha) return
  const key = pendingMarksKey(convocatoriaId, grupo, fecha)
  const existingTimer = pendingTimers.get(key)
  if (existingTimer) {
    clearTimeout(existingTimer)
    pendingTimers.delete(key)
  }
  try {
    sessionStorage.removeItem(key)
  } catch {
    // Silencioso: ver justificacion arriba.
  }
}
