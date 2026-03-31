/**
 * Spinner de carga para el fallback de Suspense al cargar rutas lazy.
 * Componente puro sin props — pantalla completa con fondo oscuro y animacion branded.
 *
 * Uso tipico:
 *   <Suspense fallback={<LoadingSpinner />}>
 *     <Routes />
 *   </Suspense>
 */
export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center gap-3">
      <svg
        className="animate-spin [animation-duration:0.8s]"
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        {/* Circulo base completo — baja opacidad */}
        <circle
          cx="16"
          cy="16"
          r="14"
          fill="none"
          strokeWidth="3"
          className="stroke-burgundy/30"
        />
        {/* Arco animado ~75% de la circunferencia (2 * pi * 14 ~ 88) */}
        <circle
          cx="16"
          cy="16"
          r="14"
          fill="none"
          strokeWidth="3"
          className="stroke-gold"
          strokeLinecap="round"
          strokeDasharray="66 22"
        />
      </svg>
      <p className="text-white/80 text-xs font-montserrat font-semibold">Cargando...</p>
    </div>
  )
}
