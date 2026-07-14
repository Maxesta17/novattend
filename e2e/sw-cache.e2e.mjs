/**
 * E2E NovAttend — cache del Service Worker (api-cache) sobrevive a un
 * re-login con token distinto y sirve datos offline.
 *
 * SOLO tiene sentido contra el BUILD REAL (`npm run build` + `npm run
 * preview`): el Service Worker propio (src/sw.js, estrategia injectManifest)
 * no corre en `npm run dev`. Este script asume que el preview YA esta arriba
 * en E2E_BASE_URL (por defecto http://localhost:4173) -- no lo levanta ni lo
 * mata, igual que attendance.e2e.mjs asume que `npm run dev` ya esta arriba.
 * Ver e2e/README.md para el procedimiento completo.
 *
 * Cubre (ver README para el detalle punto por punto):
 *   1. El Service Worker controla la pagina antes de loguear.
 *   2. Login real -> getConvocatorias queda en 'api-cache' SIN el query
 *      param `token` (cacheKeyWillBeUsed lo quita en src/sw.js).
 *   3. Re-login real (token B != token A) -> la MISMA entrada de cache sigue
 *      siendo valida: la clave nunca incluyo el token de sesion.
 *   4. Offline: la app sigue pintando datos (sin error de red) y muestra el
 *      banner "Datos sin conexion".
 *   5. Prueba directa: un fetch con un token FABRICADO (nunca emitido) igual
 *      recibe la respuesta cacheada (X-Novattend-From-Cache: 1) -- prueba
 *      inequivoca de que la clave de cache ignora el token por completo.
 *   6. Al terminar, ninguna clave de 'api-cache' contiene el query param
 *      token (ni el valor de A ni el de B).
 *
 * Red de seguridad: identica en espiritu a attendance.e2e.mjs. Login es la
 * UNICA accion de escritura permitida contra script.google(usercontent).com;
 * cualquier otro POST (guardarAsistencia, justificarFalta, o cualquiera que
 * no sea login) se ABORTA en el navegador antes de salir. Los GET nunca se
 * tocan (solo lectura, incluye getAlumnos/getAsistencia del fantasma, que no
 * tiene alumnos propios).
 *
 * Variables de entorno requeridas (sin valores por defecto para credenciales):
 *   E2E_BASE_URL  - URL del preview (default: http://localhost:4173)
 *   E2E_USER      - usuario del profesor fantasma
 *   E2E_PASS      - password en claro del profesor fantasma
 */
import { chromium } from 'playwright'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:4173'
const USER = process.env.E2E_USER
const PASS = process.env.E2E_PASS
const API_CACHE_NAME = 'api-cache'

if (!USER || !PASS) {
  console.error(
    'ERROR: faltan credenciales. Define E2E_USER y E2E_PASS (usuario fantasma) ' +
    'como variables de entorno antes de ejecutar. Ver e2e/README.md.'
  )
  process.exit(2)
}

