/**
 * Service worker propio de NovAttend (estrategia `injectManifest`).
 *
 * Sustituye a la generacion automatica de Workbox (`generateSW`) porque ahi
 * no hay forma de interceptar `cacheKeyWillBeUsed`: la cache runtime de la
 * API clavea por URL completa, y esa URL incluye el token de sesion como
 * query param (ver `apiGet` en `src/services/api/http.js`). Con
 * `injectManifest` este archivo se bundlea y `self.__WB_MANIFEST` se
 * sustituye en build por el manifest de precache real.
 *
 * Replica EXACTAMENTE el precache, el fallback de navegacion y las rutas de
 * Google Fonts que antes generaba el bloque `workbox` en `vite.config.js`,
 * y anade tres plugins propios a la ruta de la API (ver mas abajo): strip
 * del token en la clave de cache, guard contra errores de negocio con HTTP
 * 200, y marcado de respuestas servidas desde cache. Detalle completo del
 * problema en `docs/deuda-tecnica.md` ("Cache de API claveada por token").
 *
 * @module sw
 */

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { clientsClaim } from 'workbox-core'

// Activa el SW nuevo sin esperar a que se cierren las pestanas viejas y toma
// el control de los clientes abiertos de inmediato. Replica el
// skipWaiting/clientsClaim: true que tenia el generateSW anterior.
self.skipWaiting()
clientsClaim()

// Precachea el app shell (el manifest lo inyecta vite-plugin-pwa en build) y
// borra las caches de precache de versiones anteriores del SW.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Fallback de navegacion: cualquier ruta SPA no encontrada sirve index.html,
// salvo las rutas que empiecen por /api (denylist). Replica
// navigateFallback + navigateFallbackDenylist del generateSW anterior.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api/],
  })
)

// --- Google Fonts: mismos cacheName y expiraciones que el generateSW anterior ---
// No clavean por token, asi que no hace falta tocarlos ni migrar sus entradas.

registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-css',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
)

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-woff2',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
)

// --- API de Google Apps Script ---

/** Nombre de la cache runtime de la API (compartido por estrategia y purga). */
const API_CACHE_NAME = 'api-cache'

/**
 * Quita el query param `token` de la URL antes de usarla como clave de cache
 * (Workbox invoca esto tanto en lectura como en escritura, con `mode` 'read'
 * o 'write'). Es el fix real de la deuda tecnica documentada: antes la clave
 * de cache era la URL completa -incluido el token de sesion-, asi que:
 *   1) tras un re-login el token cambiaba y ninguna entrada previa volvia a
 *      matchear (el modo offline quedaba roto salvo dentro de la misma sesion).
 *   2) los tokens quedaban legibles en Cache Storage indefinidamente.
 *
 * Los demas parametros de negocio (action, convocatoria_id, profesor_id,
 * grupo, fecha, alumno_id) SI se mantienen en la clave: son los que
 * diferencian que consulta y que usuario esta pidiendo los datos.
 *
 * @param {{request: Request}} context - contexto de Workbox
 * @returns {string} URL normalizada a usar como clave de cache
 */
function stripTokenFromCacheKey({ request }) {
  const url = new URL(request.url)
  url.searchParams.delete('token')
  return url.toString()
}

/** Plugin Workbox: normaliza la clave de cache quitando el token. */
const tokenStripPlugin = {
  cacheKeyWillBeUsed: async (context) => stripTokenFromCacheKey(context),
}

/**
 * Reconstruye la respuesta cacheada anadiendo la cabecera
 * `X-Novattend-From-Cache: 1`, para que el frontend pueda detectar mas
 * adelante que el dato mostrado viene de cache y no de la red (pieza 2 del
 * fix propuesto en `docs/deuda-tecnica.md`: banner de "datos sin conexion").
 *
 * Las Response de Cache Storage son inmutables, asi que hay que reconstruir
 * una nueva con el mismo body/status/statusText/headers. Esta funcion SOLO
 * afecta a lo que se devuelve al llamador: la entrada guardada en cache no
 * se toca.
 *
 * @param {{cachedResponse: (Response|undefined)}} context - contexto de Workbox
 * @returns {Promise<Response|null>} respuesta marcada, o null si no habia cache
 */
async function markResponseFromCache({ cachedResponse }) {
  if (!cachedResponse) return null

  const headers = new Headers(cachedResponse.headers)
  headers.set('X-Novattend-From-Cache', '1')

  return new Response(await cachedResponse.blob(), {
    status: cachedResponse.status,
    statusText: cachedResponse.statusText,
    headers,
  })
}

/** Plugin Workbox: marca la respuesta devuelta cuando viene de cache. */
const cacheMarkerPlugin = {
  cachedResponseWillBeUsed: markResponseFromCache,
}

