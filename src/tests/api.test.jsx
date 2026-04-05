/* eslint-disable no-undef */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock de config/api — API habilitada con URL de prueba
vi.mock('../config/api', () => ({
  API_URL: 'https://script.google.com/test',
  API_KEY: 'test-key-uuid-fake-12345',
  isApiEnabled: vi.fn(() => true),
}))

import {
  getConvocatorias,
  getProfesores,
  getAlumnos,
  getResumen,
  getAsistenciaAlumno,
  guardarAsistencia,
  crearAlumno,
  actualizarAlumno,
} from '../services/api'
import { isApiEnabled, API_KEY } from '../config/api'

describe('api.js', () => {
  beforeEach(() => {
    isApiEnabled.mockReturnValue(true)
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // --- apiGet ---

  it('apiGet construye URL con action y params', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: [] }),
    })

    await getAlumnos('conv-1', 'prof-1', 'G1')

    const calledUrl = new URL(global.fetch.mock.calls[0][0])
    expect(calledUrl.searchParams.get('action')).toBe('getAlumnos')
    expect(calledUrl.searchParams.get('convocatoria_id')).toBe('conv-1')
    expect(calledUrl.searchParams.get('profesor_id')).toBe('prof-1')
    expect(calledUrl.searchParams.get('grupo')).toBe('G1')
  })

  it('apiGet omite params undefined/null/vacios', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: [] }),
    })

    await getAlumnos('conv-1', undefined, '')

    const calledUrl = new URL(global.fetch.mock.calls[0][0])
    expect(calledUrl.searchParams.get('convocatoria_id')).toBe('conv-1')
    expect(calledUrl.searchParams.has('profesor_id')).toBe(false)
    expect(calledUrl.searchParams.has('grupo')).toBe(false)
  })

  it('apiGet devuelve data de la respuesta', async () => {
    const mockData = [{ id: 'a1', nombre: 'Ana' }]
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: mockData }),
    })

    const result = await getConvocatorias()
    expect(result).toEqual(mockData)
  })

  it('apiGet lanza error si status es error', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'error', error: 'No autorizado' }),
    })

    await expect(getConvocatorias()).rejects.toThrow('No autorizado')
  })

  it('apiGet lanza error generico si no hay mensaje', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'error' }),
    })

    await expect(getProfesores()).rejects.toThrow('Error desconocido de la API')
  })

  it('apiGet devuelve null si API no esta habilitada', async () => {
    isApiEnabled.mockReturnValue(false)
    const result = await getConvocatorias()
    expect(result).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('apiGet lanza error descriptivo cuando res.ok es false (HTTP 500)', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })
    await expect(getConvocatorias()).rejects.toThrow('Error HTTP 500: Internal Server Error')
  })

  // --- apiPost ---

  it('apiPost envia body con action', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: { ok: true } }),
    })

    await guardarAsistencia({ fecha: '2026-03-05', convocatoria_id: 'conv-1', alumnos: [] })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://script.google.com/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(sentBody.action).toBe('guardarAsistencia')
    expect(sentBody.fecha).toBe('2026-03-05')
  })

  it('apiPost devuelve null si API no esta habilitada', async () => {
    isApiEnabled.mockReturnValue(false)
    const result = await guardarAsistencia({})
    expect(result).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('apiPost lanza error si status es error', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'error', error: 'Duplicado' }),
    })

    await expect(crearAlumno({ nombre: 'Test' })).rejects.toThrow('Duplicado')
  })

  it('apiPost lanza error descriptivo cuando res.ok es false (HTTP 403)', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    })
    await expect(guardarAsistencia({})).rejects.toThrow('Error HTTP 403: Forbidden')
  })

  // --- Endpoints especificos ---

  it('getResumen envia params correctos', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: {} }),
    })

    await getResumen('conv-1', 'prof-1', 'G2')

    const calledUrl = new URL(global.fetch.mock.calls[0][0])
    expect(calledUrl.searchParams.get('action')).toBe('getResumen')
    expect(calledUrl.searchParams.get('grupo')).toBe('G2')
  })

  it('getAsistenciaAlumno envia alumno_id', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: [] }),
    })

    await getAsistenciaAlumno('conv-1', 'alum-5')

    const calledUrl = new URL(global.fetch.mock.calls[0][0])
    expect(calledUrl.searchParams.get('action')).toBe('getAsistencia')
    expect(calledUrl.searchParams.get('alumno_id')).toBe('alum-5')
  })

  it('actualizarAlumno envia alumno_id y campos en body', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: { ok: true } }),
    })

    await actualizarAlumno('alum-3', { grupo: 'G2' })

    const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(sentBody.action).toBe('actualizarAlumno')
    expect(sentBody.alumno_id).toBe('alum-3')
    expect(sentBody.campos).toEqual({ grupo: 'G2' })
  })

  // --- SEC-03: Inyeccion de API key ---

  it('apiGet incluye api_key como query param cuando API_KEY tiene valor', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: [] }),
    })

    await getConvocatorias()

    const calledUrl = new URL(global.fetch.mock.calls[0][0])
    expect(calledUrl.searchParams.get('api_key')).toBe('test-key-uuid-fake-12345')
  })

  it('apiPost incluye api_key en el body JSON cuando API_KEY tiene valor', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: { ok: true } }),
    })

    await guardarAsistencia({ fecha: '2026-04-05', convocatoria_id: 'conv-1', alumnos: [] })

    const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(sentBody.api_key).toBe('test-key-uuid-fake-12345')
    expect(sentBody.action).toBe('guardarAsistencia')
  })

  it('apiGet usa guard condicional para api_key (if API_KEY)', async () => {
    // Verificamos que el query param se agrega cuando hay key
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: [] }),
    })

    await getProfesores()

    const calledUrl = new URL(global.fetch.mock.calls[0][0])
    // Confirmar que api_key esta presente cuando la key existe
    expect(calledUrl.searchParams.has('api_key')).toBe(true)
    // Confirmar que no es string vacio
    expect(calledUrl.searchParams.get('api_key')).not.toBe('')
  })

  it('apiPost usa spread condicional para api_key', async () => {
    // Verificamos que api_key va junto con action y datos del body
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: { ok: true } }),
    })

    await crearAlumno({ nombre: 'Test', convocatoria_id: 'c1', profesor_id: 'p1', grupo: 'G1' })

    const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(sentBody).toHaveProperty('api_key', 'test-key-uuid-fake-12345')
    expect(sentBody).toHaveProperty('action', 'crearAlumno')
    expect(sentBody).toHaveProperty('nombre', 'Test')
  })
})
