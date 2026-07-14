import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  pendingMarksKey,
  savePendingMarks,
  loadPendingMarks,
  clearPendingMarks,
} from '../utils/pendingMarksStorage'

const students = [
  { id: 'a1', name: 'Ana', present: true },
  { id: 'a2', name: 'Luis', present: false },
]

describe('pendingMarksStorage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('pendingMarksKey construye una clave determinista', () => {
    expect(pendingMarksKey('conv-1', 'G1', '2026-07-14')).toBe(
      'novattend_pending_marks:conv-1:G1:2026-07-14'
    )
  })

  it('savePendingMarks escribe (tras el debounce) y loadPendingMarks lo recupera', () => {
    savePendingMarks('conv-1', 'G1', '2026-07-14', students)
    vi.advanceTimersByTime(400)

    const loaded = loadPendingMarks('conv-1', 'G1', '2026-07-14')
    expect(loaded.marks).toEqual({ a1: true, a2: false })
    expect(typeof loaded.savedAt).toBe('number')
  })

  it('no escribe nada si falta convocatoriaId, grupo, fecha o alumnos', () => {
    savePendingMarks(null, 'G1', '2026-07-14', students)
    savePendingMarks('conv-1', 'G1', '2026-07-14', [])
    vi.advanceTimersByTime(400)

    expect(loadPendingMarks('conv-1', 'G1', '2026-07-14')).toBeNull()
  })

  it('debounce: varios toggles rapidos solo generan la escritura final', () => {
    savePendingMarks('conv-1', 'G1', '2026-07-14', students)
    vi.advanceTimersByTime(100) // dentro de la ventana de debounce
    savePendingMarks('conv-1', 'G1', '2026-07-14', [
      { id: 'a1', name: 'Ana', present: false },
      { id: 'a2', name: 'Luis', present: true },
    ])
    vi.advanceTimersByTime(400)

    const loaded = loadPendingMarks('conv-1', 'G1', '2026-07-14')
    expect(loaded.marks).toEqual({ a1: false, a2: true })
  })

  it('clearPendingMarks elimina el snapshot (y cancela una escritura pendiente)', () => {
    savePendingMarks('conv-1', 'G1', '2026-07-14', students)
    vi.advanceTimersByTime(400)
    expect(loadPendingMarks('conv-1', 'G1', '2026-07-14')).not.toBeNull()

    clearPendingMarks('conv-1', 'G1', '2026-07-14')
    expect(loadPendingMarks('conv-1', 'G1', '2026-07-14')).toBeNull()
  })

  it('loadPendingMarks purga y devuelve null si el snapshot caduco (> 12h)', () => {
    savePendingMarks('conv-1', 'G1', '2026-07-14', students)
    vi.advanceTimersByTime(400)

    const key = pendingMarksKey('conv-1', 'G1', '2026-07-14')
    const raw = JSON.parse(sessionStorage.getItem(key))
    raw.savedAt = Date.now() - 13 * 60 * 60 * 1000
    sessionStorage.setItem(key, JSON.stringify(raw))

    expect(loadPendingMarks('conv-1', 'G1', '2026-07-14')).toBeNull()
    expect(sessionStorage.getItem(key)).toBeNull()
  })

  it('claves distintas (grupo/fecha) no se pisan entre si', () => {
    savePendingMarks('conv-1', 'G1', '2026-07-14', students)
    savePendingMarks('conv-1', 'G2', '2026-07-14', [{ id: 'b1', name: 'Eva', present: true }])
    vi.advanceTimersByTime(400)

    expect(loadPendingMarks('conv-1', 'G1', '2026-07-14').marks).toEqual({ a1: true, a2: false })
    expect(loadPendingMarks('conv-1', 'G2', '2026-07-14').marks).toEqual({ b1: true })
  })
})
