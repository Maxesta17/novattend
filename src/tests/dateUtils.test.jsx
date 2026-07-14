import { describe, it, expect } from 'vitest'
import { formatLocalDate, formatLongDate, formatShortDate, getLast7Days, labelFromIso } from '../utils/dateUtils.js'

describe('dateUtils', () => {
  describe('formatLocalDate', () => {
    it('formatea en zona local (no UTC) sin desplazar el dia', () => {
      // 8 de junio de 2026 a las 23:30 hora local debe seguir siendo dia 8
      const d = new Date(2026, 5, 8, 23, 30, 0)
      expect(formatLocalDate(d)).toBe('2026-06-08')
    })

    it('rellena con ceros mes y dia', () => {
      const d = new Date(2026, 0, 5, 12, 0, 0)
      expect(formatLocalDate(d)).toBe('2026-01-05')
    })

    it('maneja el 29 de febrero bisiesto', () => {
      const d = new Date(2024, 1, 29, 10, 0, 0)
      expect(formatLocalDate(d)).toBe('2024-02-29')
    })
  })

  describe('getLast7Days', () => {
    it('devuelve exactamente 7 dias, hoy primero', () => {
      const days = getLast7Days()
      expect(days).toHaveLength(7)
      expect(days[0].iso).toBe(formatLocalDate(new Date()))
    })

    it('cada dia tiene iso y label, en orden descendente', () => {
      const days = getLast7Days()
      const isos = days.map(d => d.iso)
      const ordenado = [...isos].sort().reverse()
      expect(isos).toEqual(ordenado)
      days.forEach(d => {
        expect(d.iso).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(typeof d.label).toBe('string')
      })
    })

    it('no incluye fechas futuras', () => {
      const days = getLast7Days()
      const hoy = formatLocalDate(new Date())
      days.forEach(d => expect(d.iso <= hoy).toBe(true))
    })
  })

  describe('formatLongDate', () => {
    it('produce dia + mes abreviado + anyo en es-ES', () => {
      const label = formatLongDate(new Date(2026, 2, 8, 12, 0, 0))
      expect(label).toContain('8')
      expect(label).toContain('mar')
      expect(label).toContain('2026')
    })
  })

  describe('formatShortDate', () => {
    it('produce dia + mes abreviado sin anyo a partir de un iso', () => {
      const label = formatShortDate('2026-03-08')
      expect(label).toContain('8')
      expect(label).toContain('mar')
      expect(label).not.toContain('2026')
    })

    it('devuelve cadena vacia si el iso es falsy', () => {
      expect(formatShortDate('')).toBe('')
      expect(formatShortDate(null)).toBe('')
    })

    it('no desplaza el dia al construir el Date', () => {
      expect(formatShortDate('2026-01-01')).toContain('1')
    })
  })

  describe('labelFromIso', () => {
    it('produce el mismo label que getLast7Days para el mismo iso', () => {
      const days = getLast7Days()
      days.forEach(d => {
        expect(labelFromIso(d.iso)).toBe(d.label)
      })
    })

    it('no desplaza el dia al construir el Date', () => {
      // labelFromIso construye a mediodia local: el dia debe ser exacto
      const label = labelFromIso('2026-06-08')
      expect(label).toContain('8')
    })
  })
})
