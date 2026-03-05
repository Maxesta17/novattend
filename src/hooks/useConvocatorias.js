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
import { useState, useEffect, useCallback } from 'react'
import { isApiEnabled } from '../config/api'
import { getConvocatorias } from '../services/api'

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
      const active = allConvs?.[0] ?? null
      setSelectedConvocatoria(active)
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