/**
 * Decide si una respuesta de la API merece escribirse en la cache.
 *
 * Apps Script devuelve TODOS los errores de negocio como HTTP 200 con body
 * JSON `{status:'error', ...}` -incluidos el 401 de token expirado y el 403
 * de permisos; por eso existe throwApiError en el frontend-. Sin este guard,
 * NetworkFirst cachearia ese "200 con error" y PISARIA la entrada buena de
 * la misma clave (que ya no rota al quitar el token). Escenario concreto: el
 * token expira -> getConvocatorias responde 200 {status:'error',code:401} ->
 * Workbox lo escribe en api-cache bajo la clave sin token -> machaca los
 * datos buenos -> el modo offline pasa a servir el error cacheado. La cache
 * offline quedaria inutil justo en el caso que quiere cubrir.
 *
 * Devolver null desde `cacheWillUpdate` le dice a Workbox que NO escriba
 * (la entrada buena anterior se conserva). Nota: este plugin sustituye al
 * `cacheWillUpdate` por defecto de NetworkFirst (aceptaba status 200 o 0),
 * asi que el chequeo de status pasa a ser responsabilidad nuestra.
 *
 * @param {{response: Response}} context - contexto de Workbox
 * @returns {Promise<Response|null>} la respuesta original si es cacheable, null si no
 */
async function guardApiResponse({ response }) {
  // Solo 200 reales: descarta errores HTTP y respuestas opacas (status 0),
  // cuyo body ni siquiera se puede leer para validarlo.
  if (!response.ok || response.status !== 200) return null

  try {
    // Clon para no consumir el body de la respuesta que ira a la cache.
    const json = await response.clone().json()
    // Error de negocio disfrazado de HTTP 200: no cachear.
    if (json.status === 'error') return null
  } catch {
    // Body no-JSON (p.ej. pagina HTML de error de Google): no cachear.
    return null
  }

  return response
}

/** Plugin Workbox: evita que errores de negocio con HTTP 200 envenenen la cache. */
const apiResponseGuardPlugin = {
  cacheWillUpdate: guardApiResponse,
}

registerRoute(
  /^https:\/\/script\.(google|googleusercontent)\.com\/.*/i,
  new NetworkFirst({
    cacheName: API_CACHE_NAME,
    networkTimeoutSeconds: 10,
    plugins: [
      // Orden importa: primero se normaliza la clave (token fuera); en
      // escritura el guard decide si la respuesta es cacheable (errores de
      // negocio con HTTP 200 fuera); en lectura se marca la respuesta
      // cacheada si aplica; y por ultimo expiration decide si esa respuesta
      // (ya marcada) sigue siendo valida.
      tokenStripPlugin,
      apiResponseGuardPlugin,
      cacheMarkerPlugin,
      // TTL nuevo de 7 dias (antes 3h, mitigacion temporal ya obsoleta con
      // este fix): la clave ya no rota con el token, asi que un TTL corto no
      // protege nada por ese lado. NetworkFirst siempre intenta la red
      // primero con este timeout de 10s; la entrada cacheada solo se usa sin
      // red. 7 dias cubre un fin de semana largo (viernes a lunes) sin que el
      // dato cacheado quede desactualizado indefinidamente. La cabecera
      // X-Novattend-From-Cache (arriba) permite avisar en el frontend de que
      // el dato mostrado puede no ser el mas reciente.
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  })
)

// --- Migracion one-shot: purga de entradas heredadas con token en la clave ---

/**
 * Borra de api-cache las entradas heredadas del SW anterior (generateSW),
 * cuya clave era la URL completa CON el query param `token`. Con el SW nuevo
 * esas entradas nunca vuelven a matchear (la clave de lectura ya no lleva
 * token), asi que son huerfanas que solo ocupan espacio... y lo grave: dejan
 * tokens de sesion persistidos en Cache Storage hasta que expiration o
 * maxEntries las echen (hasta 7 dias). El objetivo del fix es que NINGUNA
 * respuesta cacheada contenga el token, asi que se purgan activamente.
 *
 * Corre en cada activacion del SW; tras la primera pasada ya no queda nada
 * que borrar y el coste de iterar las claves es despreciable. El try/catch
 * es deliberadamente silencioso: una purga fallida no debe tumbar la
 * activacion del SW.
 *
 * Nota: el store de timestamps de workbox-expiration (IndexedDB) NO se toca;
 * sus entradas huerfanas se autolimpian solas y no contienen tokens.
 */
async function purgeLegacyTokenEntries() {
  try {
    const cache = await caches.open(API_CACHE_NAME)
    const requests = await cache.keys()
    await Promise.all(
      requests
        .filter((request) => new URL(request.url).searchParams.has('token'))
        .map((request) => cache.delete(request))
    )
  } catch {
    // Silencioso a proposito (ver JSDoc).
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil(purgeLegacyTokenEntries())
})
