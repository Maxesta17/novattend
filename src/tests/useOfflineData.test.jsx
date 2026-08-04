import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useOfflineData from '../hooks/useOfflineData'
import { notifyDataSource } from '../services/cacheStatus'

/** Forzar navigator.onLine (jsdom lo deja en true por defecto). */
function setOnLine(value) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  })
}

describe('useOfflineData', () => {
  beforeEach(() => {
    setOnLine(true)
  })

  afterEach(() => {
    setOnLine(true)
  })

  it('inicia con isStale en false (se asume red hasta la primera notificacion)', () => {
    const { result } = renderHook(() => useOfflineData())
    expect(result.current.isStale).toBe(false)
  })

  it('inicia con online reflejando navigator.onLine', () => {
    setOnLine(false)
    const { result } = renderHook(() => useOfflineData())
    expect(result.current.online).toBe(false)
  })

  it('isStale pasa a true cuando cacheStatus notifica "cache"', () => {
    const { result } = renderHook(() => useOfflineData())

    act(() => { notifyDataSource('cache') })

    expect(result.current.isStale).toBe(true)
  })

  it('isStale vuelve a false cuando cacheStatus notifica "network" tras un "cache"', () => {
    const { result } = renderHook(() => useOfflineData())

    act(() => { notifyDataSource('cache') })
    expect(result.current.isStale).toBe(true)

    act(() => { notifyDataSource('network') })
    expect(result.current.isStale).toBe(false)
  })

  it('online reacciona a los eventos window "offline" y "online"', () => {
    const { result } = renderHook(() => useOfflineData())
    expect(result.current.online).toBe(true)

    act(() => { window.dispatchEvent(new Event('offline')) })
    expect(result.current.online).toBe(false)

    act(() => { window.dispatchEvent(new Event('online')) })
    expect(result.current.online).toBe(true)
  })

  it('se desuscribe al desmontar: notificaciones y eventos posteriores no rompen nada', () => {
    const { result, unmount } = renderHook(() => useOfflineData())
    unmount()

    expect(() => act(() => { notifyDataSource('cache') })).not.toThrow()
    expect(() => act(() => { window.dispatchEvent(new Event('offline')) })).not.toThrow()
    // El valor congelado del hook desmontado sigue siendo el ultimo antes de desmontar
    expect(result.current.isStale).toBe(false)
    expect(result.current.online).toBe(true)
  })
})
