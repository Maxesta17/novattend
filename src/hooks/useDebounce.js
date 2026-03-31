import { useState, useEffect } from 'react'

/**
 * Hook de debounce. Retrasa la actualizacion del valor hasta que deja de cambiar.
 * @param {*} value - Valor a debounce-ar
 * @param {number} delay - Milisegundos de retraso
 * @returns {*} Valor debounced
 */
export default function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}
