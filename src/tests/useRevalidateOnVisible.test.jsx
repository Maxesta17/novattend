import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useRevalidateOnVisible from '../hooks/useRevalidateOnVisible'
import { formatLocalDate } from '../utils/dateUtils'

const todayIso = formatLocalDate(new Date())

/** Simula que la pestana vuelve a primer plano. */
function goVisible() {
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
}

/** Simula que la pestana pasa a segundo plano (no debe revalidar). */
function goHidden() {
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
}

describe('useRevalidateOnVisible (fix M5)', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  it('no marca stale si la convocatoria sigue vigente y el dia no cambio', () => {
    const convocatoria = { fecha_inicio: '2000-01-01', fecha_fin: '2100-12-31' }
    const { result } = renderHook(() => useRevalidateOnVisible(convocatoria, todayIso))

    goVisible()

    expect(result.current.stale).toBe(false)
    expect(result.current.message).toBeNull()
  })

  it('marca stale con mensaje de convocatoria vencida si hoy queda fuera de fecha_inicio/fecha_fin', () => {
    const convocatoria = { fecha_inicio: '2020-01-01', fecha_fin: '2020-01-31' }
    const { result } = renderHook(() => useRevalidateOnVisible(convocatoria, todayIso))

    goVisible()

    expect(result.current.stale).toBe(true)
    expect(result.current.message).toMatch(/ya no está vigente/i)
  })

  it('marca stale con mensaje de cambio de dia si la fecha esperada ya no es hoy', () => {
    const convocatoria = { fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31' }
    // expectedDateIso deliberadamente distinto de "hoy" (simula cruzar medianoche)
    const { result } = renderHook(() => useRevalidateOnVisible(convocatoria, '2000-01-01'))

    goVisible()

    expect(result.current.stale).toBe(true)
    expect(result.current.message).toMatch(/día cambió/i)
  })

  it('no revalida (no llama nada) mientras la pestana esta oculta', () => {
    const convocatoria = { fecha_inicio: '2020-01-01', fecha_fin: '2020-01-31' }
    const { result } = renderHook(() => useRevalidateOnVisible(convocatoria, todayIso))

    expect(result.current.stale).toBe(false) // estado inicial, aun no reviso

    goHidden()

    expect(result.current.stale).toBe(false) // sigue sin revisar
  })

  it('sin fecha_inicio/fecha_fin en la convocatoria, solo revisa el cambio de dia', () => {
    const { result } = renderHook(() => useRevalidateOnVisible({ id: 'conv-1' }, todayIso))

    goVisible()

    expect(result.current.stale).toBe(false)
  })
})
