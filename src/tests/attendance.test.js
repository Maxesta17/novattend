import { describe, it, expect } from 'vitest'
import { singleAttendance, aggregateAttendance, getAttendanceScheme } from '../utils/attendance.js'

describe('singleAttendance', () => {
  it('calcula presentes/clases con campos nuevos', () => {
    expect(singleAttendance({ clasesTotal: 10, faltasTotal: 2 })).toBe(80)
  })

  it('usa fallback monthly si no hay clasesTotal', () => {
    expect(singleAttendance({ monthly: 72 })).toBe(72)
  })

  it('devuelve 0 sin datos', () => {
    expect(singleAttendance({})).toBe(0)
  })
})

describe('aggregateAttendance', () => {
  it('suma faltas/clases (no media de medias)', () => {
    const students = [
      { clasesTotal: 10, faltasTotal: 0 },
      { clasesTotal: 10, faltasTotal: 4 },
    ]
    // (20 - 4) / 20 = 80%
    expect(aggregateAttendance(students)).toBe(80)
  })

  it('devuelve 0 con lista vacia', () => {
    expect(aggregateAttendance([])).toBe(0)
  })

  it('usa fallback a media de monthly si nadie tiene campos nuevos', () => {
    const students = [{ monthly: 88 }, { monthly: 72 }]
    expect(aggregateAttendance(students)).toBe(80)
  })
})

describe('getAttendanceScheme', () => {
  it('>=80 es optimo (success)', () => {
    expect(getAttendanceScheme(80).text).toBe('text-success')
  })

  it('60-79 es alerta (warning)', () => {
    expect(getAttendanceScheme(60).text).toBe('text-warning')
    expect(getAttendanceScheme(79).text).toBe('text-warning')
  })

  it('<60 es critico (error)', () => {
    expect(getAttendanceScheme(59).text).toBe('text-error')
  })
})
