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
  justificarFalta,
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
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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
      json: () => Promise.resolve({ status: 'error', error: 'Error al guardar' }),
    })

    await expect(guardarAsistencia({ fecha: '2026-03-05' })).rejects.toThrow('Error al guardar')
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

  // --- justificarFalta ---

  it('justificarFalta envia action y payload completo en el body', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: { message: 'Falta actualizada' } }),
    })

    const payload = {
      convocatoria_id: 'conv-1',
      profesor_id: 'prof-1',
      grupo: 'G2',
      alumno_id: 'alum-7',
      fecha: '2026-05-01',
      justificada: true,
      motivo: 'Enfermedad',
    }
    await justificarFalta(payload)

    expect(global.fetch).toHaveBeenCalledWith(
      'https://script.google.com/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      })
    )

    const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(sentBody.action).toBe('justificarFalta')
    expect(sentBody.convocatoria_id).toBe('conv-1')
    expect(sentBody.profesor_id).toBe('prof-1')
    expect(sentBody.grupo).toBe('G2')
    expect(sentBody.alumno_id).toBe('alum-7')
    expect(sentBody.fecha).toBe('2026-05-01')
    expect(sentBody.justificada).toBe(true)
    expect(sentBody.motivo).toBe('Enfermedad')
  })

  it('justificarFalta devuelve la data de la respuesta', async () => {
    const data = { message: 'Falta actualizada', justificada: false, motivo: '' }
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data }),
    })

    const result = await justificarFalta({
      convocatoria_id: 'conv-1',
      alumno_id: 'alum-7',
      fecha: '2026-05-01',
      justificada: false,
      motivo: '',
    })
    expect(result).toEqual(data)
  })

  it('justificarFalta devuelve null si API no esta habilitada', async () => {
    isApiEnabled.mockReturnValue(false)
    const result = await justificarFalta({ alumno_id: 'a1' })
    expect(result).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  // --- SEC-03: api_key retirado — no debe enviarse en ningun request ---

  it('apiGet NO incluye api_key como query param (auth exclusiva por token)', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: [] }),
    })

    await getConvocatorias()

    const calledUrl = new URL(global.fetch.mock.calls[0][0])
    expect(calledUrl.searchParams.has('api_key')).toBe(false)
  })

  it('apiPost NO incluye api_key en el body JSON (auth exclusiva por token)', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: { ok: true } }),
    })

    await guardarAsistencia({ fecha: '2026-04-05', convocatoria_id: 'conv-1', alumnos: [] })

    const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(sentBody).not.toHaveProperty('api_key')
    expect(sentBody.action).toBe('guardarAsistencia')
  })

  it('apiGet no filtra api_key del body GET (param nunca generado)', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: [] }),
    })

    await getProfesores()

    const calledUrl = new URL(global.fetch.mock.calls[0][0])
    expect(calledUrl.searchParams.has('api_key')).toBe(false)
  })

  it('apiPost no incluye api_key aunque haya datos en el body', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: { ok: true } }),
    })

    await guardarAsistencia({ fecha: '2026-04-05', convocatoria_id: 'c1', profesor_id: 'p1', grupo: 'G1', alumnos: [] })

    const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(sentBody).not.toHaveProperty('api_key')
    expect(sentBody).toHaveProperty('action', 'guardarAsistencia')
    expect(sentBody).toHaveProperty('fecha', '2026-04-05')
  })
})
