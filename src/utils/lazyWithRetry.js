import { lazy } from 'react'

// Flag en sessionStorage para recargar UNA sola vez y no entrar en bucle.
const RELOAD_FLAG = 'lazy-retry-reloaded'

/**
 * Envuelve React.lazy con recuperacion ante fallo del import dinamico.
 *
 * Con `skipWaiting: true`, un deploy nuevo purga los chunks viejos del
 * precache del service worker. Una pestana que quedo abierta con la version
 * anterior y navega a una ruta lazy aun no visitada rompe el import() y
 * caeria al ErrorBoundary. Aqui capturamos ese fallo y recargamos la pagina
 * una unica vez (flag en sessionStorage) para obtener los chunks nuevos.
 *
 * @param {Function} importFn - Funcion de import dinamico, ej: () => import('./pages/Page')
 * @returns {import('react').LazyExoticComponent} Componente lazy con reintento
 */
export default function lazyWithRetry(importFn) {
  return lazy(async () => {
    try {
      const mod = await importFn()
      // Import correcto: limpiar el flag para permitir futuros reintentos.
      sessionStorage.removeItem(RELOAD_FLAG)
      return mod
    } catch (err) {
      if (sessionStorage.getItem(RELOAD_FLAG) !== '1') {
        sessionStorage.setItem(RELOAD_FLAG, '1')
        window.location.reload()
        // Promesa que no resuelve: la pagina ya esta recargando.
        return new Promise(() => {})
      }
      // Segundo fallo consecutivo: dejar que el ErrorBoundary lo gestione.
      throw err
    }
  })
}
