import { useState, useEffect, useRef, useCallback } from 'react'
import { isApiEnabled } from '../config/api'
import { getAlumnos, getAsistencia } from '../services/api'
import { formatLocalDate } from '../utils/dateUtils'

const GROUPS = ['G1', 'G2', 'G3', 'G4']

// Datos mock SOLO para modo sin API (con API activa nunca se usan como fallback)
const MOCK_GROUPS = {
  G1: ['Laura Garcia', 'Carlos Ruiz', 'Maria Lopez', 'Pedro Sanchez', 'Ana Martin', 'David Fernandez', 'Elena Torres', 'Jorge Navarro', 'Lucia Romero', 'Pablo Jimenez', 'Sofia Alvarez', 'Hugo Moreno'],
  G2: ['Valentina Cruz', 'Mateo Herrera', 'Isabella Diaz', 'Sebastian Ortiz', 'Camila Reyes', 'Nicolas Vargas', 'Martina Castro', 'Emiliano Ramos', 'Renata Flores', 'Tomas Mendoza', 'Antonella Pena', 'Alejandro Silva'],
  G3: ['Bianca Wolff', 'Finn Becker', 'Clara Schmidt', 'Leon Muller', 'Emma Fischer', 'Paul Weber', 'Mia Richter', 'Luca Klein', 'Hannah Braun', 'Ben Hoffmann', 'Sophie Lange', 'Max Werner'],
  G4: ['Amelie Dubois', 'Louis Martin', 'Chloe Bernard', 'Hugo Petit', 'Lea Moreau', 'Theo Laurent', 'Manon Simon', 'Jules Michel', 'Zoe Leroy', 'Arthur Roux', 'Ines Fournier', 'Gabriel Bonnet'],
}

/** Mapea datos crudos de la API al formato del componente */
function mapAlumnos(alumnos) {
  return (alumnos || []).map(a => ({ id: a.id, name: a.nombre, present: false }))
}

/**
 * Aplica los registros de asistencia de un dia a la lista base de alumnos.
 * Cada alumno queda con present=true si tiene un registro presente ese dia.
 * @param {Array<{id?: string, name: string}>} base - Lista base de alumnos
 * @param {Array<{alumno_id: string, presente: boolean}>} registros
 * @returns {Array<{id?: string, name: string, present: boolean}>}
 */
function applyAttendance(base, registros) {
  const presentByKey = {}
  ;(registros || []).forEach(r => { presentByKey[r.alumno_id] = r.presente === true })
  // Misma clave que el guardado (alumno_id = id || name) para que el match
  // funcione tanto si la asistencia se registro por id como por nombre.
  return base.map(a => ({ ...a, present: presentByKey[a.id || a.name] === true }))
}

/**
 * Hook custom para gestionar la carga y estado de alumnos por grupo.
 *
 * Maneja cache de roster por grupo con useRef, prefetch paralelo de G2-G4,
 * y modo mock SOLO cuando la API no esta habilitada (con API activa y sin
 * convocatoria no carga nada: la pagina debe redirigir al login).
 *
 * Pre-carga la asistencia ya guardada del dia activo (hoy incluido) para que
 * los toggles reflejen lo registrado y no se sobrescriba sin querer. Si esa
 * pre-carga falla, lo expone en presenceLoadFailed para que la pagina avise
 * y bloquee el guardado de un dia pasado. Las marcas de la sesion se
 * conservan por dia+grupo al cambiar de tab (no se pierden al volver).
 *
 * @param {Object|null} convocatoria - Convocatoria activa (con .id)
 * @param {string|null} profesorId - ID del profesor (ej: "prof-samuel")
 * @param {string} [selectedDate] - Dia a registrar en formato yyyy-MM-dd (por defecto hoy)
 * @returns {{
 *   students: Array<{id?: string, name: string, present: boolean}>,
 *   loadingStudents: boolean,
 *   loadError: string|null,
 *   presenceLoadFailed: boolean,
 *   retryLoad: () => void,
 *   selectedGroup: string,
 *   setSelectedGroup: (grupo: string) => void,
 *   toggleStudent: (index: number) => void,
 *   toggleAll: () => void,
 *   presentCount: number,
 *   absentCount: number,
 *   attendancePercent: number
 * }}
 */
