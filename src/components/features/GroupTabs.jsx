/**
 * Pestanas de seleccion de grupo.
 * @param {object} props
 * @param {number[]} props.groups - Lista de numeros de grupo (ej: [1,2,3,4])
 * @param {number} props.selected - Grupo actualmente seleccionado
 * @param {function} props.onChange - Handler al cambiar grupo (recibe numero)
 */
export default function GroupTabs({ groups, selected, onChange }) {
  return (
    <div className="flex gap-1.5">
      {groups.map(g => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={[
            'flex-1 py-2 rounded-lg border-none cursor-pointer',
            'font-cinzel text-[13px] font-semibold',
            'transition-all duration-300',
            selected === g
              ? 'bg-gradient-to-br from-burgundy to-burgundy-light text-gold'
              : 'bg-white/5 text-white/[0.38]',
          ].join(' ')}
        >
          Grupo {g}
        </button>
      ))}
    </div>
  )
}
