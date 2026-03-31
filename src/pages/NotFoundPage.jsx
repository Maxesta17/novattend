import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'

/**
 * Pagina 404 — ruta catch-all cuando la URL no coincide con ninguna ruta definida.
 * Accesible para cualquier usuario (sin ProtectedRoute).
 */
export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <p className="font-cinzel text-gold text-6xl font-bold">404</p>
        <h1 className="font-cinzel text-white text-xl font-bold mt-2">Pagina no encontrada</h1>
        <p className="font-montserrat text-white/60 text-sm mt-3">
          La pagina que buscas no existe o fue movida.
        </p>
      </div>
      <Button onClick={() => navigate('/')} variant="primary">
        Volver al inicio
      </Button>
    </div>
  )
}
