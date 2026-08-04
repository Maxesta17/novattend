import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import OfflineDataBanner from '../components/features/OfflineDataBanner'
import { notifyDataSource } from '../services/cacheStatus'

const SLOW_TEXT = 'El servidor va lento — mostrando los últimos datos guardados'
const OFFLINE_TEXT = 'Sin conexión — mostrando los últimos datos guardados'

/** Forzar navigator.onLine (jsdom lo deja en true por defecto). */
function setOnLine(value) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  })
}

describe('OfflineDataBanner', () => {
  afterEach(() => {
    setOnLine(true)
  })

  it('no renderiza nada por defecto (antes de cualquier notificacion)', () => {
    const { container } = render(<OfflineDataBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('con navigator.onLine=true muestra el texto de "servidor va lento" tras una notificacion "cache"', () => {
    setOnLine(true)
    render(<OfflineDataBanner />)

    act(() => { notifyDataSource('cache') })

    expect(screen.getByText(SLOW_TEXT)).toBeInTheDocument()
  })

  it('con navigator.onLine=false muestra el texto de "sin conexion" tras una notificacion "cache"', () => {
    setOnLine(false)
    render(<OfflineDataBanner />)

    act(() => { notifyDataSource('cache') })

    expect(screen.getByText(OFFLINE_TEXT)).toBeInTheDocument()
  })

  it('tiene role="status" y aria-live="polite"', () => {
    render(<OfflineDataBanner />)

    act(() => { notifyDataSource('cache') })

    const banner = screen.getByRole('status')
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveAttribute('aria-live', 'polite')
  })

  it('desaparece tras una notificacion "network" posterior', () => {
    render(<OfflineDataBanner />)

    act(() => { notifyDataSource('cache') })
    expect(screen.getByText(SLOW_TEXT)).toBeInTheDocument()

    act(() => { notifyDataSource('network') })
    expect(screen.queryByText(SLOW_TEXT)).not.toBeInTheDocument()
  })
})
