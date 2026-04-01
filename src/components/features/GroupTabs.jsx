import { useRef, useCallback } from 'react'

/**
 * Pestanas de seleccion de grupo con patron WAI-ARIA Tabs.
 * Navegacion: Arrow Left/Right mueve entre tabs, Tab sale del grupo.
 * @param {object} props
 * @param {number[]} props.groups - Lista de numeros de grupo (ej: [1,2,3,4])
 * @param {number} props.selected - Grupo actualmente seleccionado
 * @param {function} props.onChange - Handler al cambiar grupo (recibe numero)
 */
export default function GroupTabs({ groups, selected, onChange }) {
  const tabRefs = useRef({})

  const handleKeyDown = useCallback((e) => {
    const currentIdx = groups.indexOf(selected)
    let nextGroup = null

    if (e.key === 'ArrowRight') {
      e.preventDefault()
      nextGroup = groups[(currentIdx + 1) % groups.length]
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      nextGroup = groups[(currentIdx - 1 + groups.length) % groups.length]
    }

    if (nextGroup !== null) {
      onChange(nextGroup)
      // Mover foco al nuevo tab activo
      tabRefs.current[nextGroup]?.focus()
    }
  }, [groups, selected, onChange])

  return (
    <div role="tablist" aria-label="Grupos" onKeyDown={handleKeyDown} className="flex gap-1.5">
      {groups.map(g => (
        <button
          key={g}
          ref={(el) => { tabRefs.current[g] = el }}
          id={`tab-grupo-${g}`}
          role="tab"
          aria-selected={selected === g}
          tabIndex={selected === g ? 0 : -1}
          onClick={() => onChange(g)}
          className={[
            'flex-1 py-2 rounded-lg border-none cursor-pointer',
            'font-cinzel text-[13px] font-semibold',
            'transition-all duration-300',
            selected === g
              ? 'bg-burgundy text-gold'
              : 'bg-white/5 text-white/[0.38]',
          ].join(' ')}
        >
          Grupo {g}
        </button>
      ))}
    </div>
  )
}
