import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// Mocks antes de los imports del modulo bajo prueba
vi.mock('../config/api', () => ({ isApiEnabled: vi.fn(() => false) }))
vi.mock('../services/api', () => ({ getAlumnos: vi.fn() }))

import useStudents, { GROUPS } from '../hooks/useStudents.js'
import { isApiEnabled } from '../config/api'

describe('useStudents', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    isApiEnabled.mockReturnValue(false)
  })

  it('GROUPS exporta los cuatro grupos esperados', () => {
    expect(GROUPS).toEqual(['G1', 'G2', 'G3', 'G4'])
  })

  it('en modo sin API carga alumnos mock del grupo G1', async () => {
    const { result } = renderHook(() => useStudents(null, null))

    await waitFor(() => expect(result.current.loadingStudents).toBe(false))

    expect(result.current.students.length).toBe(12)
    expect(result.current.students[0].name).toBe('Laura Garcia')
    expect(result.current.students[0].present).toBe(false)
  })

  it('toggleStudent alterna el campo present de un alumno por indice', async () => {
    const { result } = renderHook(() => useStudents(null, null))

    await waitFor(() => expect(result.current.loadingStudents).toBe(false))

    act(() => { result.current.toggleStudent(0) })

    expect(result.current.students[0].present).toBe(true)

    act(() => { result.current.toggleStudent(0) })

    expect(result.current.students[0].present).toBe(false)
  })

  it('toggleAll marca todos como presentes si ninguno lo esta', async () => {
    const { result } = renderHook(() => useStudents(null, null))

    await waitFor(() => expect(result.current.loadingStudents).toBe(false))

    act(() => { result.current.toggleAll() })

    expect(result.current.students.every(s => s.present)).toBe(true)
  })

  it('toggleAll desmarca todos si todos estan presentes', async () => {
    const { result } = renderHook(() => useStudents(null, null))

    await waitFor(() => expect(result.current.loadingStudents).toBe(false))

    // Marcar todos primero
    act(() => { result.current.toggleAll() })
    expect(result.current.students.every(s => s.present)).toBe(true)

    // Desmarcar todos
    act(() => { result.current.toggleAll() })
    expect(result.current.students.every(s => !s.present)).toBe(true)
  })

  it('presentCount, absentCount y attendancePercent reflejan el estado actual', async () => {
    const { result } = renderHook(() => useStudents(null, null))

    await waitFor(() => expect(result.current.loadingStudents).toBe(false))

    // Estado inicial: nadie presente
    expect(result.current.presentCount).toBe(0)
    expect(result.current.absentCount).toBe(12)
    expect(result.current.attendancePercent).toBe(0)

    // Marcar el primero como presente
    act(() => { result.current.toggleStudent(0) })

    expect(result.current.presentCount).toBe(1)
    expect(result.current.absentCount).toBe(11)
    expect(result.current.attendancePercent).toBe(8)
  })

  it('loadError es null en carga mock exitosa', async () => {
    const { result } = renderHook(() => useStudents(null, null))

    await waitFor(() => expect(result.current.loadingStudents).toBe(false))

    expect(result.current.loadError).toBeNull()
  })

})
