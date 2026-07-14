import useOfflineData from '../../hooks/useOfflineData'

/**
 * Banner discreto que avisa cuando los datos visibles vienen del fallback de
 * cache del Service Worker (peticion GET servida desde Cache Storage, no de
 * la red). Se monta una unica vez de forma global (ver App.jsx) para cubrir
 * todas las vistas por igual.
 *
 * Posicionamiento: flujo normal, como primer elemento dentro de
 * MobileContainer (no fixed/sticky). Se eligio asi para no arriesgar
 * solapamiento con el header de cada pagina (PageHeader.jsx es sticky top-0
 * z-20 y su alto varia segun la pagina — con tabs/badges o sin ellos). Un
 * banner fixed/sticky en top-0 competiria por el mismo hueco que el header
 * sticky y lo taparia una vez el usuario hace scroll, salvo que PageHeader
 * conociera el alto del banner (fuera del alcance de este cambio). En flujo
 * normal el banner simplemente empuja el contenido hacia abajo: nunca cubre
 * nada ni bloquea taps, a costa de no quedar fijo si el usuario hace scroll.
 *
 * En dev y en modo mock el Service Worker no corre, por lo que el evento que
 * activa este banner nunca llega y no se muestra (comportamiento correcto).
 *
 * @returns {JSX.Element|null}
 */
export default function OfflineDataBanner() {
  const isOfflineData = useOfflineData()

  if (!isOfflineData) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-warning-soft border-b border-warning/30 px-4 py-1.5 text-center"
    >
      <p className="font-montserrat text-xs text-warning m-0">
        Datos sin conexión — pueden no estar actualizados
      </p>
    </div>
  )
}
