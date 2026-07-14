/**
 * Capa base de transporte HTTP contra Google Apps Script.
 *
 * Auth por token:
 *   - apiGet: agrega token como query param si existe en sesion.
 *   - apiPost: incluye token en el body JSON si existe.
 *   - El api_key compartido fue retirado; el token de sesion es la unica via de auth.
 *
 * Robustez de red (centralizada aqui):
 *   - Timeout de 20s via AbortController en apiGet/apiPost. Apps Script puede
 *     colgarse indefinidamente y sin esto los POST quedan en spinner infinito.
 *   - Los errores crudos del navegador ("Failed to fetch", AbortError) se
 *     traducen a mensajes en espanol preservando la causa original (cause).
 *   - Los errores de negocio del backend (ya en espanol) NO se tocan.
 *
 * Origen de los datos (solo apiGet):
 *   - Tras una respuesta HTTP exitosa se notifica a cacheStatus.js si vino de
 *     Cache Storage (fallback del Service Worker) o de red fresca, para que
 *     OfflineDataBanner pueda avisar de datos potencialmente desactualizados.
 *   - apiPost NO notifica: los POST nunca se sirven desde cache.
 *
 * @module services/api/http
 */

import { API_URL, isApiEnabled } from '../../config/api'
import { getToken } from '../../config/session'
import { throwApiError } from './errors'
import { notifyDataSource } from '../cacheStatus'

/** Timeout por defecto para llamadas estandar (ms). Login/reset usan el suyo propio. */
const FETCH_TIMEOUT_MS = 20000

/** Mensaje mostrado al usuario cuando no hay red o el servidor es inalcanzable. */
const NETWORK_ERROR_MESSAGE = 'No hay conexión con el servidor. Comprueba tu red.'

/** Mensaje mostrado al usuario cuando la peticion excede el timeout. */
const TIMEOUT_ERROR_MESSAGE = 'El servidor tardó demasiado en responder. Inténtalo de nuevo.'

/**
 * Traduce errores crudos de fetch a errores con mensaje en espanol.
 * Preserva el error original en `cause` para depuracion.
 * Un timeout o fallo de red NUNCA limpia la sesion.
 *
 * @param {Error} err - error capturado del fetch
 * @param {string} [timeoutMessage] - mensaje a usar si el error es un AbortError
 * @returns {Error} error listo para relanzar (el original si no es de red)
 */
export function mapNetworkError(err, timeoutMessage = TIMEOUT_ERROR_MESSAGE) {
  // AbortError = timeout alcanzado
  if (err.name === 'AbortError') {
    return new Error(timeoutMessage, { cause: err })
  }
  // TypeError = fallo de red del navegador ("Failed to fetch", DNS, offline...)
  if (err instanceof TypeError) {
    return new Error(NETWORK_ERROR_MESSAGE, { cause: err })
  }
  return err
}

/**
 * fetch con timeout via AbortController y mapeo de errores de red.
 * Solo envuelve el fetch en si: los errores de negocio (throwApiError)
 * se lanzan fuera de esta funcion y no pasan por el mapeo.
 *
 * @param {string} url
 * @param {Object} [options] - opciones de fetch (sin signal; se inyecta aqui)
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err) {
    throw mapNetworkError(err)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * GET generico contra el backend.
 * Devuelve null si la API no esta habilitada (modo mock).
 *
 * @param {string} action - accion del backend (ej: 'getConvocatorias')
 * @param {Object} [params] - query params; se omiten los undefined/null/vacios
 * @returns {Promise<*>} campo data de la respuesta
 */
export async function apiGet(action, params = {}) {
  if (!isApiEnabled()) return null

  const url = new URL(API_URL)
  url.searchParams.set('action', action)

  // Auth exclusiva por token de sesion; el api_key compartido fue retirado.
  const token = getToken()
  if (token) url.searchParams.set('token', token)

  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      url.searchParams.set(key, val)
    }
  })

  const res = await fetchWithTimeout(url.toString())
  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status}: ${res.statusText}`)
  }

  // Contrato con el Service Worker: una respuesta servida desde Cache Storage
  // (fallback de NetworkFirst) llega con este header. `res.headers` puede no
  // existir en mocks de test que no lo definen; el optional chaining lo trata
  // igual que una respuesta de red normal.
  notifyDataSource(res.headers?.get('X-Novattend-From-Cache') === '1' ? 'cache' : 'network')

  const json = await res.json()

  if (json.status === 'error') {
    throwApiError(json)
  }
  return json.data
}

/**
 * POST generico contra el backend.
 * Devuelve null si la API no esta habilitada (modo mock).
 *
 * @param {string} action - accion del backend (ej: 'guardarAsistencia')
 * @param {Object} [body] - payload; el token de sesion se inyecta automaticamente
 * @returns {Promise<*>} campo data de la respuesta
 */
export async function apiPost(action, body = {}) {
  if (!isApiEnabled()) return null

  // Auth exclusiva por token de sesion; el api_key compartido fue retirado.
  const token = getToken()

  // Nota: usamos text/plain en lugar de application/json a proposito.
  // Apps Script lee el body desde e.postData.contents independientemente del
  // Content-Type, y text/plain evita el preflight CORS OPTIONS que iOS Safari
  // (sobre todo versiones viejas) no tolera bien con Apps Script Web Apps.
  const res = await fetchWithTimeout(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action,
      ...(token ? { token } : {}),
      ...body
    })
  })
  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status}: ${res.statusText}`)
  }
  const json = await res.json()

  if (json.status === 'error') {
    throwApiError(json)
  }
  return json.data
}
