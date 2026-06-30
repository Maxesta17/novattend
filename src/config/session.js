/**
 * Modulo de gestion de sesion autenticada.
 *
 * Centraliza lectura/escritura del token y datos de sesion en sessionStorage.
 * Nota: exp viaja en SEGUNDOS Unix (coherente con el backend Apps Script).
 * Este modulo NO importa nada de api.js para evitar ciclos de dependencia.
 *
 * @module config/session
 */

const SESSION_KEY = 'user'

/**
 * Lee y parsea la sesion actual de sessionStorage.
 * @returns {Object|null} objeto de sesion o null si no existe/es invalido
 */
export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Persiste la sesion en sessionStorage.
 * @param {Object} sessionData - objeto con token, rol, exp, etc.
 */
export function setSession(sessionData) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
}

/**
 * Devuelve el token de sesion, o null si no hay sesion activa.
 * @returns {string|null}
 */
export function getToken() {
  const session = getSession()
  return session?.token ?? null
}

/**
 * Comprueba si la sesion actual ha expirado.
 * exp se compara en SEGUNDOS Unix contra Date.now()/1000.
 * Una sesion sin exp se considera expirada.
 * @returns {boolean} true si ha expirado o no existe sesion
 */
export function isExpired() {
  const session = getSession()
  if (!session || typeof session.exp !== 'number') return true
  const nowSecs = Math.floor(Date.now() / 1000)
  return session.exp <= nowSecs
}

/**
 * Elimina la sesion de sessionStorage SIN emitir eventos.
 * Uso: logout intencional del usuario (no es una expiracion).
 * Es idempotente.
 */
export function logout() {
  sessionStorage.removeItem(SESSION_KEY)
}

/**
 * Elimina la sesion de sessionStorage y emite el evento 'auth:expired'
 * para que los listeners globales (AuthExpiredListener) redirijan al login.
 * Uso: expiracion/revocacion de sesion detectada en un 401.
 * Es idempotente: llamarlo multiples veces no tiene efectos secundarios adicionales.
 */
export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  window.dispatchEvent(new Event('auth:expired'))
}
