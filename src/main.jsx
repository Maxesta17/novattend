import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './index.css'
import './styles/animations.css'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import App from './App.jsx'
import UpdateBanner from './components/ui/UpdateBanner.jsx'
import { isApiEnabled } from './config/api'
import { guardarAsistencia } from './services/api'
import { initOfflineSync } from './services/offlineQueue'

// Cola offline (C2): reintenta los guardados pendientes al arrancar la app
// y cada vez que se recupera la conexion (evento 'online'). Solo con API real.
if (isApiEnabled()) initOfflineSync(guardarAsistencia)

// eslint-disable-next-line react-refresh/only-export-components
function Root() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  return (
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <UpdateBanner
        needRefresh={needRefresh}
        onUpdate={() => updateServiceWorker(true)}
      />
    </StrictMode>
  )
}

createRoot(document.getElementById('root')).render(<Root />)
