import { describe, it, expect, vi } from 'vitest'
import { DATA_SOURCE_EVENT, notifyDataSource, subscribeDataSource } from '../services/cacheStatus'

describe('cacheStatus', () => {
  it('notifyDataSource despacha un CustomEvent en window con el source en detail', () => {
    const handler = vi.fn()
    window.addEventListener(DATA_SOURCE_EVENT, handler)

    notifyDataSource('cache')

    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0][0].detail).toEqual({ source: 'cache' })

    window.removeEventListener(DATA_SOURCE_EVENT, handler)
  })

  it('subscribeDataSource recibe el source ("cache" o "network") de cada notificacion', () => {
    const callback = vi.fn()
    const unsubscribe = subscribeDataSource(callback)

    notifyDataSource('cache')
    notifyDataSource('network')

    expect(callback).toHaveBeenNthCalledWith(1, 'cache')
    expect(callback).toHaveBeenNthCalledWith(2, 'network')

    unsubscribe()
  })

  it('la funcion de desuscripcion detiene las notificaciones futuras', () => {
    const callback = vi.fn()
    const unsubscribe = subscribeDataSource(callback)

    notifyDataSource('cache')
    expect(callback).toHaveBeenCalledOnce()

    unsubscribe()
    notifyDataSource('network')

    // Sigue en 1: la desuscripcion corto las notificaciones posteriores
    expect(callback).toHaveBeenCalledOnce()
  })

  it('varios suscriptores reciben la misma notificacion de forma independiente', () => {
    const callbackA = vi.fn()
    const callbackB = vi.fn()
    const unsubscribeA = subscribeDataSource(callbackA)
    const unsubscribeB = subscribeDataSource(callbackB)

    notifyDataSource('cache')

    expect(callbackA).toHaveBeenCalledWith('cache')
    expect(callbackB).toHaveBeenCalledWith('cache')

    unsubscribeA()
    unsubscribeB()
  })
})
