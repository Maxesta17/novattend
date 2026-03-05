/**
 * Barra de progreso con gradiente opcional.
 * @param {object} props
 * @param {number} props.value - Porcentaje (0-100)
 * @param {string} [props.colorFrom] - Color inicio del gradiente (clase Tailwind ej: 'from-burgundy')
 * @param {string} [props.colorTo] - Color fin del gradiente (clase Tailwind ej: 'to-gold')
 * @param {string} [props.color] - Color solido alternativo (clase Tailwind ej: 'bg-success')
 * @param {'sm'|'md'} [props.size='sm'] - Altura de la barra
 * @param {string} [props.className] - Clases adicionales
 */
export default function ProgressBar({
  value,
  colorFrom,
  colorTo,
  color,
  size = 'sm',
  className = '',
}) {
  const heights = {
    sm: 'h-[5px]',
    md: 'h-1.5',
  }

  const barBg = color
    ? color
    : colorFrom && colorTo
      ? `bg-gradient-to-r ${colorFrom} ${colorTo}`
      : 'bg-gradient-to-r from-burgundy to-gold'

  return (
    <div
      className={`${heights[size] || heights.sm} bg-border-light rounded-full overflow-hidden ${className}`}
    >
      <div
        className={`h-full ${barBg} transition-[width] duration-[450ms] ease-out rounded-full`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
