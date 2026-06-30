/**
 * Configuracion de la API de Google Apps Script.
 *
 * Exporta la URL del endpoint y un guard para saber si la API esta habilitada.
 * La autenticacion se realiza exclusivamente via token de sesion (HMAC);
 * el api_key compartido (VITE_API_KEY) fue retirado.
 *
 * @module config/api
 */

export const API_URL = import.meta.env.VITE_API_URL || ''

/** @returns {boolean} true si VITE_API_URL esta configurada */
export const isApiEnabled = () => Boolean(API_URL)
