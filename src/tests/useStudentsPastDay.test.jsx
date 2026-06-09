import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock con API habilitada para probar la pre-carga de un dia pasado
vi.mock('../config/api', () => ({ isApiEnabled: vi.fn(() => true) }))
vi.mock('../services/api', () => ({
  getAlumnos: vi.fn(),
  getAsistencia: vi.fn(),
}))

import useStudents from '../hooks/useStudents.js'
import { getAlumnos, getAsistencia } from '../services/api'
import { formatLocalDate } from '../utils/dateUtils.js'

const convocatoria = { id: 'conv-test' }

describe('useStudents — pre-carga de dia pasado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAlumnos.mockResolvedValue([
      { id: 'alu-1', nombre: 'Ana' },
      { id: 'alu-2', nombre: 'Beto' },
      { id: 'alu-3', nombre: 'Caro' },
    ])
  })

  it('para HOY, todos los alumnos parten ausentes (no llama getAsistencia)', async () => {
    const hoy = formatLocalDate(new Date())
    const { result } = renderHook(() => useStudents(convocatoria, 'prof-x', hoy))

    await waitFor(() => expect(result.current.loadingStudents).toBe(false))

    expect(result.current.students.every(s => s.present === false)).toBe(true)
    expect(getAsistencia).not.toHaveBeenCalled()
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

  it('si getAsistencia falla, los toggles parten en blanco sin romper', async () => {
    getAsistencia.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() =>
      useStudents(convocatoria, 'prof-x', '2026-06-08'))

    await waitFor(() => expect(result.current.loadingStudents).toBe(false))

    expect(result.current.students.every(s => s.present === false)).toBe(true)
    expect(result.current.loadError).toBeNull()
  })
})
