import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './styles/animations.css'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import App from './App.jsx'
import { isApiEnabled } from './config/api'
import { guardarAsistencia } from './services/api'
import { initOfflineSync } from './services/offlineQueue'

// Cola offline (C2): reintenta los guardados pendientes al arrancar la app
// y cada vez que se recupera la conexion (evento 'online'). Solo con API real.
if (isApiEnabled()) initOfflineSync(guardarAsistencia)

// Registro del Service Worker: con registerType 'autoUpdate' (vite.config.js)
// la app se auto-actualiza en silencio, sin pedir confirmacion. El banner de
// aviso de actualizacion se elimino por decision de producto (era codigo
// muerto: autoUpdate nunca invoca el callback que lo activaba). Ver detalle
// en docs/deuda-tecnica.md.
registerSW()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
