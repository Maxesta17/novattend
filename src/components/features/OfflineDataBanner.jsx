import useOfflineData from '../../hooks/useOfflineData'

/**
 * Banner discreto que avisa cuando los datos visibles vienen del fallback de
 * cache del Service Worker (peticion GET servida desde Cache Storage, no de
 * la red). Se monta una unica vez de forma global (ver App.jsx) para cubrir
 * todas las vistas por igual.
 *
 * Texto honesto: la causa dominante medida no es falta de red sino el
 * backend respondiendo lento (peaje del borde de Google), asi que el texto
 * distingue "el servidor va lento" (navigator.onLine=true) de "sin conexion"
 * (navigator.onLine=false) en vez de asumir siempre lo segundo.
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
  const { isStale, online } = useOfflineData()

  if (!isStale) return null

  // El banner solo aparece cuando el SW ya cayo a cache. La causa dominante
  // medida en el incidente es lentitud del backend, no falta de red: por eso
  // se distingue el texto en vez de asumir siempre "sin conexion".
  const message = online
    ? 'El servidor va lento — mostrando los últimos datos guardados'
    : 'Sin conexión — mostrando los últimos datos guardados'

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-warning-soft border-b border-warning/30 px-4 py-1.5 text-center"
    >
      <p className="font-montserrat text-xs text-warning m-0">
        {message}
      </p>
    </div>
  )
}
