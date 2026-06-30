import { describe, it, expect } from 'vitest'
import { validatePassword, MIN_PASSWORD_LENGTH } from '../utils/passwordPolicy'

describe('validatePassword', () => {
  it('rechaza passwords mas cortas que el minimo', () => {
    const res = validatePassword('corta')
    expect(res.valid).toBe(false)
    expect(res.error).toContain(String(MIN_PASSWORD_LENGTH))
  })

  it('rechaza passwords que contienen el nombre de usuario', () => {
    const res = validatePassword('samuelSegura1', 'samuel')
    expect(res.valid).toBe(false)
    expect(res.error).toMatch(/usuario/i)
  })

  it('rechaza passwords que terminan en 2026', () => {
    const res = validatePassword('miClaveLarga2026')
    expect(res.valid).toBe(false)
    expect(res.error).toMatch(/2026/)
  })

  it('acepta una password que cumple la politica', () => {
    const res = validatePassword('ClaveFuerte!9', 'samuel')
    expect(res.valid).toBe(true)
    expect(res.error).toBeNull()
  })

  it('detecta el usuario sin importar mayusculas/minusculas', () => {
    const res = validatePassword('xxSAMUELxx99', 'samuel')
    expect(res.valid).toBe(false)
  })
})
