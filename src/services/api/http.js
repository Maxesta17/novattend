/**
 * Capa base de transporte HTTP contra Google Apps Script.
 *
 * Auth por token:
 *   - apiGet: agrega token como query param si existe en sesion.
 *   - apiPost: incluye token en el body JSON si existe.
 *   - El api_key compartido fue retirado; el token de sesion es la unica via de auth.
 *
 * Robustez de red (centralizada aqui):
 *   - Timeout de 20s via AbortController en apiPost (single-shot: un POST no
 *     es idempotente y ya tiene su propia cola offline, no se reintenta aqui).
 *   - apiGet reintenta UNA vez con 12s por intento (2s de margen sobre el
 *     networkTimeoutSeconds:10 del SW en src/sw.js, para que su fallback a
 *     cache gane siempre la carrera antes de que este AbortController
 *     aborte). Presupuesto total 24,5s (12s + 0,5s + 12s). Cubre timeout,
 *     red caida, 5xx, o 404/403 con cuerpo HTML del borde de Google.
 *   - Errores crudos del navegador ("Failed to fetch", AbortError) se
 *     traducen a espanol preservando la causa original (cause). Los errores
 *     de negocio del backend (ya en espanol) NO se tocan.
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

/** Timeout por intento de apiGet (ms). DEBE superar networkTimeoutSeconds del
 * SW (10s, src/sw.js) o la pagina aborta antes de recibir el fallback a cache. */
const ATTEMPT_TIMEOUT_MS = 12000

/** Espera fija entre el primer y el segundo (unico) intento de apiGet (ms). */
const RETRY_DELAY_MS = 500

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
 * @param {number} [timeoutMs] - timeout de este intento. Por defecto el
 *   presupuesto de 20s de apiPost; apiGet lo sobreescribe con ATTEMPT_TIMEOUT_MS.
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err) {
    throw mapNetworkError(err)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Un unico intento de GET con el timeout acortado de apiGet. Si la respuesta
 * HTTP no es ok, lanza un error con `status` y `response` adjuntos para que
 * getWithRetry pueda decidir si merece la pena reintentar.
 *
 * @param {string} url
 * @returns {Promise<Response>}
 */
async function attemptGet(url) {
  const res = await fetchWithTimeout(url, {}, ATTEMPT_TIMEOUT_MS)
  if (!res.ok) {
    const err = new Error(`Error HTTP ${res.status}: ${res.statusText}`)
    err.status = res.status
    err.response = res
    throw err
  }
  return res
}

/**
 * True si el cuerpo de la respuesta NO es JSON parseable. Se usa para
 * distinguir un 404/403 de negocio real (JSON) de la pagina de error HTML
 * que sirve el borde de script.googleusercontent.com (falso 404/403).
 *
 * @param {Response} res
 * @returns {Promise<boolean>}
 */
async function isBodyNotJson(res) {
  try {
    await res.json()
    return false
  } catch {
    return true
  }
}

/**
 * Decide si un fallo del primer intento de apiGet merece un reintento:
 * timeout, fallo de red, 5xx del backend, o 404/403 con cuerpo HTML (borde
 * de Google, no un error de negocio nuestro). Los errores de negocio (HTTP
 * 200 con json.status==='error') nunca llegan aqui: se detectan despues.
 *
 * @param {Error} err - error lanzado por attemptGet
 * @returns {Promise<boolean>}
 */
async function isRetryableGetError(err) {
  if (err?.cause?.name === 'AbortError') return true
  if (err?.cause instanceof TypeError) return true
  const status = err?.status
  if (typeof status !== 'number') return false
  if (status >= 500) return true
  if (status === 404 || status === 403) return isBodyNotJson(err.response)
  return false
}

/** Promesa que se resuelve tras `ms` milisegundos. */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * GET con un unico reintento automatico. apiPost nunca pasa por aqui: no es
 * idempotente (repetirlo pagaria PBKDF2 dos veces en login, por ejemplo) y
 * guardarAsistencia ya tiene su propia cola offline (offlineQueue.js).
 *
 * @param {string} url
 * @returns {Promise<Response>}
 */
async function getWithRetry(url) {
  try {
    return await attemptGet(url)
  } catch (err) {
    if (!(await isRetryableGetError(err))) throw err
    await delay(RETRY_DELAY_MS)
    return attemptGet(url)
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

  const res = await getWithRetry(url.toString())

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
