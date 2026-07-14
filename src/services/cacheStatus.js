/**
 * Pub/sub minimo (sobre CustomEvent de window) para avisar de donde viene la
 * ultima respuesta GET pintada en la UI: red fresca o fallback de cache.
 *
 * Contrato con el Service Worker (ver src/services/api/http.js): cuando una
 * respuesta GET de la API se sirve desde Cache Storage (fallback de
 * NetworkFirst), llega con el header `X-Novattend-From-Cache: 1`. apiGet lee
 * ese header y notifica aqui; el resto de la app (useOfflineData,
 * OfflineDataBanner) solo escucha, sin acoplarse al detalle del header.
 *
 * En dev y en modo mock el Service Worker no corre, por lo que ese header
 * nunca llega y siempre se notifica 'network' (comportamiento correcto: el
 * banner de "sin conexion" no debe aparecer ahi).
 *
 * @module services/cacheStatus
 */

/** Nombre del CustomEvent despachado en window en cada respuesta GET. */
export const DATA_SOURCE_EVENT = 'api:data-source'

/**
 * Notifica el origen de la ultima respuesta GET recibida.
 * No hace nada fuera del navegador (SSR/tests sin `window`).
 *
 * @param {'cache'|'network'} source - origen de los datos: 'cache' si vino
 *   del fallback del Service Worker, 'network' si fue una respuesta fresca.
 */
export function notifyDataSource(source) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(DATA_SOURCE_EVENT, { detail: { source } }))
}

/**
 * Se suscribe a los cambios de origen de datos.
 * @param {function('cache'|'network'): void} callback - recibe el origen
 *   ('cache' o 'network') de cada notificacion.
 * @returns {function(): void} funcion para desuscribirse.
 */
export function subscribeDataSource(callback) {
  if (typeof window === 'undefined') return () => {}
  const handleEvent = (event) => callback(event.detail?.source)
  window.addEventListener(DATA_SOURCE_EVENT, handleEvent)
  return () => window.removeEventListener(DATA_SOURCE_EVENT, handleEvent)
}
