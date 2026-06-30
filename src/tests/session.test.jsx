import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getSession, setSession, getToken, isExpired, logout, clearSession } from '../config/session'

const futureExp = Math.floor(Date.now() / 1000) + 3600
const pastExp = Math.floor(Date.now() / 1000) - 60

describe('config/session', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('getSession devuelve null sin sesion', () => {
    expect(getSession()).toBeNull()
  })

  it('setSession/getSession persisten y leen el objeto', () => {
    setSession({ token: 't', rol: 'teacher', exp: futureExp })
    expect(getSession()).toMatchObject({ token: 't', rol: 'teacher' })
  })

  it('getToken devuelve el token de la sesion', () => {
    setSession({ token: 'abc', exp: futureExp })
    expect(getToken()).toBe('abc')
  })

  it('getToken devuelve null sin sesion', () => {
    expect(getToken()).toBeNull()
  })

  it('isExpired es true sin sesion', () => {
    expect(isExpired()).toBe(true)
  })

  it('isExpired es false con exp futuro y true con exp pasado', () => {
    setSession({ token: 't', exp: futureExp })
    expect(isExpired()).toBe(false)
    setSession({ token: 't', exp: pastExp })
    expect(isExpired()).toBe(true)
  })

  it('logout limpia la sesion SIN emitir auth:expired', () => {
    setSession({ token: 't', exp: futureExp })
    const handler = vi.fn()
    window.addEventListener('auth:expired', handler)
    logout()
    expect(getSession()).toBeNull()
    expect(handler).not.toHaveBeenCalled()
    window.removeEventListener('auth:expired', handler)
  })

  it('clearSession limpia la sesion Y emite auth:expired', () => {
    setSession({ token: 't', exp: futureExp })
    const handler = vi.fn()
    window.addEventListener('auth:expired', handler)
    clearSession()
    expect(getSession()).toBeNull()
    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener('auth:expired', handler)
  })
})
