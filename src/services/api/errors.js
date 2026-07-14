/**
 * Clases de error y clasificacion de errores del backend.
 *
 * Clasificacion por code/reason numerico (no por regex de mensaje):
 *   - 401 → AuthError (limpia sesion y emite auth:expired)
 *   - 403 → PermissionError (NO limpia sesion)
 *   - Timeout/red → Error generico (NO limpia sesion, se mapea en http.js)
 *
 * @module services/api/errors
 */

import { clearSession } from '../../config/session'

/**
 * Error de autenticacion (401): token invalido o credenciales incorrectas.
 * Al capturarlo, la sesion se limpia y el usuario es redirigido al login.
 */
export class AuthError extends Error {
  constructor(message, reason) {
    super(message)
    this.name = 'AuthError'
    this.code = 401
    this.reason = reason || 'token_invalid'
  }
}

/**
 * Error de permiso (403): el usuario esta autenticado pero carece de acceso.
 * NO limpia la sesion — el usuario sigue logueado.
 */
export class PermissionError extends Error {
  constructor(message, reason) {
    super(message)
    this.name = 'PermissionError'
    this.code = 403
    this.reason = reason || 'forbidden'
  }
}

/**
 * Lanza el error correcto segun el code/reason del JSON de respuesta.
 * Solo se invoca cuando json.status === 'error'.
 * Un timeout o error de red NUNCA pasa por aqui (no borra sesion).
 *
 * @param {Object} json - respuesta parseada del backend
 */
export function throwApiError(json) {
  const message = json.error || 'Error desconocido de la API'
  const code = json.code
  const reason = json.reason

  if (code === 401) {
    // 401 de auth: limpiar sesion + emitir auth:expired
    clearSession()
    throw new AuthError(message, reason)
  }

  if (code === 403) {
    // 403 de permisos: NO limpiar sesion
    throw new PermissionError(message, reason)
  }

  // Cualquier otro error de negocio
  throw new Error(message)
}
