/* eslint-disable no-undef */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock de config/api — API habilitada con URL de prueba
vi.mock('../config/api', () => ({
  API_URL: 'https://script.google.com/test',
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
import { isApiEnabled } from '../config/api'

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
      json: () => Promise.resolve({ status: 'ok', data: mockData }),
    })

    const result = await getConvocatorias()
    expect(result).toEqual(mockData)
  })

  it('apiGet lanza error si status es error', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ status: 'error', error: 'No autorizado' }),
    })

    await expect(getConvocatorias()).rejects.toThrow('No autorizado')
  })

  it('apiGet lanza error generico si no hay mensaje', async () => {
    global.fetch.mockResolvedValue({
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

  // --- apiPost ---

  it('apiPost envia body con action', async () => {
    global.fetch.mockResolvedValue({
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
      json: () => Promise.resolve({ status: 'error', error: 'Duplicado' }),
    })

    await expect(crearAlumno({ nombre: 'Test' })).rejects.toThrow('Duplicado')
  })

  // --- Endpoints especificos ---

  it('getResumen envia params correctos', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ status: 'ok', data: {} }),
    })

    await getResumen('conv-1', 'prof-1', 'G2')

    const calledUrl = new URL(global.fetch.mock.calls[0][0])
    expect(calledUrl.searchParams.get('action')).toBe('getResumen')
    expect(calledUrl.searchParams.get('grupo')).toBe('G2')
  })

  it('getAsistenciaAlumno envia alumno_id', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ status: 'ok', data: [] }),
    })

    await getAsistenciaAlumno('conv-1', 'alum-5')

    const calledUrl = new URL(global.fetch.mock.calls[0][0])
    expect(calledUrl.searchParams.get('action')).toBe('getAsistencia')
    expect(calledUrl.searchParams.get('alumno_id')).toBe('alum-5')
  })

  it('actualizarAlumno envia alumno_id y campos en body', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ status: 'ok', data: { ok: true } }),
    })

    await actualizarAlumno('alum-3', { grupo: 'G2' })

    const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(sentBody.action).toBe('actualizarAlumno')
    expect(sentBody.alumno_id).toBe('alum-3')
    expect(sentBody.campos).toEqual({ grupo: 'G2' })
  })
})
