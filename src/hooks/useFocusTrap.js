import { useEffect, useRef } from 'react'

/**
 * Hook que atrapa el foco dentro de un contenedor mientras el modal esta abierto.
 * Maneja Tab/Shift+Tab ciclico, Escape para cerrar, y restaura el foco al cerrar.
 * @param {boolean} isOpen - Activa/desactiva el trap
 * @param {function} onClose - Callback al presionar Escape
 * @returns {React.RefObject} ref para asignar al contenedor del modal
 */
export default function useFocusTrap(isOpen, onClose) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !containerRef.current) return

    // Guardar el elemento que tenia el foco antes de abrir (para restaurar al cerrar)
    const previouslyFocused = document.activeElement

    // Selectores de elementos focusables segun ARIA Authoring Practices
    const FOCUSABLE = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    const container = containerRef.current

    // Foco inicial al primer elemento focusable (per D-05)
    const focusables = Array.from(container.querySelectorAll(FOCUSABLE))
    if (focusables.length > 0) {
      focusables[0].focus()
    } else {
      // Si no hay elementos focusables, foco al contenedor (necesita tabIndex={-1})
      container.focus()
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key !== 'Tab') return

      // Re-query en cada keydown para capturar contenido dinamico (per Pitfall 3 del RESEARCH)
      const focusableNow = Array.from(container.querySelectorAll(FOCUSABLE))
      if (focusableNow.length === 0) return

      const first = focusableNow[0]
      const last = focusableNow[focusableNow.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restaurar foco al elemento que lo tenia antes de abrir el modal
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [isOpen, onClose])

  return containerRef
}
