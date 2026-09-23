import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

/**
 * Tests de `opsDevEmail_()` (apps-script/OperacionesBase.js).
 *
 * Apps Script no tiene modulos: todo vive en un scope global compartido. Aqui
 * se carga el archivo real en un contexto de `vm` con stubs minimos de las
 * APIs de Google, para probar la funcion tal cual se ejecuta en produccion.
 *
 * Por que existe: la version anterior calculaba el email en un IIFE de nivel
 * superior. Eso convertia cualquier fallo de PropertiesService en una caida
 * del Web App entero, y su fallback ('dev@novattend.local', TLD reservado)
 * hacia que las alertas se perdieran en silencio durante semanas.
 */

const AQUI = dirname(fileURLToPath(import.meta.url))
const FUENTE = readFileSync(resolve(AQUI, '../../apps-script/OperacionesBase.js'), 'utf8')

/**
 * Carga OperacionesBase.js en un contexto aislado.
 * @param {object} stubs - Sobrescrituras de las APIs de Google.
 * @returns {object} El contexto, con las funciones del archivo ya definidas.
 */
function cargar(stubs = {}) {
  const contexto = {
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }),
    },
    Session: {
      getEffectiveUser: () => ({ getEmail: () => '' }),
      getScriptTimeZone: () => 'Europe/Madrid',
    },
    MailApp: { sendEmail: () => {} },
    Utilities: { formatDate: () => '2026-09-23' },
    LockService: { getScriptLock: () => ({}) },
    writeLog: () => {},
    esEmailValido_: () => true,
    escaparHtml_: (s) => s,
    ...stubs,
  }
  vm.createContext(contexto)
  vm.runInContext(FUENTE, contexto)
  return contexto
}

/** Atajo: stub de PropertiesService que devuelve `valor` para cualquier clave. */
const conProperty = (valor) => ({
  PropertiesService: {
    getScriptProperties: () => ({ getProperty: () => valor, setProperty: () => {} }),
  },
})

describe('opsDevEmail_', () => {
  // El fallo que costo 7 semanas de ceguera: leer la property al CARGAR el
  // proyecto. Una excepcion ahi ocurre antes de doGet/doPost y tumba login,
  // asistencia y dashboard, no solo el correo.
  it('no toca PropertiesService al cargar el archivo', () => {
    const getProperty = vi.fn(() => 'dev@example.com')
    cargar({
      PropertiesService: { getScriptProperties: () => ({ getProperty, setProperty: () => {} }) },
    })

    expect(getProperty).not.toHaveBeenCalled()
  })

  it('cargar el archivo no lanza aunque PropertiesService falle', () => {
    expect(() =>
      cargar({
        PropertiesService: {
          getScriptProperties: () => {
            throw new Error('Service invoked too many times')
          },
        },
      })
    ).not.toThrow()
  })

  it('devuelve la Script Property, recortada', () => {
    const ctx = cargar(conProperty('  dev@example.com  '))
    expect(ctx.opsDevEmail_()).toBe('dev@example.com')
  })

  it('memoiza: solo lee la property una vez', () => {
    const getProperty = vi.fn(() => 'dev@example.com')
    const ctx = cargar({
      PropertiesService: { getScriptProperties: () => ({ getProperty, setProperty: () => {} }) },
    })

    ctx.opsDevEmail_()
    ctx.opsDevEmail_()
    ctx.opsDevEmail_()

    expect(getProperty).toHaveBeenCalledTimes(1)
  })

  it('sin property cae al dueno del script, que si es una direccion entregable', () => {
    const ctx = cargar({
      ...conProperty(null),
      Session: {
        getEffectiveUser: () => ({ getEmail: () => 'duenyo@example.com' }),
        getScriptTimeZone: () => 'Europe/Madrid',
      },
    })

    const email = ctx.opsDevEmail_()
    expect(email).toBe('duenyo@example.com')
    // Nunca mas un TLD reservado: '.local' no es enrutable.
    expect(email).not.toMatch(/\.local$/)
  })

  it('si PropertiesService lanza, cae al dueno en vez de propagar', () => {
    const ctx = cargar({
      PropertiesService: {
        getScriptProperties: () => {
          throw new Error('Service invoked too many times')
        },
      },
      Session: {
        getEffectiveUser: () => ({ getEmail: () => 'duenyo@example.com' }),
        getScriptTimeZone: () => 'Europe/Madrid',
      },
    })

    expect(ctx.opsDevEmail_()).toBe('duenyo@example.com')
  })

  it('sin ninguna fuente devuelve cadena vacia y no cachea el fallo', () => {
    const getEmail = vi.fn(() => '')
    const ctx = cargar({
      ...conProperty(''),
      Session: { getEffectiveUser: () => ({ getEmail }), getScriptTimeZone: () => 'Europe/Madrid' },
    })

    expect(ctx.opsDevEmail_()).toBe('')
    ctx.opsDevEmail_()
    // Se reintenta: un fallo transitorio no debe quedar congelado en cache.
    expect(getEmail).toHaveBeenCalledTimes(2)
  })
})
