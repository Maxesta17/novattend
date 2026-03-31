import { memo } from 'react'

/**
 * Tarjeta de estadistica con icono, valor y etiqueta.
 * @param {object} props
 * @param {string} [props.icon] - Icono/emoji a mostrar junto al valor
 * @param {string|number} props.value - Valor principal
 * @param {string} props.label - Etiqueta descriptiva
 * @param {'success'|'error'|'burgundy'|'gold'} [props.color='burgundy'] - Esquema de color
 * @param {'light'|'dark'} [props.variant='light'] - Fondo claro u oscuro
 * @param {string} [props.className] - Clases adicionales
 * @param {function} [props.onClick] - Handler de click opcional
 */
export default memo(function StatCard({
  icon,
  value,
  label,
  color = 'burgundy',
  variant = 'light',
  className = '',
  onClick,
}) {
  const colorMap = {
    success: { text: 'text-success', bg: 'bg-success-soft' },
    error: { text: 'text-error', bg: 'bg-error-soft' },
    burgundy: { text: 'text-burgundy', bg: 'bg-burgundy-soft' },
    gold: { text: 'text-gold', bg: '' },
  }

  const scheme = colorMap[color] || colorMap.burgundy

  const isDark = variant === 'dark'

  const containerClasses = [
    'flex-1 rounded-xl text-center',
    isDark
      ? 'bg-white/[0.06] p-[10px_8px]'
      : `${scheme.bg} p-[12px_8px]`,
    onClick ? 'cursor-pointer transition-all duration-300' : '',
    className,
  ].filter(Boolean).join(' ')

  const valueClasses = [
    'font-cinzel text-xl font-bold mb-0.5 tabular-nums',
    isDark ? 'text-gold' : scheme.text,
  ].join(' ')

  const labelClasses = [
    'font-montserrat text-[9.5px] uppercase font-semibold',
    isDark ? 'text-white/60' : scheme.text,
  ].join(' ')

  return (
    <div className={containerClasses} onClick={onClick}>
      <div className={valueClasses}>
        {icon && <span className="mr-1">{icon}</span>}
        {value}
      </div>
      <div className={labelClasses}>{label}</div>
    </div>
  )
})
