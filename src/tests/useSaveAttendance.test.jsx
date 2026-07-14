import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// --- Mocks (hoisted por Vitest) ---

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../config/api', () => ({
  isApiEnabled: vi.fn(() => true),
  API_URL: 'https://fake-api.test',
}))

vi.mock('../services/api', () => ({
  guardarAsistencia: vi.fn(),
}))

vi.mock('../services/offlineQueue', () => ({
  enqueue: vi.fn(() => Promise.resolve()),
  removeMatching: vi.fn(() => Promise.resolve()),
  // Misma semantica que el modulo real: red = TypeError/AbortError en cause
  isNetworkError: (err) =>
    Boolean(err?.cause && (err.cause.name === 'AbortError' || err.cause instanceof TypeError)),
}))

import { guardarAsistencia } from '../services/api'
import { enqueue, removeMatching } from '../services/offlineQueue'
import useSaveAttendance from '../hooks/useSaveAttendance'

// --- Helpers ---

const students = [
  { id: 'a1', name: 'Ana', present: true },
  { id: 'a2', name: 'Luis', present: false },
]

const baseArgs = {
  convocatoria: { id: 'conv-1', nombre: 'Enero 2026' },
  profesorId: 'prof-samuel',
  group: 'G1',
  date: '2026-07-14',
  students,
  presentCount: 1,
  isPastDay: false,
  presenceLoadFailed: false,
}

const setOnLine = (value) => {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true })
}

describe('useSaveAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setOnLine(true)
  })

  afterEach(() => {
    setOnLine(true)
  })

  it('guardado online exitoso: envia, purga pendientes de la misma clave y navega sin queued', async () => {
    guardarAsistencia.mockResolvedValue({ registros: 2 })
    const { result } = renderHook(() => useSaveAttendance(baseArgs))

    let ok
    await act(async () => { ok = await result.current.persistAttendance() })

    expect(ok).toBe(true)
    expect(guardarAsistencia).toHaveBeenCalledWith(expect.objectContaining({
      convocatoria_id: 'conv-1',
      grupo: 'G1',
      fecha: '2026-07-14',
    }))
    // Anti-pisado: el guardado online elimina pendientes viejos de la misma clave
    expect(removeMatching).toHaveBeenCalledWith(expect.objectContaining({ convocatoria_id: 'conv-1' }))
    expect(enqueue).not.toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/saved', {
      state: expect.objectContaining({ queued: false, present: 1, total: 2 }),
    })
  })

  it('error de red: encola el payload y navega a /saved con queued: true', async () => {
    guardarAsistencia.mockRejectedValue(new Error('No hay conexión con el servidor. Comprueba tu red.', {
      cause: new TypeError('Failed to fetch'),
    }))
    const { result } = renderHook(() => useSaveAttendance(baseArgs))

    await act(async () => { await result.current.persistAttendance() })

    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({
      convocatoria_id: 'conv-1',
      grupo: 'G1',
      fecha: '2026-07-14',
      alumnos: [
        { alumno_id: 'a1', presente: true },
        { alumno_id: 'a2', presente: false },
      ],
    }))
    expect(mockNavigate).toHaveBeenCalledWith('/saved', {
      state: expect.objectContaining({ queued: true }),
    })
    expect(result.current.saveError).toBeNull()
  })

  it('error de negocio del backend: NO encola y muestra el error como siempre', async () => {
    guardarAsistencia.mockRejectedValue(new Error('Convocatoria no encontrada'))
    const { result } = renderHook(() => useSaveAttendance(baseArgs))

    let ok
    await act(async () => { ok = await result.current.persistAttendance() })

    expect(ok).toBe(false)
    expect(enqueue).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(result.current.saveError).toBe('Convocatoria no encontrada')
    expect(result.current.saving).toBe(false)
  })

  it('sin conexion (navigator.onLine=false): encola directamente sin llamar a la API', async () => {
    setOnLine(false)
    const { result } = renderHook(() => useSaveAttendance(baseArgs))

    await act(async () => { await result.current.persistAttendance() })

    expect(guardarAsistencia).not.toHaveBeenCalled()
    expect(enqueue).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/saved', {
      state: expect.objectContaining({ queued: true }),
    })
  })

  it('canSave: false sin alumnos; en dia pasado se bloquea si fallo la pre-carga', () => {
    const empty = renderHook(() => useSaveAttendance({ ...baseArgs, students: [], presentCount: 0 }))
    expect(empty.result.current.canSave).toBe(false)

    const pastFailed = renderHook(() => useSaveAttendance({
      ...baseArgs, isPastDay: true, presenceLoadFailed: true,
    }))
    expect(pastFailed.result.current.canSave).toBe(false)

    const pastOk = renderHook(() => useSaveAttendance({
      ...baseArgs, presentCount: 0, isPastDay: true, presenceLoadFailed: false,
    }))
    expect(pastOk.result.current.canSave).toBe(true)
  })
})