const results = []
function check(name, ok, extra = '') {
  results.push({ name, ok, extra })
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}${extra ? ' | ' + extra : ''}`)
}

/** Oculta el valor de `token=` en una URL para no volcar credenciales completas al log. */
function redact(url) {
  return url.replace(/([?&]token=)[^&]*/gi, '$1[REDACTED]')
}

/** Version corta de un token para comparar visualmente en logs sin exponerlo entero. */
function shortToken(t) {
  return t ? `${t.slice(0, 10)}…(${t.length}c)` : 'null'
}

/**
 * Red de seguridad (mismo espiritu que attendance.e2e.mjs): cualquier POST
 * cuyo `action` no sea 'login' se ABORTA en el navegador antes de salir hacia
 * script.google(usercontent).com. Los GET pasan sin tocar (solo lectura).
 *
 * IMPORTANTE (verificado en este repo con Playwright 1.61.1): context.route
 * intercepta tanto los fetch de la pagina como los fetch INTERNOS que
 * dispara el propio Service Worker al resolver su estrategia NetworkFirst --
 * esta misma red cubre ambos caminos, no hace falta duplicarla.
 */
async function installSafetyNet(context) {
  await context.route('**://script.google*.com/**', async (route) => {
    const req = route.request()
    if (req.method() === 'POST') {
      const body = (() => { try { return JSON.parse(req.postData() || '{}') } catch { return {} } })()
      if (body.action !== 'login') {
        console.log(`  [bloqueado POST ${body.action || '(sin action)'} — no llega a produccion]`)
        return route.abort('failed')
      }
    }
    return route.fallback()
  })
}

/** Login por UI con USER/PASS; sigue el selector de convocatoria si hace falta. Devuelve la URL final. */
async function loginFlow(page) {
  await page.getByPlaceholder('Usuario').fill(USER)
  await page.getByPlaceholder('Contraseña').fill(PASS)
  await page.getByRole('button', { name: /entrar|acceder|iniciar/i }).first().click()
  await page.waitForURL(/\/(attendance|convocatorias)/, { timeout: 30000 })
  if (page.url().includes('/convocatorias')) {
    // 2+ convocatorias activas: elegir la primera para llegar a /attendance.
    await page.locator('button, [role="button"]').filter({ hasText: /./ }).first().click()
    await page.waitForURL(/\/attendance/, { timeout: 15000 })
  }
  return page.url()
}

/** Lee el token de sessionStorage.user (null si no hay sesion o no parsea). */
async function readToken(page) {
  return page.evaluate(() => {
    try { return JSON.parse(sessionStorage.getItem('user'))?.token ?? null } catch { return null }
  })
}

/**
 * Busca en 'api-cache' entradas cuya URL contenga TODOS los fragmentos dados.
 * Acepta un string ('getConvocatorias') o un array de fragmentos
 * (['action=getAlumnos', 'grupo=G1']) — importante para no confundir la carga
 * principal de G1 con las entradas del prefetch de G2-G4.
 */
async function findCacheEntries(page, fragments) {
  const parts = Array.isArray(fragments) ? fragments : [`action=${fragments}`]
  return page.evaluate(async ({ parts, cacheName }) => {
    if (!('caches' in window)) return { urls: [] }
    const cache = await caches.open(cacheName)
    const requests = await cache.keys()
    const urls = requests.map((r) => r.url).filter((u) => parts.every((p) => u.includes(p)))
    return { urls }
  }, { parts, cacheName: API_CACHE_NAME })
}

/**
 * Reintenta findCacheEntries hasta que aparezca al menos una entrada (la
 * escritura en cache es asincrona). Los retries por defecto aguantan el cold
 * start de Apps Script (~15-20s la primera peticion del dia): cortar la red
 * con una llamada aun en vuelo hace que esa respuesta nunca llegue a la cache
 * y el offline posterior falle por una carrera del TEST, no del SW.
 */
async function waitForCacheEntry(page, fragments, { retries = 40, delayMs = 500 } = {}) {
  let last = { urls: [] }
  for (let i = 0; i < retries; i++) {
    last = await findCacheEntries(page, fragments)
    if (last.urls.length > 0) return last
    await page.waitForTimeout(delayMs)
  }
  return last
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 400, height: 850 } })
  const page = await context.newPage()

  // Silencia el modal "What's New" (bloquearia los clicks del login).
  await page.addInitScript(() => {
    try { localStorage.setItem('novattend_whatsnew_justificar_v1', '1') } catch { /* noop */ }
  })

  await installSafetyNet(context)

  let tokenA = null
  let tokenB = null

  try {
    // ---- b. Contexto listo. Ir a BASE y esperar que el SW controle la pagina ----
    await page.goto(BASE, { waitUntil: 'load' })
    let swReady = false
    try {
      await page.waitForFunction(async () => {
        if (!('serviceWorker' in navigator)) return false
        await navigator.serviceWorker.ready
        return Boolean(navigator.serviceWorker.controller)
      }, null, { timeout: 20000 })
      swReady = true
    } catch { /* swReady queda false, se reporta abajo */ }
    check('Service Worker activo y controlando la pagina', swReady)

    if (!swReady) {
      // Sin SW controlando no hay nada que cachear: cortar aqui.
      throw new Error('El Service Worker no llego a controlar la pagina a tiempo (¿preview corriendo con el build actual?)')
    }

    // ---- c. LOGIN REAL -> token A ----
    const urlAfterLoginA = await loginFlow(page)
    check('Login real fantasma llega a /attendance', urlAfterLoginA.includes('/attendance'), `url=${urlAfterLoginA}`)

    tokenA = await readToken(page)
    check('Token A capturado tras login', Boolean(tokenA), shortToken(tokenA))

    // ---- d. getConvocatorias queda cacheado SIN token ----
    const cacheAfterA = await waitForCacheEntry(page, 'getConvocatorias')
    const cacheAfterAOk = cacheAfterA.urls.length > 0 && cacheAfterA.urls.every((u) => !u.includes('token='))
    check(
      "api-cache tiene entrada getConvocatorias SIN token= tras login A",
      cacheAfterAOk,
      `urls=${JSON.stringify(cacheAfterA.urls.map(redact))}`
    )

    // ---- e. RE-LOGIN: logout (sessionStorage.clear + reload) y login de nuevo -> token B ----
    await page.evaluate(() => sessionStorage.clear())
    await page.reload({ waitUntil: 'load' })
    await page.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {})
    const backAtLogin = await page.getByPlaceholder('Usuario').waitFor({ timeout: 10000 }).then(() => true).catch(() => false)
    check('Logout (sessionStorage.clear) vuelve a la pantalla de login', backAtLogin, `url=${page.url()}`)

    const urlAfterLoginB = await loginFlow(page)
    check('Re-login real fantasma llega a /attendance', urlAfterLoginB.includes('/attendance'), `url=${urlAfterLoginB}`)

    tokenB = await readToken(page)
    check(
      'Token B distinto de token A (el backend firma exp nuevo)',
      Boolean(tokenB) && tokenB !== tokenA,
      `A=${shortToken(tokenA)} B=${shortToken(tokenB)}`
    )

    const cacheAfterB = await waitForCacheEntry(page, 'getConvocatorias')
    const cacheAfterBOk = cacheAfterB.urls.length > 0 && cacheAfterB.urls.every((u) => !u.includes('token='))
    check(
      "api-cache sigue teniendo getConvocatorias SIN token= tras re-login (token B)",
      cacheAfterBOk,
      `urls=${JSON.stringify(cacheAfterB.urls.map(redact))}`
    )

    // AttendancePage dispara getAlumnos de G1 y getAsistencia de G1 al montar,
    // y en paralelo el prefetch de G2-G4. Si se corta la red antes de que las
    // DOS llamadas de G1 terminen de escribir en cache, el reload offline de
    // mas abajo fallaria por una carrera del TEST (llamada a mitad de vuelo),
    // no por un fallo real de la cache del SW. OJO: hay que esperar la clave
    // EXACTA de G1 — un filtro por action a secas lo satisface el prefetch de
    // G2-G4 antes de que G1 (que paga el cold start del backend) complete.
    const alumnosG1 = await waitForCacheEntry(page, ['action=getAlumnos', 'grupo=G1'])
    const asistenciaG1 = await waitForCacheEntry(page, ['action=getAsistencia', 'grupo=G1'])
    check(
      'api-cache tiene getAlumnos y getAsistencia de G1 antes del corte de red',
      alumnosG1.urls.length > 0 && asistenciaG1.urls.length > 0,
      `alumnosG1=${alumnosG1.urls.length} asistenciaG1=${asistenciaG1.urls.length}`
    )

    // ---- f. OFFLINE ----
    await context.setOffline(true)

    // Un reload real de /attendance re-monta useStudents desde cero: su cache
    // en memoria (useRef) se reinicia y vuelve a pedir getAlumnos/getAsistencia
    // por red -- mismo mecanismo de SW/api-cache que getConvocatorias (mismo
    // NetworkFirst, mismos plugins). Sirve como prueba "de aplicacion real"
    // de que offline pinta datos. Se comprueba primero que el reload no nos
    // saque de /attendance: el location.state de React Router viaja en
    // history.state, que el navegador conserva entre reloads de la MISMA
    // entrada de historial (a diferencia de una navegacion nueva a la URL).
    await page.reload({ waitUntil: 'load' }).catch(() => {})
    await page.waitForTimeout(1200)
    const stayedOnAttendance = page.url().includes('/attendance')
    check('Reload offline en /attendance conserva el location.state (no rebota a login)', stayedOnAttendance, `url=${page.url()}`)

    if (stayedOnAttendance) {
      const headingVisible = await page.getByText('Alumnos · G1').first()
        .waitFor({ timeout: 10000, state: 'visible' }).then(() => true).catch(() => false)
      const errorBannerVisible = await page.getByText('No se pudo cargar la asistencia').isVisible().catch(() => false)
      check(
        'Offline: la pagina pinta (sin error de red) usando datos de cache',
        headingVisible && !errorBannerVisible,
        `heading=${headingVisible} errorBanner=${errorBannerVisible}`
      )

      const bannerVisible = await page.getByRole('status').filter({ hasText: /Datos sin conexión/i })
        .first().waitFor({ timeout: 10000, state: 'visible' }).then(() => true).catch(() => false)
      check('Offline: banner "Datos sin conexión" visible', bannerVisible)
    } else {
      console.log('  [aviso] el reload offline no se quedo en /attendance: se omiten las 2 comprobaciones de UI de esta seccion. La prueba directa de fetch (siguiente) sigue cubriendo el mecanismo de cache igualmente.')
    }

    // Prueba directa (independiente de la UI/routing): reusa una URL YA
    // cacheada de getConvocatorias, le pone un token FABRICADO que nunca
    // existio, y hace fetch() en el propio contexto de la pagina (pasa por
    // el mismo Service Worker que cualquier fetch de la app). Si el 200 con
    // X-Novattend-From-Cache:1 llega igual, la clave de cache ignora el
    // token por completo -- exactamente lo que arregla esta rama.
    const referenceUrl = cacheAfterB.urls[0] || cacheAfterA.urls[0]
    if (!referenceUrl) {
      check('Offline: fetch con token fabricado sirve desde cache (X-Novattend-From-Cache: 1)', false, 'sin URL de referencia en cache (ver checks anteriores)')
    } else {
      const probe = await page.evaluate(async (url) => {
        const u = new URL(url)
        u.searchParams.set('token', 'token-fabricado-e2e-nunca-emitido-000')
        try {
          const res = await fetch(u.toString())
          let json = null
          try { json = await res.json() } catch { /* body no-JSON */ }
          return {
            ok: true,
            status: res.status,
            fromCache: res.headers.get('X-Novattend-From-Cache'),
            dataOk: Boolean(json && json.status === 'ok'),
          }
        } catch (err) {
          return { ok: false, error: String(err) }
        }
      }, referenceUrl)
      check(
        'Offline: fetch con token fabricado sirve desde cache (X-Novattend-From-Cache: 1)',
        probe.ok && probe.status === 200 && probe.fromCache === '1' && probe.dataOk,
        JSON.stringify(probe)
      )
    }

    // ---- g. Dump final: ninguna clave de api-cache contiene token= ----
    const finalUrls = await page.evaluate(async (cacheName) => {
      const cache = await caches.open(cacheName)
      const requests = await cache.keys()
      return requests.map((r) => r.url)
    }, API_CACHE_NAME)
    const leaked = finalUrls.filter((u) => u.includes('token='))
    check(
      "Dump final api-cache: ninguna clave contiene token=",
      leaked.length === 0,
      leaked.length ? `claves con token: ${leaked.map(redact).join(', ')}` : `total claves=${finalUrls.length}`
    )

    const leaksA = tokenA ? finalUrls.some((u) => u.includes(tokenA)) : false
    const leaksB = tokenB ? finalUrls.some((u) => u.includes(tokenB)) : false
    check('Dump final: el valor de token A no aparece en ninguna clave', !leaksA)
    check('Dump final: el valor de token B no aparece en ninguna clave', !leaksB)
  } catch (err) {
    check('Ejecucion sin excepciones inesperadas', false, err.message)
  } finally {
    // ---- h. Limpieza SIEMPRE, pase o falle ----
    await context.setOffline(false).catch(() => {})
    await page.evaluate(() => { try { sessionStorage.clear() } catch { /* noop */ } }).catch(() => {})
    await browser.close().catch(() => {})
  }

  const failed = results.filter((r) => !r.ok)
  console.log(`\nRESUMEN: ${results.length - failed.length}/${results.length} PASS`)
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => { console.error('ERROR FATAL:', e.message); process.exit(2) })
