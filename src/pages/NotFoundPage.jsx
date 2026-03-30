import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'

/**
 * Pagina 404 — ruta no encontrada.
 * Branded minima: fondo oscuro, heading gold, boton a login.
 * Sin ProtectedRoute — accesible para cualquier usuario.
 */
export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-dark-bg flex flex-col items-center justify-center p-8 box-border">
      <h1 className="font-cinzel text-6xl font-bold text-gold m-0 mb-3">
        404
      </h1>
      <p className="font-montserrat text-sm text-white/60 m-0 mb-8 text-center">
        Pagina no encontrada
      </p>
      <Button variant="primary" onClick={() => navigate('/')}>
        Volver al inicio
      </Button>
    </div>
  )
}
