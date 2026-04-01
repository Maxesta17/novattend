/**
 * Cabecera de pagina con fondo oscuro degradado, logo, titulo y badge.
 * @param {object} props
 * @param {string} props.title - Titulo principal
 * @param {string} [props.subtitle] - Subtitulo debajo del titulo
 * @param {React.ReactNode} [props.badge] - Elemento badge a la derecha
 * @param {function} [props.onLogout] - Handler para cerrar sesion
 * @param {React.ReactNode} [props.children] - Contenido adicional debajo (tabs, stats, etc.)
 */
export default function PageHeader({
  title,
  subtitle,
  badge,
  onLogout,
  children,
}) {
  return (
    <header
      className={[
        'sticky top-0 z-20',
        'bg-burgundy-dark',
        'rounded-b-3xl px-4 pt-4 pb-3',
        'shadow-lg',
      ].join(' ')}
    >
      {/* Fila superior: Logo + Nombre + Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <img
            src="/logova1.png"
            alt="NovAttend"
            className="size-[42px] rounded-xl object-cover shadow-md"
          />
          <div>
            <h2 className="font-cinzel text-[15px] font-semibold text-white m-0 mb-0.5 text-balance">
              {title}
            </h2>
            {subtitle && (
              <p className="font-montserrat text-[11px] text-white/45 m-0 text-pretty">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center transition-colors duration-200 hover:bg-white/20"
              aria-label="Cerrar sesion"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/70">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Slot para contenido extra (tabs, stats, etc.) */}
      {children}
    </header>
  )
}
