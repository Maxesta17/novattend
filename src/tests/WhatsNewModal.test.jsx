import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WhatsNewModal from '../components/features/WhatsNewModal.jsx'
import {
  WHATSNEW_JUSTIFICAR_KEY as STORAGE_KEY,
  hasSeenWhatsNew,
  markWhatsNewSeen,
} from '../utils/whatsNewStorage.js'

describe('WhatsNewModal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('no se muestra si la key ya esta en localStorage', () => {
    localStorage.setItem(STORAGE_KEY, '1')
    render(<WhatsNewModal enabled />)
    expect(screen.queryByText('¡Nuevo! Justificar faltas')).not.toBeInTheDocument()
  })

  it('se muestra la primera vez cuando enabled y sin key previa', () => {
    render(<WhatsNewModal enabled />)
    expect(screen.getByText('¡Nuevo! Justificar faltas')).toBeInTheDocument()
  })

  it('no se muestra si enabled es false (p. ej. CEO)', () => {
    render(<WhatsNewModal enabled={false} />)
    expect(screen.queryByText('¡Nuevo! Justificar faltas')).not.toBeInTheDocument()
  })

  it('al pulsar "Entendido" se cierra y marca la key como vista', () => {
    render(<WhatsNewModal enabled />)
    fireEvent.click(screen.getByText('Entendido'))
    expect(screen.queryByText('¡Nuevo! Justificar faltas')).not.toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1')
  })

  it('hasSeenWhatsNew refleja el estado de la key', () => {
    expect(hasSeenWhatsNew(STORAGE_KEY)).toBe(false)
    markWhatsNewSeen(STORAGE_KEY)
    expect(hasSeenWhatsNew(STORAGE_KEY)).toBe(true)
  })
})
