import { describe, it, expect, vi } from 'vitest'

// RED — descomentar cuando 03-02 cree src/hooks/useFocusTrap.js
// import { renderHook } from '@testing-library/react'
// import useFocusTrap from '../hooks/useFocusTrap.js'

/* eslint-disable no-undef, no-unused-vars */
describe.skip('useFocusTrap', () => {
  it('retorna un ref object', () => {
    const onClose = vi.fn()
    // const { result } = renderHook(() => useFocusTrap(true, onClose))
    expect(result.current).toHaveProperty('current')
  })

  it('llama onClose al presionar Escape', () => {
    const onClose = vi.fn()
    // const { result } = renderHook(() => useFocusTrap(true, onClose))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
/* eslint-enable no-undef, no-unused-vars */
