/**
 * Hook de autenticacion.
 *
 * Expone `login(username, password)` que:
 *  - En modo API real: llama a `loginRequest` de api.js y persiste la sesion.
 *  - En modo mock: construye un token falso con prefijo 'mock-' que NUNCA
 *    se envia a un backend real (isApiEnabled() devuelve false en ese contexto).
 *
 * Distingue error 401 (credenciales incorrectas) de error de red/timeout.
 *
 * @module hooks/useAuth
 */

import { useState, useCallback } from 'react'
import { isApiEnabled } from '../config/api'
import { setSession } from '../config/session'
// Import estatico: api.js ya se importa estaticamente en el resto de la app,
// el import() dinamico no ahorraba nada y generaba un aviso en el build.
import { loginRequest } from '../services/api'

/**
 * Construye un objeto de sesion mock para desarrollo sin backend.
 * El token lleva el prefijo 'mock-' para que sea identificable.
 * exp se fija 8h en el futuro, en segundos Unix.
 * @param {string} username
 * @returns {Object}
 */
function buildMockSession(username) {
  const nowSecs = Math.floor(Date.now() / 1000)
  const rol = username === 'admin' ? 'ceo' : 'teacher'
  return {
    token: `mock-${username}-${Date.now()}`,
    profesor_id: `prof-${username}`,
    rol,
    nombre: username,
    exp: nowSecs + 8 * 3600,
    must_change_password: false,
  }
}

/**
 * @returns {{ login: Function, loading: boolean, error: string|null }}
 */
export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Intenta autenticar al usuario.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<Object>} datos de sesion si el login es correcto
   * @throws {Error} con propiedad `type` ('credentials'|'network'|'permission')
   */
  const login = useCallback(async (username, password) => {
    setLoading(true)
    setError(null)

    try {
      if (!isApiEnabled()) {
        // Modo mock: simular latencia minima y devolver sesion falsa
        await new Promise(r => setTimeout(r, 200))
        const session = buildMockSession(username)
        setSession(session)
        return session
      }

      // Modo API real
      const data = await loginRequest(username, password)

      // data contiene: { token, profesor_id, rol, nombre, exp, must_change_password }
      setSession(data)
      return data

    } catch (err) {
      // Clasificar el tipo de error para que LoginPage pueda distinguirlo
      const message = err.message || 'Error desconocido'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { login, loading, error }
}
