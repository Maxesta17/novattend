import { useRef, useState, useCallback } from 'react'
import { getAsistencia } from '../services/api'

/** Aplica los registros de asistencia del backend a la lista base de alumnos. */
function applyAttendance(base, registros) {
  const presentByKey = {}
  ;(registros || []).forEach(r => { presentByKey[r.alumno_id] = r.presente === true })
  // Misma clave que el guardado (alumno_id = id || name) para que el match
  // funcione tanto si la asistencia se registro por id como por nombre.
  return base.map(a => ({ ...a, present: presentByKey[a.id || a.name] === true }))
}

/**
 * Resuelve la presencia inicial de un grupo/dia por orden de prioridad:
 * 1) marcas de esta misma instancia de componente (cambio de tab rapido);
 * 2) snapshot de sessionStorage de una instancia anterior (tryRestore, ver
 *    usePendingMarksSync -- fix M5: sobrevive a un 401 que desmonto la pagina);
 * 3) asistencia ya guardada en el backend (hoy incluido).
 *
 * Tambien expone snapshotPresence para congelar las marcas visibles de un
 * grupo/dia antes de cambiar de tab (no se pierden dentro de la sesion).
 *
 * @param {Object|null} convocatoria - Convocatoria activa (con .id)
 * @param {string|null} profesorId
 * @param {(grupo: string, fecha: string, base: Array) => {students: Array, marks: Object}|null} tryRestore - de usePendingMarksSync
 * @param {() => void} dismissRestoredMarks - de usePendingMarksSync
 * @returns {{
 *   presenceLoadFailed: boolean,
 *   snapshotPresence: (dateIso: string, grupo: string, students: Array) => void,
 *   getSnapshot: (dateIso: string, grupo: string) => Object|undefined,
 *   loadPresence: (base: Array, grupo: string, fecha: string) => Promise<Array>
 * }}
 */
export default function usePresencePreload(convocatoria, profesorId, tryRestore, dismissRestoredMarks) {
  const [presenceLoadFailed, setPresenceLoadFailed] = useState(false)
  // Marcas de la sesion por "dia|grupo" (dura mientras el componente sigue montado)
  const sessionPresenceRef = useRef({})
  const presenceFailedRef = useRef(false)

  const snapshotPresence = useCallback((dateIso, grupo, students) => {
    // No congelar los ceros de una pre-carga fallida como si fueran marcas
    if (presenceFailedRef.current || !students?.length) return
    const map = {}
    students.forEach(s => { map[s.id || s.name] = s.present })
    sessionPresenceRef.current[`${dateIso}|${grupo}`] = map
  }, [])

  const getSnapshot = useCallback(
    (dateIso, grupo) => sessionPresenceRef.current[`${dateIso}|${grupo}`],
    []
  )

  const loadPresence = useCallback(async (base, grupo, fecha) => {
    const saved = sessionPresenceRef.current[`${fecha}|${grupo}`]
    if (saved) {
      presenceFailedRef.current = false
      setPresenceLoadFailed(false)
      dismissRestoredMarks() // este camino no es una restauracion nueva
      return base.map(a => ({ ...a, present: saved[a.id || a.name] === true }))
    }

    const pending = tryRestore(grupo, fecha, base)
    if (pending) {
      presenceFailedRef.current = false
      setPresenceLoadFailed(false)
      // Alimentar tambien el cache en memoria para que un cambio de tab
      // posterior (sin volver a leer sessionStorage) mantenga la marca.
      sessionPresenceRef.current[`${fecha}|${grupo}`] = pending.marks
      return pending.students
    }

    try {
      const registros = await getAsistencia(convocatoria.id, profesorId, grupo, fecha)
      presenceFailedRef.current = false
      setPresenceLoadFailed(false)
      return applyAttendance(base, registros)
    } catch {
      // Propagar el fallo: la pagina avisa y bloquea guardar un dia pasado
      // (evita sobrescribir asistencia real con todo ceros sin saberlo).
      presenceFailedRef.current = true
      setPresenceLoadFailed(true)
      return base.map(a => ({ ...a, present: false }))
    }
  }, [convocatoria, profesorId, tryRestore, dismissRestoredMarks])

  return { presenceLoadFailed, snapshotPresence, getSnapshot, loadPresence }
}
