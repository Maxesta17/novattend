import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- Fake minimo de IndexedDB (jsdom no lo trae; sin dependencias nuevas) ---
// Soporta solo lo que usa offlineQueue: open/onupgradeneeded, createObjectStore,
// transaction, objectStore, getAll, add (autoincrement), delete, count.
function createFakeIndexedDB() {
  const stores = {}
  let opened = false

  const makeRequest = (executor) => {
    const req = { onsuccess: null, onerror: null, result: undefined, error: null }
    queueMicrotask(() => {
      try {
        req.result = executor()
        if (req.onsuccess) req.onsuccess({ target: req })
      } catch (e) {
        req.error = e
        if (req.onerror) req.onerror({ target: req })
      }
    })
    return req
  }

  const db = {
    objectStoreNames: { contains: (name) => name in stores },
    createObjectStore(name) {
      stores[name] = { data: new Map(), nextId: 1 }
    },
    transaction(name) {
      const tx = { oncomplete: null, onerror: null, onabort: null, error: null }
      tx.objectStore = () => {
        const s = stores[name]
        return {
          getAll: () => makeRequest(() => Array.from(s.data.values())),
          add: (value) => makeRequest(() => {
            const id = s.nextId++
            s.data.set(id, { ...value, id })
            return id
          }),
          delete: (id) => makeRequest(() => { s.data.delete(id) }),
          count: () => makeRequest(() => s.data.size),
        }
      }
      // oncomplete se dispara en macrotask: despues de todos los requests (microtasks)
      setTimeout(() => { if (tx.oncomplete) tx.oncomplete() }, 0)
      return tx
    },
  }

  return {
    open() {
      const req = { onupgradeneeded: null, onsuccess: null, onerror: null, result: db }
      queueMicrotask(() => {
        if (!opened) {
          opened = true
          if (req.onupgradeneeded) req.onupgradeneeded({ target: req })
        }
        if (req.onsuccess) req.onsuccess({ target: req })
      })
      return req
    },
  }
}

// Payload de guardarAsistencia de prueba
const makePayload = (over = {}) => ({
  fecha: '2026-07-14',
  convocatoria_id: 'conv-1',
  profesor_id: 'prof-x',
  grupo: 'G1',
  alumnos: [{ alumno_id: 'a1', presente: true }],
  ...over,
})

let queue

describe('offlineQueue', () => {
  beforeEach(async () => {
    // Modulo fresco por test: resetea la cache de conexion y el flag replaying
    vi.resetModules()
    globalThis.indexedDB = createFakeIndexedDB()
    queue = await import('../services/offlineQueue')
  })

  afterEach(() => {
    delete globalThis.indexedDB
    vi.restoreAllMocks()
  })

  it('enqueue guarda el payload y getAll lo devuelve con id y createdAt', async () => {
    await queue.enqueue(makePayload())
    const all = await queue.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].payload.convocatoria_id).toBe('conv-1')
    expect(all[0].id).toBeDefined()
    expect(all[0].createdAt).toBeTypeOf('number')
    expect(await queue.count()).toBe(1)
  })

  it('dedupe: misma convocatoria+grupo+fecha reemplaza al pendiente (el ultimo gana)', async () => {
    await queue.enqueue(makePayload({ alumnos: [{ alumno_id: 'a1', presente: false }] }))
    await queue.enqueue(makePayload({ alumnos: [{ alumno_id: 'a1', presente: true }] }))
    const all = await queue.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].payload.alumnos[0].presente).toBe(true)
  })

  it('guardados de distinta fecha o grupo NO se pisan entre si', async () => {
    await queue.enqueue(makePayload())
    await queue.enqueue(makePayload({ fecha: '2026-07-13' }))
    await queue.enqueue(makePayload({ grupo: 'G2' }))
    expect(await queue.count()).toBe(3)
  })

  it('replayAll con exito envia cada pendiente y lo elimina de la cola', async () => {
    await queue.enqueue(makePayload())
    const sendFn = vi.fn().mockResolvedValue({ registros: 1 })
    await queue.replayAll(sendFn)
    expect(sendFn).toHaveBeenCalledTimes(1)
    expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({ convocatoria_id: 'conv-1' }))
    expect(await queue.count()).toBe(0)
  })

  it('replayAll con error de red mantiene el registro en cola (se reintentara)', async () => {
    await queue.enqueue(makePayload())
    const networkError = new Error('No hay conexión con el servidor. Comprueba tu red.', {
      cause: new TypeError('Failed to fetch'),
    })
    const sendFn = vi.fn().mockRejectedValue(networkError)
    await queue.replayAll(sendFn)
    expect(await queue.count()).toBe(1)
  })

  it('replayAll con error de negocio descarta el registro con console.warn (no cicla)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await queue.enqueue(makePayload())
    const sendFn = vi.fn().mockRejectedValue(new Error('Convocatoria no encontrada'))
    await queue.replayAll(sendFn)
    expect(await queue.count()).toBe(0)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('removeMatching purga los pendientes de la misma convocatoria+grupo+fecha', async () => {
    await queue.enqueue(makePayload())
    await queue.enqueue(makePayload({ grupo: 'G2' }))
    await queue.removeMatching(makePayload())
    const all = await queue.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].payload.grupo).toBe('G2')
  })

  it('isNetworkError: true para cause TypeError/AbortError, false para negocio', () => {
    const abortCause = new Error('timeout')
    abortCause.name = 'AbortError'
    expect(queue.isNetworkError(new Error('x', { cause: new TypeError('fail') }))).toBe(true)
    expect(queue.isNetworkError(new Error('x', { cause: abortCause }))).toBe(true)
    expect(queue.isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
    expect(queue.isNetworkError(new Error('Error de negocio'))).toBe(false)
    expect(queue.isNetworkError(null)).toBe(false)
  })

  it('sin indexedDB: getAll/count devuelven vacio y enqueue falla con error claro', async () => {
    delete globalThis.indexedDB
    vi.resetModules()
    const q = await import('../services/offlineQueue')
    expect(await q.getAll()).toEqual([])
    expect(await q.count()).toBe(0)
    await expect(q.enqueue(makePayload())).rejects.toThrow(/offline/)
  })
})
