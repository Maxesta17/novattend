/**
 * Etiqueta/badge compacta para indicadores.
 * @param {object} props
 * @param {React.ReactNode} props.children - Contenido del badge
 * @param {'gold'|'admin'|'status'} [props.variant='gold'] - Estilo visual
 * @param {string} [props.color] - Color de fondo para variant='status' (clase Tailwind)
 * @param {string} [props.textColor] - Color de texto para variant='status' (clase Tailwind)
 * @param {string} [props.className] - Clases adicionales
 */
export default function Badge({
  children,
  variant = 'gold',
  color,
  textColor,
  className = '',
}) {
  const variants = {
    gold: 'bg-gold text-burgundy px-2.5 py-1 rounded-md font-montserrat text-[8.5px] font-bold tracking-[2px] uppercase',
    admin: 'bg-gold text-burgundy px-2.5 py-1 rounded-md font-montserrat text-[8.5px] font-bold tracking-[2px] uppercase',
    status: `${color || 'bg-success'} ${textColor || 'text-white'} px-1.5 py-0.5 rounded font-cinzel text-[10px] font-semibold`,
  }

  const classes = [
    'inline-block',
    variants[variant] || variants.gold,
    className,
  ].filter(Boolean).join(' ')

  return <span className={classes}>{children}</span>
}
