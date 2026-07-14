import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// --- Mocks (hoisted por Vitest) ---

vi.mock('../config/api', () => ({
  isApiEnabled: () => true,
}))

vi.mock('../services/api', () => ({
  getConvocatorias: vi.fn(),
  getProfesores: vi.fn(),
  getResumen: vi.fn(),
  AuthError: class AuthError extends Error {},
}))

import useDashboard from '../hooks/useDashboard.js'
import { getConvocatorias, getProfesores, getResumen } from '../services/api'

const CONVS = [
  { id: 'c1', nombre: 'Enero 2026' },
  { id: 'c2', nombre: 'Marzo 2026' },
]

const PROFESORES = [{ id: 'prof-1', nombre: 'Samuel' }]

const RESUMEN = [{
  profesor_id: 'prof-1', grupo: 'G1', alumno_id: 'a1', nombre: 'Ana Garcia',
  faltas_total: 2, clases_total: 10,
}]

/** Renderiza el hook y espera a que termine la carga inicial */
async function renderDashboard() {
  const rendered = renderHook(() => useDashboard())
  await waitFor(() => expect(rendered.result.current.loading).toBe(false))
  return rendered
}

describe('useDashboard — carga paralela y cambio de convocatoria', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getConvocatorias.mockResolvedValue(CONVS)
    getProfesores.mockResolvedValue(PROFESORES)
    getResumen.mockResolvedValue(RESUMEN)
  })

  it('dispara getProfesores en el montaje, en paralelo con getConvocatorias (sin waterfall)', async () => {
    const { result } = renderHook(() => useDashboard())
    // Ambas peticiones salen antes de que ninguna resuelva
    expect(getProfesores).toHaveBeenCalledTimes(1)
    expect(getConvocatorias).toHaveBeenCalledTimes(1)
    // Dejar que la carga termine para no filtrar updates fuera de act
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('la carga inicial hace exactamente 1 getProfesores y 1 getResumen', async () => {
    const { result } = await renderDashboard()
    expect(getProfesores).toHaveBeenCalledTimes(1)
    expect(getResumen).toHaveBeenCalledTimes(1)
    expect(getResumen).toHaveBeenCalledWith('c1')
    expect(result.current.teachers).toHaveLength(1)
  })

  it('regresion: un cambio de convocatoria produce exactamente 1 getResumen y 0 getProfesores nuevas', async () => {
    const { result } = await renderDashboard()
    // Snapshot tras la carga inicial
    expect(getProfesores).toHaveBeenCalledTimes(1)
    expect(getResumen).toHaveBeenCalledTimes(1)

    act(() => { result.current.handleConvChange(CONVS[1]) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Antes: el handler y el effect cargaban en paralelo (doble fetch)
    expect(getResumen).toHaveBeenCalledTimes(2)
    expect(getResumen).toHaveBeenLastCalledWith('c2')
    // Profesores no varian: se sirven desde la cache del ref
    expect(getProfesores).toHaveBeenCalledTimes(1)
  })

  it('anti-race: si la primera carga resuelve tarde, gana la ultima convocatoria seleccionada', async () => {
    const resumenC1 = [{ ...RESUMEN[0], nombre: 'Alumno C1' }]
    const resumenC2 = [{ ...RESUMEN[0], nombre: 'Alumno C2' }]
    let resolveC1
    getResumen.mockImplementation(id => {
      if (id === 'c1') return new Promise(res => { resolveC1 = () => res(resumenC1) })
      return Promise.resolve(resumenC2)
    })

    const { result } = renderHook(() => useDashboard())
    // Esperar a que la carga de c1 este en vuelo
    await waitFor(() => expect(getResumen).toHaveBeenCalledWith('c1'))

    // Cambiar a c2 mientras c1 sigue pendiente; c2 resuelve primero
    act(() => { result.current.handleConvChange(CONVS[1]) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Ahora resuelve la carga obsoleta de c1: NO debe pisar los datos de c2
    act(() => { resolveC1() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.teachers[0].groups[0].students[0].name).toBe('Alumno C2')
  })

  it('handleConvChange resetea busqueda y profesor expandido', async () => {
    const { result } = await renderDashboard()
    act(() => {
      result.current.setSearchQuery('ana')
      result.current.handleTeacherToggle('prof-1')
    })
    act(() => { result.current.handleConvChange(CONVS[1]) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.searchQuery).toBe('')
    expect(result.current.expandedTeacher).toBe(null)
  })
})
