import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// Mock con API habilitada para probar la pre-carga de asistencia por dia
vi.mock('../config/api', () => ({ isApiEnabled: vi.fn(() => true) }))
vi.mock('../services/api', () => ({
  getAlumnos: vi.fn(),
  getAsistencia: vi.fn(),
}))

import useStudents from '../hooks/useStudents.js'
import { getAlumnos, getAsistencia } from '../services/api'
import { formatLocalDate } from '../utils/dateUtils.js'

const convocatoria = { id: 'conv-test' }
const hoy = formatLocalDate(new Date())

describe('useStudents — pre-carga de asistencia guardada', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAlumnos.mockResolvedValue([
      { id: 'alu-1', nombre: 'Ana' },
      { id: 'alu-2', nombre: 'Beto' },
      { id: 'alu-3', nombre: 'Caro' },
    ])
  })

  it('para HOY tambien pre-carga la asistencia ya guardada (re-editar no parte de cero)', async () => {
    getAsistencia.mockResolvedValue([
      { alumno_id: 'alu-1', presente: true },
      { alumno_id: 'alu-2', presente: true },
    ])
    const { result } = renderHook(() => useStudents(convocatoria, 'prof-x', hoy))

    await waitFor(() => expect(result.current.loadingStudents).toBe(false))
    await waitFor(() => expect(result.current.students.length).toBe(3))

    expect(getAsistencia).toHaveBeenCalledWith('conv-test', 'prof-x', 'G1', hoy)
    const byName = Object.fromEntries(result.current.students.map(s => [s.name, s.present]))
    expect(byName).toEqual({ Ana: true, Beto: true, Caro: false })
  })

  it('para un dia PASADO, pre-carga la asistencia guardada en los toggles', async () => {
    getAsistencia.mockResolvedValue([
      { alumno_id: 'alu-1', presente: true },
      { alumno_id: 'alu-2', presente: false },
      { alumno_id: 'alu-3', presente: true },
    ])

    const { result } = renderHook(() =>
      useStudents(convocatoria, 'prof-x', '2026-06-08'))

    await waitFor(() => expect(result.current.loadingStudents).toBe(false))
    await waitFor(() => expect(getAsistencia).toHaveBeenCalled())
    await waitFor(() => expect(result.current.students.length).toBe(3))

    const byName = Object.fromEntries(
      result.current.students.map(s => [s.name, s.present])
    )
    expect(byName).toEqual({ Ana: true, Beto: false, Caro: true })
  })

  it('si getAsistencia falla, expone presenceLoadFailed (para avisar y bloquear guardado)', async () => {
    getAsistencia.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() =>
      useStudents(convocatoria, 'prof-x', '2026-06-08'))

    await waitFor(() => expect(result.current.loadingStudents).toBe(false))

    expect(result.current.students.every(s => s.present === false)).toBe(true)
    expect(result.current.presenceLoadFailed).toBe(true)
    expect(result.current.loadError).toBeNull()
  })

  it('retryLoad reintenta y limpia presenceLoadFailed si la API se recupera', async () => {
    getAsistencia.mockRejectedValueOnce(new Error('boom'))

    const { result } = renderHook(() =>
      useStudents(convocatoria, 'prof-x', '2026-06-08'))

    await waitFor(() => expect(result.current.presenceLoadFailed).toBe(true))

    getAsistencia.mockResolvedValue([{ alumno_id: 'alu-1', presente: true }])
    act(() => { result.current.retryLoad() })

    await waitFor(() => expect(result.current.presenceLoadFailed).toBe(false))
    expect(result.current.students.find(s => s.name === 'Ana').present).toBe(true)
  })

  it('conserva las marcas de la sesion al cambiar de grupo y volver', async () => {
    getAsistencia.mockResolvedValue([])
    const { result } = renderHook(() => useStudents(convocatoria, 'prof-x', hoy))

    await waitFor(() => expect(result.current.loadingStudents).toBe(false))
    await waitFor(() => expect(result.current.students.length).toBe(3))

    // Marcar a Ana en G1, ir a G2 y volver a G1
    act(() => { result.current.toggleStudent(0) })
    expect(result.current.students[0].present).toBe(true)

    act(() => { result.current.setSelectedGroup('G2') })
    await waitFor(() => expect(result.current.loadingStudents).toBe(false))

    act(() => { result.current.setSelectedGroup('G1') })
    await waitFor(() => expect(result.current.loadingStudents).toBe(false))

    expect(result.current.students[0].present).toBe(true)
  })

  it('con API activa y sin convocatoria NO cae a datos mock (anti guardado fantasma)', async () => {
    const { result } = renderHook(() => useStudents(null, 'prof-x', hoy))

    await waitFor(() => expect(result.current.loadingStudents).toBe(false))

    expect(result.current.students).toEqual([])
    expect(getAlumnos).not.toHaveBeenCalled()
  })
})
