import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import OfflineDataBanner from '../components/features/OfflineDataBanner'
import { notifyDataSource } from '../services/cacheStatus'

const BANNER_TEXT = 'Datos sin conexión — pueden no estar actualizados'

describe('OfflineDataBanner', () => {
  it('no renderiza nada por defecto (antes de cualquier notificacion)', () => {
    const { container } = render(<OfflineDataBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('se muestra tras recibir una notificacion "cache"', () => {
    render(<OfflineDataBanner />)

    act(() => { notifyDataSource('cache') })

    expect(screen.getByText(BANNER_TEXT)).toBeInTheDocument()
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
    expect(screen.getByText(BANNER_TEXT)).toBeInTheDocument()

    act(() => { notifyDataSource('network') })
    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument()
  })
})
