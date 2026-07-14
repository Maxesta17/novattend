import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// Mocks antes de los imports del modulo bajo prueba
vi.mock('../config/api', () => ({ isApiEnabled: vi.fn(() => true) }))
vi.mock('../services/api', () => ({
  getAlumnos: vi.fn(),
  getAsistencia: vi.fn(),
}))

import useStudents from '../hooks/useStudents.js'
import { getAlumnos, getAsistencia } from '../services/api'
import { loadPendingMarks } from '../utils/pendingMarksStorage'

const convocatoria = { id: 'conv-1', nombre: 'Enero 2026' }
const profesorId = 'prof-samuel'
const fecha = '2026-07-14'

const alumnos = [
  { id: 'a1', nombre: 'Ana' },
  { id: 'a2', nombre: 'Luis' },
]

describe('useStudents — persistencia/restauracion de marcas (fix M5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    getAlumnos.mockResolvedValue(alumnos)
    getAsistencia.mockResolvedValue([]) // nada guardado aun en backend
  })

  it('toggleStudent persiste (con debounce) un snapshot en sessionStorage', async () => {
    const { result } = renderHook(() => useStudents(convocatoria, profesorId, fecha))
    await waitFor(() => expect(result.current.loadingStudents).toBe(false))

    act(() => { result.current.toggleStudent(0) })

    // Esperar a que pase el debounce (300ms) de savePendingMarks
    await waitFor(() => {
      const pending = loadPendingMarks('conv-1', 'G1', fecha)
      expect(pending).not.toBeNull()
      expect(pending.marks.a1).toBe(true)
    })
  })

  it('restaura las marcas al remontar con la misma convocatoria/grupo/fecha y avisa via restoredMarks', async () => {
    // Primera instancia: marca a Ana presente y espera a que se persista.
    const first = renderHook(() => useStudents(convocatoria, profesorId, fecha))
    await waitFor(() => expect(first.result.current.loadingStudents).toBe(false))
    act(() => { first.result.current.toggleStudent(0) })
    await waitFor(() => {
      expect(loadPendingMarks('conv-1', 'G1', fecha)?.marks.a1).toBe(true)
    })

    // Simula el 401: se desmonta la pagina (component unmount) sin guardar.
    first.unmount()

    // Segunda instancia (remount tras volver a login y reabrir la pagina).
    const second = renderHook(() => useStudents(convocatoria, profesorId, fecha))
    await waitFor(() => expect(second.result.current.loadingStudents).toBe(false))

    expect(second.result.current.restoredMarks).toBe(true)
    expect(second.result.current.students.find(s => s.id === 'a1').present).toBe(true)
    // getAsistencia no debe ganar: la restauracion evita pisar con el backend
    expect(second.result.current.students.find(s => s.id === 'a2').present).toBe(false)
  })

  it('dismissRestoredMarks oculta el aviso sin borrar el snapshot restaurado', async () => {
    const first = renderHook(() => useStudents(convocatoria, profesorId, fecha))
    await waitFor(() => expect(first.result.current.loadingStudents).toBe(false))
    act(() => { first.result.current.toggleStudent(0) })
    await waitFor(() => {
      expect(loadPendingMarks('conv-1', 'G1', fecha)).not.toBeNull()
    })
    first.unmount()

    const second = renderHook(() => useStudents(convocatoria, profesorId, fecha))
    await waitFor(() => expect(second.result.current.restoredMarks).toBe(true))

    act(() => { second.result.current.dismissRestoredMarks() })

    expect(second.result.current.restoredMarks).toBe(false)
  })
})
