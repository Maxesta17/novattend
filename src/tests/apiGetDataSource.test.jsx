/* eslint-disable no-undef */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mismo patron de mockeo que src/tests/api.test.jsx
vi.mock('../config/api', () => ({
  API_URL: 'https://script.google.com/test',
  isApiEnabled: vi.fn(() => true),
}))

import { getConvocatorias } from '../services/api'
import { isApiEnabled } from '../config/api'
import { DATA_SOURCE_EVENT } from '../services/cacheStatus'

/** Fabrica una Response falsa con headers.get controlable, al estilo fetch real. */
function fakeResponse({ ok = true, headers = {}, json = { status: 'ok', data: [] } } = {}) {
  return {
    ok,
    headers: { get: (name) => (name in headers ? headers[name] : null) },
    json: () => Promise.resolve(json),
  }
}

describe('apiGet -- notificacion de origen de datos (cacheStatus)', () => {
  let dataSourceHandler

  beforeEach(() => {
    isApiEnabled.mockReturnValue(true)
    global.fetch = vi.fn()
    dataSourceHandler = vi.fn()
    window.addEventListener(DATA_SOURCE_EVENT, dataSourceHandler)
  })

  afterEach(() => {
    window.removeEventListener(DATA_SOURCE_EVENT, dataSourceHandler)
    vi.restoreAllMocks()
  })

  it('con el header X-Novattend-From-Cache: 1 despacha el evento con source "cache"', async () => {
    global.fetch.mockResolvedValue(
      fakeResponse({ headers: { 'X-Novattend-From-Cache': '1' } })
    )

    await getConvocatorias()

    expect(dataSourceHandler).toHaveBeenCalledOnce()
    expect(dataSourceHandler.mock.calls[0][0].detail).toEqual({ source: 'cache' })
  })

  it('sin el header despacha el evento con source "network"', async () => {
    global.fetch.mockResolvedValue(fakeResponse())

    await getConvocatorias()

    expect(dataSourceHandler).toHaveBeenCalledOnce()
    expect(dataSourceHandler.mock.calls[0][0].detail).toEqual({ source: 'network' })
  })

  it('con el header en un valor distinto de "1" despacha source "network"', async () => {
    global.fetch.mockResolvedValue(
      fakeResponse({ headers: { 'X-Novattend-From-Cache': '0' } })
    )

    await getConvocatorias()

    expect(dataSourceHandler.mock.calls[0][0].detail).toEqual({ source: 'network' })
  })

  it('respuesta sin objeto headers (mocks que no lo definen, como en api.test.jsx) no rompe y notifica "network"', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: [] }),
    })

    await expect(getConvocatorias()).resolves.toEqual([])
    expect(dataSourceHandler.mock.calls[0][0].detail).toEqual({ source: 'network' })
  })

  it('NO notifica si la respuesta HTTP no es ok (res.ok=false)', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' })

    await expect(getConvocatorias()).rejects.toThrow('Error HTTP 500')
    expect(dataSourceHandler).not.toHaveBeenCalled()
  })

  it('con error de negocio (json.status="error") SI notifica el origen antes de lanzar -- el header es a nivel HTTP, independiente del body', async () => {
    global.fetch.mockResolvedValue(
      fakeResponse({
        headers: { 'X-Novattend-From-Cache': '1' },
        json: { status: 'error', error: 'No autorizado' },
      })
    )

    await expect(getConvocatorias()).rejects.toThrow('No autorizado')
    expect(dataSourceHandler).toHaveBeenCalledOnce()
    expect(dataSourceHandler.mock.calls[0][0].detail).toEqual({ source: 'cache' })
  })
})
