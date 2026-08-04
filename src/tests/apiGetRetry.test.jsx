/* eslint-disable no-undef */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mismo patron de mockeo que src/tests/api.test.jsx
vi.mock('../config/api', () => ({
  API_URL: 'https://script.google.com/test',
  isApiEnabled: vi.fn(() => true),
}))

import { getConvocatorias } from '../services/api'
import { isApiEnabled } from '../config/api'

/** Respuesta 404 con cuerpo HTML (pagina de error del borde de Google), no JSON. */
function htmlErrorResponse() {
  return {
    ok: false,
    status: 404,
    statusText: 'Not Found',
    headers: { get: () => null },
    json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')),
  }
}

function okResponse(data = []) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => null },
    json: () => Promise.resolve({ status: 'ok', data }),
  }
}

describe('apiGet -- reintento automatico unico (borde de red de Google)', () => {
  beforeEach(() => {
    isApiEnabled.mockReturnValue(true)
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reintenta una vez ante un 404 con cuerpo HTML y devuelve el resultado del segundo intento', async () => {
    global.fetch
      .mockResolvedValueOnce(htmlErrorResponse())
      .mockResolvedValueOnce(okResponse([{ id: 'conv-1' }]))

    const result = await getConvocatorias()

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(result).toEqual([{ id: 'conv-1' }])
  })

  it('no reintenta un error de negocio (HTTP 200 con status "error")', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => null },
      json: () => Promise.resolve({ status: 'error', error: 'No autorizado' }),
    })

    await expect(getConvocatorias()).rejects.toThrow('No autorizado')
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('reintenta ante un timeout (AbortError) en el primer intento y se recupera en el segundo', async () => {
    global.fetch
      .mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'))
      .mockResolvedValueOnce(okResponse([{ id: 'conv-1' }]))

    const result = await getConvocatorias()

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(result).toEqual([{ id: 'conv-1' }])
  })

  it('si el segundo intento tambien falla, lanza el error del segundo intento tal cual', async () => {
    global.fetch
      .mockResolvedValueOnce(htmlErrorResponse())
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: () => null },
        json: () => Promise.resolve({}),
      })

    await expect(getConvocatorias()).rejects.toThrow('Error HTTP 500: Internal Server Error')
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
