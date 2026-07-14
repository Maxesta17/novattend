import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ForgotPasswordForm from '../components/features/ForgotPasswordForm.jsx'
import * as api from '../services/api'

vi.mock('../services/api', () => ({
  solicitarReset: vi.fn(),
}))

describe('ForgotPasswordForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exige usuario y email antes de enviar', async () => {
    render(<ForgotPasswordForm onBack={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /enviar contraseña temporal/i }))
    expect(await screen.findByText('Escribe tu usuario y tu email')).toBeInTheDocument()
    expect(api.solicitarReset).not.toHaveBeenCalled()
  })

  it('rechaza un email mal formado', async () => {
    render(<ForgotPasswordForm onBack={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: 'nadine' } })
    fireEvent.change(screen.getByPlaceholderText(/tu email/i), { target: { value: 'no-es-email' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar contraseña temporal/i }))
    expect(await screen.findByText(/email válido/i)).toBeInTheDocument()
    expect(api.solicitarReset).not.toHaveBeenCalled()
  })

  it('envia usuario+email y muestra el mensaje generico (anti-enumeracion)', async () => {
    api.solicitarReset.mockResolvedValue({ message: 'ok' })
    render(<ForgotPasswordForm onBack={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: '  nadine  ' } })
    fireEvent.change(screen.getByPlaceholderText(/tu email/i), { target: { value: 'nadine@correo.com' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar contraseña temporal/i }))
    await waitFor(() => expect(api.solicitarReset).toHaveBeenCalledWith('nadine', 'nadine@correo.com'))
    expect(await screen.findByText(/te hemos enviado un correo/i)).toBeInTheDocument()
  })

  it('muestra error si la solicitud falla', async () => {
    api.solicitarReset.mockRejectedValue(new Error('red'))
    render(<ForgotPasswordForm onBack={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: 'nadine' } })
    fireEvent.change(screen.getByPlaceholderText(/tu email/i), { target: { value: 'nadine@correo.com' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar contraseña temporal/i }))
    expect(await screen.findByText(/no se pudo enviar/i)).toBeInTheDocument()
  })
})
