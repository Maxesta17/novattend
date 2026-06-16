import { describe, it, expect } from 'vitest'
import { JUSTIFICATION_REASONS, OTHER_REASON } from '../config/justificationReasons'

describe('justificationReasons', () => {
  it('JUSTIFICATION_REASONS es un array no vacio', () => {
    expect(Array.isArray(JUSTIFICATION_REASONS)).toBe(true)
    expect(JUSTIFICATION_REASONS.length).toBeGreaterThan(0)
  })

  it('incluye OTHER_REASON', () => {
    expect(JUSTIFICATION_REASONS).toContain(OTHER_REASON)
  })

  it('OTHER_REASON es el ultimo elemento', () => {
    const last = JUSTIFICATION_REASONS[JUSTIFICATION_REASONS.length - 1]
    expect(last).toBe(OTHER_REASON)
  })

  it('todos los motivos son strings no vacios', () => {
    JUSTIFICATION_REASONS.forEach((reason) => {
      expect(typeof reason).toBe('string')
      expect(reason.length).toBeGreaterThan(0)
    })
  })
})
