import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// Mock de config/api e services/api al estilo de useStudentsPastDay.test.jsx.
// isApiEnabled se mockea por-test via mockReturnValue para cubrir ambos modos.
vi.mock('../config/api', () => ({ isApiEnabled: vi.fn(() => true) }))
vi.mock('../services/api', () => ({ getConvocatorias: vi.fn() }))

import useConvocatorias from '../hooks/useConvocatorias.js'
import { isApiEnabled } from '../config/api'
import { getConvocatorias } from '../services/api'

const CONV_1 = { id: 'conv-1', nombre: 'Enero 2026' }
const CONV_2 = { id: 'conv-2', nombre: 'Febrero 2026' }

describe('useConvocatorias', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isApiEnabled.mockReturnValue(true)
  })

  it('loading inicia como true', async () => {
    getConvocatorias.mockResolvedValue([CONV_1])
    const { result } = renderHook(() => useConvocatorias())
    expect(result.current.loading).toBe(true)
    // Se espera a que la carga termine para no dejar el efecto pendiente
    // resolviendo fuera de act() tras acabar el test (warning de React).
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('carga OK: puebla convocatorias y selecciona la primera automaticamente', async () => {
    getConvocatorias.mockResolvedValue([CONV_1, CONV_2])
    const { result } = renderHook(() => useConvocatorias())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.convocatorias).toEqual([CONV_1, CONV_2])
    expect(result.current.selectedConvocatoria).toEqual(CONV_1)
    expect(result.current.error).toBeNull()
  })

  it('setSelectedConvocatoria permite cambiar la convocatoria activa', async () => {
    getConvocatorias.mockResolvedValue([CONV_1, CONV_2])
    const { result } = renderHook(() => useConvocatorias())

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.setSelectedConvocatoria(CONV_2) })

    expect(result.current.selectedConvocatoria).toEqual(CONV_2)
  })

  it('respuesta vacia de la API deja selectedConvocatoria en null (sin activas)', async () => {
    getConvocatorias.mockResolvedValue([])
    const { result } = renderHook(() => useConvocatorias())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.convocatorias).toEqual([])
    expect(result.current.selectedConvocatoria).toBeNull()
  })

  it('error de API: expone el mensaje en error y no queda cargando', async () => {
    getConvocatorias.mockRejectedValue(new Error('Fallo de red'))
    const { result } = renderHook(() => useConvocatorias())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Fallo de red')
    expect(result.current.convocatorias).toEqual([])
    expect(result.current.selectedConvocatoria).toBeNull()
  })

  it('error sin mensaje cae al texto por defecto', async () => {
    getConvocatorias.mockRejectedValue(new Error())
    const { result } = renderHook(() => useConvocatorias())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Error al cargar convocatorias')
  })

  it('reload tras un error recarga y limpia el estado de error si la API se recupera', async () => {
    getConvocatorias.mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useConvocatorias())

    await waitFor(() => expect(result.current.error).toBe('boom'))

    getConvocatorias.mockResolvedValue([CONV_1])
    await act(async () => { await result.current.reload() })

    expect(result.current.error).toBeNull()
    expect(result.current.convocatorias).toEqual([CONV_1])
    expect(result.current.selectedConvocatoria).toEqual(CONV_1)
  })

  it('con API deshabilitada: no llama a getConvocatorias y expone listas vacias', async () => {
    isApiEnabled.mockReturnValue(false)
    const { result } = renderHook(() => useConvocatorias())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(getConvocatorias).not.toHaveBeenCalled()
    expect(result.current.convocatorias).toEqual([])
    expect(result.current.selectedConvocatoria).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('reload con API deshabilitada mantiene el estado vacio sin llamar a la API', async () => {
    isApiEnabled.mockReturnValue(false)
    const { result } = renderHook(() => useConvocatorias())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.reload() })

    expect(getConvocatorias).not.toHaveBeenCalled()
    expect(result.current.convocatorias).toEqual([])
  })
})
