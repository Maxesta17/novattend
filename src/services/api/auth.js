/**
 * Endpoints de autenticacion: login, reset de password y cambio de password.
 *
 * loginRequest y solicitarReset mantienen su propio AbortController con
 * timeout de 20s (PBKDF2 en el servidor es costoso y el primer arranque
 * frio de Apps Script se midio en ~12s). NO usan el timeout generico de
 * http.js para conservar sus mensajes de error especificos.
 *
 * @module services/api/auth
 */

import { API_URL, isApiEnabled } from '../../config/api'
import { AuthError, PermissionError } from './errors'
import { apiPost, mapNetworkError } from './http'

/** Timeout propio de login/reset (ms): PBKDF2 + cold start de Apps Script. */
const AUTH_TIMEOUT_MS = 20000

/**
 * Solicita autenticacion al backend.
 * Usa un AbortController propio con timeout de 20s (PBKDF2 es costoso).
 * El token resultante NO se inyecta en esta llamada (es la que lo genera).
 *
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{token, profesor_id, rol, nombre, exp, must_change_password}>}
 */
export async function loginRequest(username, password) {
  if (!isApiEnabled()) return null

  // 20s: PBKDF2 corre en el servidor (Apps Script). Con PBKDF2_ITER=1000 el login
  // ronda ~3-4s en caliente, pero el primer login del dia (instancia fria) se midio
  // en ~12s. Dejamos margen amplio para cold start + redes moviles lentas. (Antes
  // 10s, que con los 10000 iters originales abortaba SIEMPRE -> "Error al conectar".)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS)

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'login', username, password }),
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}: ${res.statusText}`)
    }
    const json = await res.json()

    if (json.status === 'error') {
      // Login fallido: clasificar por code numerico
      // 401 en login NO llama a clearSession (no hay sesion que limpiar aun)
      const message = json.error || 'Error desconocido de la API'
      const code = json.code
      const reason = json.reason
      if (code === 401) {
        throw new AuthError(message, reason)
      }
      if (code === 403) {
        throw new PermissionError(message, reason)
      }
      throw new Error(message)
    }

    return json.data
  } catch (err) {
    // AbortError = timeout de red → NO limpiar sesion.
    // mapNetworkError tambien traduce fallos de red crudos ("Failed to fetch").
    throw mapNetworkError(err, 'La solicitud de login tardo demasiado. Comprueba tu conexion.')
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Solicita un reset de password por email. NO requiere sesion.
 * El backend responde SIEMPRE con un mensaje generico (anti-enumeracion): no
 * revela si el usuario existe. Si existe y tiene email, le envia una temporal.
 * Timeout propio porque el backend hashea (PBKDF2) y envia el correo.
 *
 * @param {string} username
 * @param {string} email - email del profesor (segundo factor: debe coincidir con el de la hoja)
 * @returns {Promise<{message: string}|null>}
 */
export async function solicitarReset(username, email) {
  if (!isApiEnabled()) {
    return { message: 'Si los datos son correctos, te hemos enviado un correo con una contraseña temporal.' }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS)

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'solicitarReset', username, email }),
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}: ${res.statusText}`)
    }
    const json = await res.json()
    if (json.status === 'error') {
      throw new Error(json.error || 'Error desconocido de la API')
    }
    return json.data
  } catch (err) {
    // Timeout y fallos de red traducidos a espanol; el resto se relanza intacto.
    throw mapNetworkError(err, 'La solicitud tardó demasiado. Comprueba tu conexión.')
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Cambia la password del usuario autenticado.
 * El token de sesion ya se inyecta automaticamente por apiPost.
 *
 * IMPORTANTE: el backend incrementa token_version al cambiar la password,
 * lo que REVOCA el token actual. Tras un cambio correcto, la sesion debe
 * limpiarse (clearSession) y el usuario re-autenticarse con la nueva password.
 *
 * @param {string} nuevaPassword - nueva password en claro (validada por el backend)
 * @returns {Promise<Object|null>} data de confirmacion del backend
 */
export async function cambiarPassword(nuevaPassword) {
  return apiPost('cambiarPassword', { nueva_password: nuevaPassword })
}
