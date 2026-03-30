import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBanner from '../components/ui/ErrorBanner'

describe('ErrorBanner', () => {
  it('renderiza el mensaje cuando message tiene contenido', () => {
    render(<ErrorBanner message="Error de red" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Error de red')).toBeInTheDocument()
  })

  it('no renderiza nada cuando message es null', () => {
    const { container } = render(<ErrorBanner message={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('no renderiza nada cuando message es string vacio', () => {
    const { container } = render(<ErrorBanner message="" />)
    expect(container.firstChild).toBeNull()
  })

  it('llama onDismiss al click en boton X', async () => {
    const handleDismiss = vi.fn()
    render(<ErrorBanner message="Error" onDismiss={handleDismiss} />)
    await userEvent.click(screen.getByLabelText('Cerrar error'))
    expect(handleDismiss).toHaveBeenCalledOnce()
  })

  it('tiene role="alert" en el div raiz', () => {
    render(<ErrorBanner message="Error" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('no muestra boton X cuando onDismiss no se pasa', () => {
    render(<ErrorBanner message="Error" />)
    expect(screen.queryByLabelText('Cerrar error')).toBeNull()
  })
})
