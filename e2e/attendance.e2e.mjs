/**
 * E2E NovAttend con "usuario fantasma" (profesor de prueba dedicado).
 *
 * Login y getConvocatorias van al backend REAL (Google Apps Script).
 * getAlumnos/getAsistencia se interceptan con datos falsos y el POST de
 * guardarAsistencia/justificarFalta se ABORTA en el navegador: cero
 * escrituras llegan a produccion. Ver e2e/README.md para el procedimiento
 * completo (crear el usuario fantasma, ejecutar, limpiar).
 *
 * Variables de entorno requeridas (sin valores por defecto para credenciales):
 *   E2E_BASE_URL  - URL de la app (default: http://localhost:5173)
 *   E2E_USER      - usuario del profesor fantasma
 *   E2E_PASS      - password en claro del profesor fantasma
 */
import { chromium } from 'playwright'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173'
const USER = process.env.E2E_USER
const PASS = process.env.E2E_PASS

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

const FAKE_STUDENTS = (grupo) =>
  Array.from({ length: 4 }, (_, i) => ({
    id: `alu-e2e-${grupo}-${i + 1}`,
    nombre: `Alumno E2E ${grupo}-${i + 1}`,
    grupo,
  }))

let alumnoDetailCalls = 0

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 400, height: 850 } })
  const page = await context.newPage()

  // Silencia el modal "What's New" (bloquearia todos los clicks del test)
  await page.addInitScript(() => {
    try { localStorage.setItem('novattend_whatsnew_justificar_v1', '1') } catch { /* noop */ }
  })

  // Intercepta SOLO lecturas de alumnos/asistencia y el POST de guardado.
  // login y getConvocatorias pasan al backend real (route.fallback).
  await context.route('**://script.google.com/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const action = url.searchParams.get('action')

    if (req.method() === 'GET' && action === 'getAlumnos') {
      const grupo = url.searchParams.get('grupo') || 'G1'
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'ok', data: FAKE_STUDENTS(grupo) }) })
    }
    if (req.method() === 'GET' && action === 'getAsistencia') {
      if (url.searchParams.get('alumno_id')) {
        alumnoDetailCalls++
        return route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok', data: [
            { fecha: '2026-07-01', presente: false, justificada: false, motivo: '' },
            { fecha: '2026-07-08', presente: false, justificada: true, motivo: 'Enfermedad' },
          ] }),
        })
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'ok', data: [] }) })
    }
    // Red de seguridad: ningun POST guardarAsistencia/justificarFalta llega a produccion.
    if (req.method() === 'POST') {
      const body = (() => { try { return JSON.parse(req.postData() || '{}') } catch { return {} } })()
      if (body.action === 'guardarAsistencia' || body.action === 'justificarFalta') {
        console.log(`  [bloqueado POST ${body.action} — no llega a produccion]`)
        return route.abort('failed')
      }
    }
    return route.fallback()
  })

  // ---- 1. Sin sesion: /attendance debe acabar en login ----
  await page.goto(`${BASE}/attendance`)
  await page.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {})
  const loginVisible = await page.getByPlaceholder('Usuario').waitFor({ timeout: 10000 }).then(() => true).catch(() => false)
  check('Sin sesion, /attendance redirige a login', page.url() === `${BASE}/` && loginVisible, `url=${page.url()}`)

  // ---- 2. Login real contra el backend ----
  await page.getByPlaceholder('Usuario').fill(USER)
  await page.getByPlaceholder('Contraseña').fill(PASS)
  await page.getByRole('button', { name: /entrar|acceder|iniciar/i }).first().click()
  await page.waitForURL(/\/(attendance|convocatorias)/, { timeout: 30000 })
  if (page.url().includes('/convocatorias')) {
    // 2+ convocatorias activas: elegir la primera
    await page.locator('button, [role="button"]').filter({ hasText: /./ }).first().click()
    await page.waitForURL(/\/attendance/, { timeout: 15000 })
  }
  check('Login real fantasma llega a /attendance', page.url().includes('/attendance'), `url=${page.url()}`)


  // ---- 3. Alumnos (mock) visibles ----
  const firstRow = page.getByLabel(/Asistencia de Alumno E2E G1-1/)
  await firstRow.waitFor({ timeout: 15000 })
  check('Lista de alumnos renderiza', true)

  // ---- 4. Popup detalle: faltas visibles + cache (2a apertura sin llamada) ----
  await page.getByLabel('Ver detalle de Alumno E2E G1-1').click()
  await page.getByText(/Enfermedad/).waitFor({ timeout: 15000 })
  const callsAfterFirst = alumnoDetailCalls
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await page.getByLabel('Ver detalle de Alumno E2E G1-1').click()
  await page.getByText(/Enfermedad/).waitFor({ timeout: 5000 })
  await page.waitForTimeout(600)
  check('Popup: faltas de la API visibles (justificada incluida)', true)
  check('Popup: 2a apertura usa cache (0 llamadas nuevas)', alumnoDetailCalls === callsAfterFirst, `llamadas=${callsAfterFirst}->${alumnoDetailCalls}`)
  await page.keyboard.press('Escape')

  // ---- 5. Marcas se conservan al cambiar de grupo ----
  await page.getByLabel(/Asistencia de Alumno E2E G1-1: ausente/).click()
  await page.getByLabel(/Asistencia de Alumno E2E G1-2: ausente/).click()
  await page.getByRole('tab', { name: /Grupo G?2/ }).click()
  await page.getByLabel(/Asistencia de Alumno E2E G2-1/).waitFor({ timeout: 10000 })
  await page.getByRole('tab', { name: /Grupo G?1/ }).click()
  await page.getByLabel(/Asistencia de Alumno E2E G1-1: presente/).waitFor({ timeout: 10000 })
  const kept2 = await page.getByLabel(/Asistencia de Alumno E2E G1-2: presente/).isVisible()
  check('Marcas conservadas al cambiar de tab y volver', kept2)

  // ---- 6. Guardado OFFLINE -> encolado, sin exito falso ----
  await context.setOffline(true)
  await page.getByRole('button', { name: /guardar/i }).click()
  await page.waitForURL(/\/saved/, { timeout: 20000 })
  const queuedText = await page.getByText(/pendiente de sincronizar/i).isVisible().catch(() => false)
  check('Offline: guardado queda "pendiente de sincronizar" (no exito falso)', queuedText, `url=${page.url()}`)

  // Reconectar y volver a una pagina fresca del mismo origen antes de tocar
  // IndexedDB. Es seguro: el route de arriba ABORTA cualquier POST de
  // guardarAsistencia, asi que un replay al reconectar nunca sale del navegador.
  await context.setOffline(false)
  await page.goto(BASE, { waitUntil: 'load' })
  const countPending = () => page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('novattend-offline')
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('pending-saves')) return resolve(-1)
      const tx = db.transaction('pending-saves', 'readonly')
      const count = tx.objectStore('pending-saves').count()
      count.onsuccess = () => resolve(count.result)
      count.onerror = () => resolve(-2)
    }
    req.onerror = () => resolve(-3)
  }))
  const pendingCount = await countPending().catch(() => page.waitForTimeout(2000).then(countPending))
  check('Offline: 1 registro en la cola IndexedDB', pendingCount === 1, `count=${pendingCount}`)

  // Limpiar la cola ANTES de reconectar: ningun replay debe salir del navegador.
  const clearQueue = () => page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('novattend-offline')
    req.onsuccess = () => {
      const tx = req.result.transaction('pending-saves', 'readwrite')
      tx.objectStore('pending-saves').clear()
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
    }
    req.onerror = () => resolve(false)
  }))
  await clearQueue().catch(() => page.waitForTimeout(2000).then(clearQueue))

  // ---- 7. /dashboard con rol teacher -> denegado ----
  await page.goto(`${BASE}/dashboard`)
  await page.waitForTimeout(1500)
  check('Teacher no entra en /dashboard', !page.url().includes('/dashboard'), `url=${page.url()}`)

  // ---- 8. C1: sesion viva + /attendance sin convocatoria (URL directa) ----
  await page.goto(`${BASE}/attendance`)
  await page.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {})
  const mockVisible = await page.getByText(/Laura Garcia/i).isVisible().catch(() => false)
  check('C1: URL directa a /attendance con sesion NO muestra mocks y redirige', page.url() === `${BASE}/` && !mockVisible, `url=${page.url()}`)

  // ---- Limpieza en navegador ----
  await page.evaluate(() => {
    sessionStorage.clear()
    indexedDB.deleteDatabase('novattend-offline')
  })
  await browser.close()

  const failed = results.filter((r) => !r.ok)
  console.log(`\nRESUMEN: ${results.length - failed.length}/${results.length} PASS`)
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => { console.error('ERROR FATAL:', e.message); process.exit(2) })