export default function useStudents(convocatoria, profesorId, selectedDate) {
  const [selectedGroup, setSelectedGroup] = useState(GROUPS[0])
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadError, setLoadError] = useState(null)
  // Fallo al pre-cargar la asistencia ya guardada del dia activo
  const [presenceLoadFailed, setPresenceLoadFailed] = useState(false)

  // Cache del roster por grupo (evita recargas al cambiar de tab)
  const cacheRef = useRef({})
  // Marcas de la sesion por "dia|grupo" (se restauran al volver a un tab)
  const sessionPresenceRef = useRef({})
  // Token de carga: solo la carga mas reciente puede escribir el estado
  // (descarta respuestas obsoletas si el usuario cambia de grupo/dia rapido).
  const loadTokenRef = useRef(0)
  // Refs espejo para callbacks diferidos (evitan stale closures)
  const selectedGroupRef = useRef(GROUPS[0])
  selectedGroupRef.current = selectedGroup
  const studentsRef = useRef([])
  studentsRef.current = students
  const presenceFailedRef = useRef(false)

  const todayIso = formatLocalDate(new Date())
  const activeDate = selectedDate || todayIso

  /**
   * Guarda las marcas visibles del grupo/dia indicado para restaurarlas al
   * volver a ese tab durante la sesion de marcado (fix marcas perdidas).
   */
  const snapshotPresence = useCallback((dateIso, grupo) => {
    // No congelar los ceros de una pre-carga fallida como si fueran marcas
    if (presenceFailedRef.current || studentsRef.current.length === 0) return
    const map = {}
    studentsRef.current.forEach(s => { map[s.id || s.name] = s.present })
    sessionPresenceRef.current[`${dateIso}|${grupo}`] = map
  }, [])

  /**
   * Presencia inicial del grupo para el dia activo: marcas de esta sesion si
   * existen; si no, la asistencia ya guardada en el backend (hoy incluido).
   */
  const withInitialPresence = useCallback(async (base, grupo) => {
    const saved = sessionPresenceRef.current[`${activeDate}|${grupo}`]
    if (saved) {
      presenceFailedRef.current = false
      setPresenceLoadFailed(false)
      return base.map(a => ({ ...a, present: saved[a.id || a.name] === true }))
    }
    try {
      const registros = await getAsistencia(convocatoria.id, profesorId, grupo, activeDate)
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
  }, [convocatoria, profesorId, activeDate])

  const loadStudents = useCallback(async (grupo) => {
    const token = ++loadTokenRef.current
    const isStale = () => token !== loadTokenRef.current

    // Fallback a mocks SOLO sin API (conservando marcas de la sesion).
    if (!isApiEnabled()) {
      const saved = sessionPresenceRef.current[`${activeDate}|${grupo}`]
      const mockNames = MOCK_GROUPS[grupo] || []
      setStudents(mockNames.map(name => ({ name, present: saved ? saved[name] === true : false })))
      setLoadingStudents(false)
      return
    }
    // Con API activa y sin convocatoria NO se simula nada: lista vacia
    // (la pagina redirige al login para recalcular convocatorias activas).
    if (!convocatoria) {
      setStudents([])
      setLoadingStudents(false)
      return
    }

    setLoadError(null)
    setLoadingStudents(true)
    try {
      // El roster de cada grupo se cachea; la presencia se aplica por dia.
      let base = cacheRef.current[grupo]
      if (!base) {
        base = mapAlumnos(await getAlumnos(convocatoria.id, profesorId, grupo))
        cacheRef.current[grupo] = base
      }
      const withPresence = await withInitialPresence(base, grupo)
      if (isStale()) return // otra carga mas reciente ya gano
      setStudents(withPresence)
    } catch (err) {
      if (isStale()) return
      setStudents([])
      setLoadError(err.message || 'No se pudieron cargar los alumnos. Revisa tu conexion.')
    }
    if (!isStale()) setLoadingStudents(false)
  }, [convocatoria, profesorId, activeDate, withInitialPresence])

  // Carga inicial + prefetch silencioso de G2-G4 para cambio de tab instantaneo
  useEffect(() => {
    loadStudents(GROUPS[0])
    if (isApiEnabled() && convocatoria) {
      GROUPS.slice(1).forEach(g => {
        getAlumnos(convocatoria.id, profesorId, g)
          .then(alumnos => { cacheRef.current[g] = mapAlumnos(alumnos) })
          .catch(() => {})
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Al cambiar el dia activo, recargar el grupo seleccionado con la presencia
  // de ese dia, conservando antes las marcas del dia previo.
  const prevDateRef = useRef(selectedDate)
  useEffect(() => {
    if (prevDateRef.current === selectedDate) return
    snapshotPresence(prevDateRef.current || todayIso, selectedGroupRef.current)
    prevDateRef.current = selectedDate
    // Diferido a microtarea para evitar setState sincrono dentro del effect.
    queueMicrotask(() => loadStudents(selectedGroupRef.current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  /** Cambiar de grupo conservando las marcas del grupo actual */
  const handleGroupChange = (grupo) => {
    snapshotPresence(activeDate, selectedGroup)
    setSelectedGroup(grupo)
    loadStudents(grupo)
  }

  /** Reintentar la carga del grupo activo (roster y/o pre-carga de asistencia) */
  const retryLoad = () => loadStudents(selectedGroupRef.current)

  /** Alternar asistencia de un alumno por indice (inmutable) */
  const toggleStudent = (index) => {
    setStudents(prev => prev.map((s, i) => (
      i === index ? { ...s, present: !s.present } : s
    )))
  }

  /** Marcar/desmarcar todos los alumnos */
  const toggleAll = () => {
    setStudents(prev => {
      const allPresent = prev.every(s => s.present)
      return prev.map(s => ({ ...s, present: !allPresent }))
    })
  }

  // Estadisticas derivadas
  const presentCount = students.filter(s => s.present).length
  const totalCount = students.length
  const absentCount = totalCount - presentCount
  const attendancePercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

  return {
    students,
    loadingStudents,
    loadError,
    presenceLoadFailed,
    retryLoad,
    selectedGroup,
    setSelectedGroup: handleGroupChange,
    toggleStudent,
    toggleAll,
    presentCount,
    absentCount,
    attendancePercent,
  }
}

export { GROUPS }
