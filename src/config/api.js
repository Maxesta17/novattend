/**
 * Configuracion de la API de Google Apps Script.
 *
 * Exporta la URL del endpoint, el API key para autenticacion,
 * y un guard para saber si la API esta habilitada.
 *
 * @module config/api
 */

export const API_URL = import.meta.env.VITE_API_URL || ''
export const API_KEY = import.meta.env.VITE_API_KEY || ''

/** @returns {boolean} true si VITE_API_URL esta configurada */
export const isApiEnabled = () => Boolean(API_URL)

// Advertencia en desarrollo si la API esta habilitada pero falta el API key (D-09)
if (import.meta.env.DEV && Boolean(import.meta.env.VITE_API_URL) && !import.meta.env.VITE_API_KEY) {
  console.warn('[NovAttend] VITE_API_KEY no configurada. Los requests seran rechazados por el backend.')
}
