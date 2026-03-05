/**
 * Hook custom para gestionar la carga y estado de alumnos por grupo.
 *
 * Maneja cache por grupo con useRef, prefetch paralelo de G2-G4,
 * y modo mock cuando la API no esta habilitada.
 *
 * @param {Object|null} convocatoria - Convocatoria activa (con .id)
 * @param {string|null} profesorId - ID del profesor (ej: "prof-samuel")
 * @returns {{
 *   students: Array<{id?: string, name: string, present: boolean}>,
 *   loadingStudents: boolean,
 *   selectedGroup: string,
 *   setSelectedGroup: (grupo: string) => void,
 *   toggleStudent: (index: number) => void,
 *   toggleAll: () => void,
 *   presentCount: number,
 *   absentCount: number,
 *   attendancePercent: number
 * }}
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { isApiEnabled } from '../config/api'
import { getAlumnos } from '../services/api'

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

export default function useStudents(convocatoria, profesorId) {
  const [selectedGroup, setSelectedGroup] = useState(GROUPS[0])
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(true)

  // Cache de alumnos por grupo (evita recargas al cambiar de tab)
  const cacheRef = useRef({})

  const loadStudents = useCallback(async (grupo) => {
    if (!isApiEnabled() || !convocatoria) {
      const mockNames = MOCK_GROUPS[grupo] || []
      setStudents(mockNames.map(name => ({ name, present: false })))
      setLoadingStudents(false)
      return
    }

    // Si ya tenemos los datos en cache, usarlos directamente
    if (cacheRef.current[grupo]) {
      setStudents(cacheRef.current[grupo].map(a => ({ ...a, present: false })))
      setLoadingStudents(false)
      return
    }

    setLoadingStudents(true)
    try {
      const alumnos = await getAlumnos(convocatoria.id, profesorId, grupo)
      const mapped = mapAlumnos(alumnos)
      cacheRef.current[grupo] = mapped
      setStudents(mapped)
    } catch {
      setStudents([])
    }
    setLoadingStudents(false)
  }, [convocatoria, profesorId])

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
          setStudents(mapped)
          setLoadingStudents(false)
        }
      } catch {
        if (!cancelled) {
          setStudents([])
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

  /** Cambiar de grupo y cargar sus alumnos */
  const handleGroupChange = (grupo) => {
    setSelectedGroup(grupo)
    loadStudents(grupo)
  }

  /** Alternar asistencia de un alumno por indice */
  const toggleStudent = (index) => {
    const updated = [...students]
    updated[index].present = !updated[index].present
    setStudents(updated)
  }

  /** Marcar/desmarcar todos los alumnos */
  const toggleAll = () => {
    const allPresent = students.every(s => s.present)
    setStudents(students.map(s => ({ ...s, present: !allPresent })))
  }

  // Estadisticas derivadas
  const presentCount = students.filter(s => s.present).length
  const totalCount = students.length
  const absentCount = totalCount - presentCount
  const attendancePercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

  return {
    students,
    loadingStudents,
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
