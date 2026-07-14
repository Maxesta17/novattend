/**
 * Cola offline de guardados de asistencia sobre IndexedDB nativo (sin dependencias).
 *
 * Cuando un POST de guardarAsistencia falla por red/timeout, el payload se
 * encola aqui y se reintenta al recuperar conexion (evento 'online') o al
 * arrancar la app. Solo se guarda el payload: el token de sesion se inyecta
 * en el momento del reenvio (nunca se persiste en IndexedDB).
 *
 * Registro: { id: autoincrement, payload: Object, createdAt: number }
 * Dedupe: un guardado nuevo para la misma convocatoria+grupo+fecha reemplaza
 * al pendiente anterior (el ultimo gana).
 *
 * @module services/offlineQueue
 */

const DB_NAME = 'novattend-offline'
const STORE_NAME = 'pending-saves'
const DB_VERSION = 1

/** Evento emitido en window cada vez que cambia el contenido de la cola. */
export const QUEUE_CHANGED_EVENT = 'offline-queue:changed'

let dbPromise = null
let initialized = false
let replaying = false

/** ¿Hay soporte de IndexedDB en este entorno? (jsdom no lo trae) */
function hasIndexedDB() {
  return typeof indexedDB !== 'undefined'
}

/** Abre (y cachea) la conexion a la base de datos. */
function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
  return dbPromise
}

/** Convierte un IDBRequest en promesa. */
function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Espera a que una transaccion termine (commit o error). */
function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

/** Notifica a la UI que la cola cambio (banner de pendientes). */
function emitChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT))
  }
}

/** Dos payloads apuntan al mismo guardado si coinciden convocatoria+grupo+fecha. */
function sameSaveKey(a, b) {
  return Boolean(a && b) &&
    a.convocatoria_id === b.convocatoria_id &&
    a.grupo === b.grupo &&
    a.fecha === b.fecha
}

/**
 * Detecta si un error es de red/timeout (reencolable) o de negocio (no).
 * Los errores mapeados en services/api/http.js preservan el original en `cause`:
 * TypeError = fallo de red del navegador, AbortError = timeout alcanzado.
 * @param {Error} err
 * @returns {boolean} true si es error de red/timeout
 */
export function isNetworkError(err) {
  if (!err) return false
  if (err.name === 'AbortError' || err instanceof TypeError) return true
  const cause = err.cause
  return Boolean(cause && (cause.name === 'AbortError' || cause instanceof TypeError))
}

/**
 * Encola un guardado pendiente de sincronizar.
 * Dedupe: elimina cualquier pendiente previo de la misma convocatoria+grupo+fecha.
 * @param {Object} payload - payload de guardarAsistencia (sin token)
 * @returns {Promise<void>}
 */
export async function enqueue(payload) {
  if (!hasIndexedDB()) {
    throw new Error('Este dispositivo no soporta el guardado offline.')
  }
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const existing = await requestToPromise(store.getAll())
  existing
    .filter(rec => sameSaveKey(rec.payload, payload))
    .forEach(rec => store.delete(rec.id))
  store.add({ payload, createdAt: Date.now() })
  await transactionDone(tx)
  emitChange()
}

/**
 * Devuelve todos los pendientes ordenados del mas antiguo al mas nuevo.
 * @returns {Promise<Array<{id: number, payload: Object, createdAt: number}>>}
 */
export async function getAll() {
  if (!hasIndexedDB()) return []
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const records = await requestToPromise(tx.objectStore(STORE_NAME).getAll())
  return records.sort((a, b) => a.createdAt - b.createdAt)
}

/**
 * Numero de guardados pendientes en cola.
 * @returns {Promise<number>}
 */
export async function count() {
  if (!hasIndexedDB()) return 0
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  return requestToPromise(tx.objectStore(STORE_NAME).count())
}

/**
 * Elimina un pendiente por id.
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function remove(id) {
  if (!hasIndexedDB()) return
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).delete(id)
  await transactionDone(tx)
  emitChange()
}

/**
 * Anti-pisado: tras un guardado online exitoso, purga cualquier pendiente de
 * la misma convocatoria+grupo+fecha para que un replay posterior no machaque
 * el guardado mas nuevo.
 * @param {Object} payload - payload del guardado exitoso
 * @returns {Promise<void>}
 */
export async function removeMatching(payload) {
  if (!hasIndexedDB()) return
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const existing = await requestToPromise(store.getAll())
  const matches = existing.filter(rec => sameSaveKey(rec.payload, payload))
  matches.forEach(rec => store.delete(rec.id))
  await transactionDone(tx)
  if (matches.length > 0) emitChange()
}

/**
 * Reintenta enviar todos los pendientes con sendFn (guardarAsistencia).
 * - Exito → se elimina de la cola.
 * - Error de red/timeout → sigue en cola y se corta el replay (sin red no
 *   tiene sentido seguir con el resto).
 * - Error de negocio o auth → se descarta con console.warn para no ciclar.
 * @param {function(Object): Promise<*>} sendFn - funcion de envio (recibe el payload)
 * @returns {Promise<void>}
 */
export async function replayAll(sendFn) {
  if (!hasIndexedDB() || replaying) return
  replaying = true
  try {
    const records = await getAll()
    for (const rec of records) {
      try {
        await sendFn(rec.payload)
        await remove(rec.id)
      } catch (err) {
        if (isNetworkError(err)) return // sin red: se reintentara al proximo 'online'
        console.warn('[offlineQueue] pendiente descartado (error no recuperable):', err?.message)
        await remove(rec.id)
      }
    }
  } finally {
    replaying = false
  }
}

/**
 * Inicializa la sincronizacion: replay al arrancar (si hay red) y al recuperar
 * conexion (evento 'online'). Idempotente: solo registra el listener una vez.
 * @param {function(Object): Promise<*>} sendFn - normalmente guardarAsistencia
 */
export function initOfflineSync(sendFn) {
  if (initialized || typeof window === 'undefined' || !hasIndexedDB()) return
  initialized = true
  window.addEventListener('online', () => { replayAll(sendFn).catch(() => {}) })
  if (navigator.onLine !== false) replayAll(sendFn).catch(() => {})
}
