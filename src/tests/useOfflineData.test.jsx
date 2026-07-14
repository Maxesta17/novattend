import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useOfflineData from '../hooks/useOfflineData'
import { notifyDataSource } from '../services/cacheStatus'

describe('useOfflineData', () => {
  it('inicia en false (se asume red hasta la primera notificacion)', () => {
    const { result } = renderHook(() => useOfflineData())
    expect(result.current).toBe(false)
  })

  it('pasa a true cuando cacheStatus notifica "cache"', () => {
    const { result } = renderHook(() => useOfflineData())

    act(() => { notifyDataSource('cache') })

    expect(result.current).toBe(true)
  })

  it('vuelve a false cuando cacheStatus notifica "network" tras un "cache"', () => {
    const { result } = renderHook(() => useOfflineData())

    act(() => { notifyDataSource('cache') })
    expect(result.current).toBe(true)

    act(() => { notifyDataSource('network') })
    expect(result.current).toBe(false)
  })

  it('se desuscribe al desmontar: notificaciones posteriores no rompen nada', () => {
    const { result, unmount } = renderHook(() => useOfflineData())
    unmount()

    expect(() => act(() => { notifyDataSource('cache') })).not.toThrow()
    // El valor congelado del hook desmontado sigue siendo el ultimo antes de desmontar
    expect(result.current).toBe(false)
  })
})
