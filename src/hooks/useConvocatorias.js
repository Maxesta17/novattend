import { useState, useEffect, useCallback } from 'react'
import { isApiEnabled } from '../config/api'
import { getConvocatorias } from '../services/api'

/**
 * Elige la convocatoria preseleccionada: la de `fecha_inicio` mas reciente.
 *
 * Antes se tomaba `allConvs[0]`, es decir la primera FILA de la hoja. Con
 * varias convocatorias activas a la vez eso mostraba un curso antiguo: el
 * Dashboard del CEO ensenaba "abril 2026" aunque hubiera cursos posteriores.
 *
 * Las fechas llegan en ISO (yyyy-MM-dd) ya normalizadas por el backend, asi
 * que comparar como texto equivale a comparar cronologicamente. Si ninguna
 * trae fecha usable, el orden original se conserva y gana la primera, que es
 * el comportamiento anterior.
 *
 * @param {Array|null|undefined} convs - Convocatorias activas
 * @returns {Object|null} La convocatoria a preseleccionar, o null si no hay
 */
function pickDefault(convs) {
  if (!convs?.length) return null
  const byDateDesc = (a, b) =>
    String(b?.fecha_inicio ?? '').localeCompare(String(a?.fecha_inicio ?? ''))
  return [...convs].sort(byDateDesc)[0] ?? null
}

/**
 * Hook custom para gestionar la carga y seleccion de convocatorias.
 *
 * Consulta convocatorias activas via API y permite cambiar entre ellas.
 * Si la API no esta habilitada, expone estado vacio (modo mock).
 *
 * @returns {{
 *   convocatorias: Array,
 *   selectedConvocatoria: Object|null,
 *   setSelectedConvocatoria: (conv: Object) => void,
 *   loading: boolean,
 *   error: string|null,
 *   reload: () => Promise<void>
 * }}
 */
export default function useConvocatorias() {
  const [convocatorias, setConvocatorias] = useState([])
  const [selectedConvocatoria, setSelectedConvocatoria] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /** Carga (o recarga) la lista de convocatorias activas */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!isApiEnabled()) {
        setConvocatorias([])
        setSelectedConvocatoria(null)
        return
      }
      const allConvs = await getConvocatorias()
      setConvocatorias(allConvs || [])
      setSelectedConvocatoria(pickDefault(allConvs))
    } catch (err) {
      setError(err.message || 'Error al cargar convocatorias')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      await load()
      // Proteccion contra actualizacion en componente desmontado
      if (cancelled) return
    }

    init()
    return () => { cancelled = true }
  }, [load])

  return {
    convocatorias,
    selectedConvocatoria,
    setSelectedConvocatoria,
    loading,
    error,
    reload: load,
  }
}
