/**
 * Politica de password (validacion cliente para UX).
 *
 * El backend es la autoridad final: esta validacion solo da feedback rapido
 * al usuario antes de enviar. Reglas (espejo de la politica del backend):
 *  - Longitud minima de 10 caracteres.
 *  - No puede contener el nombre de usuario.
 *  - No puede terminar en "2026" (las passwords publicas antiguas terminaban asi).
 *
 * @module utils/passwordPolicy
 */

export const MIN_PASSWORD_LENGTH = 10

/**
 * Valida una nueva password contra la politica de cliente.
 * @param {string} password - nueva password en claro
 * @param {string} [username] - usuario actual (para impedir que la contenga)
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validatePassword(password, username = '') {
  const pwd = password || ''

  if (pwd.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` }
  }

  const user = (username || '').trim().toLowerCase()
  if (user && pwd.toLowerCase().includes(user)) {
    return { valid: false, error: 'La contraseña no puede contener tu nombre de usuario' }
  }

  if (pwd.endsWith('2026')) {
    return { valid: false, error: 'La contraseña no puede terminar en "2026"' }
  }

  return { valid: true, error: null }
}
