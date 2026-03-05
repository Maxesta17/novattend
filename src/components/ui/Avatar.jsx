/**
 * Avatar circular/redondeado con iniciales o contenido.
 * @param {object} props
 * @param {string} props.initials - Texto a mostrar (iniciales)
 * @param {'active'|'inactive'|'colored'} [props.variant='inactive'] - Estilo visual
 * @param {string} [props.color] - Color de fondo para variant='colored' (clase Tailwind, ej: 'bg-success')
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Tamano del avatar
 * @param {React.ReactNode} [props.children] - Contenido personalizado (sobreescribe initials)
 * @param {string} [props.className] - Clases adicionales
 */
export default function Avatar({
  initials,
  variant = 'inactive',
  color,
  size = 'md',
  children,
  className = '',
}) {
  const sizes = {
    sm: 'w-[30px] h-[30px] min-w-[30px] rounded-md text-[10px]',
    md: 'w-[38px] h-[38px] min-w-[38px] rounded-[9px] text-xs',
    lg: 'w-14 h-14 min-w-14 rounded-xl text-xl',
  }

  const variants = {
    active: 'bg-gradient-to-br from-burgundy to-burgundy-light text-white font-cinzel font-bold text-base',
    inactive: 'bg-cream text-text-muted font-montserrat font-medium',
    colored: `${color || 'bg-burgundy'} text-white font-montserrat font-semibold`,
  }

  const classes = [
    'flex items-center justify-center',
    sizes[size] || sizes.md,
    variants[variant] || variants.inactive,
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {children || initials}
    </div>
  )
}
