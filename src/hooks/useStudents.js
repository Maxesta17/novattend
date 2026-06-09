import { useState, useEffect, useRef, useCallback } from 'react'
import { isApiEnabled } from '../config/api'
import { getAlumnos, getAsistencia } from '../services/api'
import { formatLocalDate } from '../utils/dateUtils'

const GROUPS = ['G1', 'G2', 'G3', 'G4']

// Datos mock para modo sin API
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
 * Maneja cache por grupo con useRef, prefetch paralelo de G2-G4,
 * y modo mock cuando la API no esta habilitada.
 *
 * Si selectedDate no es hoy, pre-carga la asistencia ya guardada de ese dia
 * para permitir edicion (los toggles reflejan lo registrado, no parten en blanco).
 *
 * @param {Object|null} convocatoria - Convocatoria activa (con .id)
 * @param {string|null} profesorId - ID del profesor (ej: "prof-samuel")
 * @param {string} [selectedDate] - Dia a registrar en formato yyyy-MM-dd (por defecto hoy)
 * @returns {{
 *   students: Array<{id?: string, name: string, present: boolean}>,
 *   loadingStudents: boolean,
 *   loadError: string|null,
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

  // Cache de alumnos por grupo (evita recargas al cambiar de tab)
  const cacheRef = useRef({})
  // Token de carga: solo la carga mas reciente puede escribir el estado
  // (descarta respuestas obsoletas si el usuario cambia de grupo/dia rapido).
  const loadTokenRef = useRef(0)
  // Grupo vigente accesible desde callbacks diferidos (evita stale closure).
  const selectedGroupRef = useRef(GROUPS[0])
  selectedGroupRef.current = selectedGroup

  const todayIso = formatLocalDate(new Date())
  const isPastDay = Boolean(selectedDate) && selectedDate !== todayIso

  /**
   * Aplica la presencia inicial a la lista base segun el dia activo.
   * Para hoy, todos parten en false. Para un dia pasado, carga la asistencia real.
   */
  const withInitialPresence = useCallback(async (base, grupo) => {
    if (!isPastDay) return base.map(a => ({ ...a, present: false }))
    try {
      const registros = await getAsistencia(convocatoria.id, profesorId, grupo, selectedDate)
      return applyAttendance(base, registros)
    } catch {
      // Si falla la carga del dia pasado, partir en blanco (no bloquear el flujo)
      return base.map(a => ({ ...a, present: false }))
    }
  }, [convocatoria, profesorId, selectedDate, isPastDay])

  const loadStudents = useCallback(async (grupo) => {
    const token = ++loadTokenRef.current
    const isStale = () => token !== loadTokenRef.current

    if (!isApiEnabled() || !convocatoria) {
      const mockNames = MOCK_GROUPS[grupo] || []
      setStudents(mockNames.map(name => ({ name, present: false })))
      setLoadingStudents(false)
      return
    }

    setLoadError(null)
    setLoadingStudents(true)
    try {
      // La lista base de cada grupo se cachea; la presencia se aplica por dia.
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
  }, [convocatoria, profesorId, withInitialPresence])

  // Carga inicial + prefetch de los demas grupos
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      if (!isApiEnabled() || !convocatoria) {
        const mockNames = MOCK_GROUPS[GROUPS[0]] || []
        if (!cancelled) {
          setStudents(mockNames.map(name => ({ name, present: false })))
          setLoadingStudents(false)
        }
        return
      }

      try {
        const alumnos = await getAlumnos(convocatoria.id, profesorId, GROUPS[0])
        const mapped = mapAlumnos(alumnos)
        cacheRef.current[GROUPS[0]] = mapped
        if (!cancelled) {
          setStudents(await withInitialPresence(mapped, GROUPS[0]))
          setLoadingStudents(false)
        }
      } catch (err) {
        if (!cancelled) {
          setStudents([])
          setLoadError(err.message || 'No se pudieron cargar los alumnos. Revisa tu conexion.')
          setLoadingStudents(false)
        }
      }

      // Prefetch silencioso de G2, G3, G4 para cambio de tab instantaneo
      GROUPS.slice(1).forEach(g => {
        getAlumnos(convocatoria.id, profesorId, g)
          .then(alumnos => {
            cacheRef.current[g] = mapAlumnos(alumnos)
          })
          .catch(() => {})
      })
    }

    init()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Al cambiar el dia activo, recargar el grupo seleccionado con la presencia
  // correspondiente (vacia para hoy, asistencia real para un dia pasado).
  // Comparamos contra el dia previo (robusto en StrictMode); la carga inicial
  // ya cubre el primer render, asi que solo recargamos en cambios reales.
  const prevDateRef = useRef(selectedDate)
  useEffect(() => {
    if (prevDateRef.current === selectedDate) return
    prevDateRef.current = selectedDate
    // Diferido a microtarea para evitar setState sincrono dentro del effect.
    // Lee el grupo desde el ref para usar siempre el vigente (no el capturado).
    queueMicrotask(() => loadStudents(selectedGroupRef.current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  /** Cambiar de grupo y cargar sus alumnos */
  const handleGroupChange = (grupo) => {
    setSelectedGroup(grupo)
    loadStudents(grupo)
  }

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
