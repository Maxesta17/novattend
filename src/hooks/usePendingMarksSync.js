import { useState, useRef, useEffect, useCallback } from 'react'
import { savePendingMarks, loadPendingMarks } from '../utils/pendingMarksStorage'

/**
 * Sincroniza las marcas de asistencia con sessionStorage (fix M5 auditoria).
 *
 * Si un 401 expulsa al profesor a mitad de lista (clearSession solo borra la
 * clave 'user', ver config/session.js), las marcas en memoria de useStudents
 * se pierden al desmontarse AttendancePage. Este hook las persiste (con
 * debounce, via utils/pendingMarksStorage) cada vez que el profesor las
 * cambia, y expone tryRestore para recuperarlas al volver a montar la
 * pagina con la misma convocatoria/grupo/dia.
 *
 * @param {string|null} convocatoriaId
 * @param {string} grupo - grupo activo (para el efecto de persistencia)
 * @param {string} fecha - dia activo yyyy-MM-dd (para el efecto de persistencia)
 * @param {Array<{id?: string, name: string, present: boolean}>} students
 * @returns {{
 *   restoredMarks: boolean,
 *   dismissRestoredMarks: () => void,
 *   markUserEdited: () => void,
 *   tryRestore: (grupo: string, fecha: string, base: Array) => {students: Array, marks: Object}|null
 * }}
 */
export default function usePendingMarksSync(convocatoriaId, grupo, fecha, students) {
  const [restoredMarks, setRestoredMarks] = useState(false)
  // true si el ultimo cambio de `students` vino de un toggle del profesor
  // (evita persistir cargas programaticas del roster)
  const userEditedRef = useRef(false)

  useEffect(() => {
    if (!userEditedRef.current) return
    userEditedRef.current = false
    if (!convocatoriaId) return
    savePendingMarks(convocatoriaId, grupo, fecha, students)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students])

  /**
   * Intenta restaurar un snapshot pendiente de (grupo, fecha) sobre `base`.
   * Parametros explicitos (no el grupo/fecha "actual" del hook) para evitar
   * condiciones de carrera si loadStudents carga un grupo distinto del
   * seleccionado en ese instante.
   */
  const tryRestore = useCallback((targetGrupo, targetFecha, base) => {
    const pending = convocatoriaId ? loadPendingMarks(convocatoriaId, targetGrupo, targetFecha) : null
    setRestoredMarks(Boolean(pending))
    if (!pending) return null
    return {
      students: base.map(a => ({ ...a, present: pending.marks[a.id || a.name] === true })),
      marks: pending.marks,
    }
  }, [convocatoriaId])

  const dismissRestoredMarks = useCallback(() => setRestoredMarks(false), [])
  const markUserEdited = useCallback(() => { userEditedRef.current = true }, [])

  return { restoredMarks, dismissRestoredMarks, markUserEdited, tryRestore }
}
