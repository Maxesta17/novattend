// Configuracion de la API de Google Apps Script
// Reemplazar con la URL real tras desplegar el Apps Script como Web App

export const API_URL = import.meta.env.VITE_API_URL || ''

// Si no hay URL configurada, la app usa datos mock locales
export const isApiEnabled = () => Boolean(API_URL)
