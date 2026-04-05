import { useState, useEffect, useCallback, useMemo } from 'react'
import useConvocatorias from './useConvocatorias.js'
import useDebounce from './useDebounce.js'
import { TEACHERS_DATA } from '../config/teachers.js'
import { isApiEnabled } from '../config/api'
import { getProfesores, getResumen } from '../services/api'
import buildTeachersHierarchy from '../utils/buildTeachersHierarchy.js'

/**
 * Hook custom que encapsula toda la logica de datos, estado y handlers del Dashboard CEO.
 *
 * Consume useConvocatorias internamente (no duplica su logica), gestiona la carga
 * de profesores/resumen via API, y provee todos los valores que DashboardPage necesita.
 *
 * @returns {{
 *   convocatorias: Array,
 *   convocatoria: Object|null,
 *   reload: () => Promise<void>,
 *   teachers: Array|null,
 *   loading: boolean,
 *   error: string|null,
 *   expandedTeacher: string|null,
 *   searchQuery: string,
 *   setSearchQuery: (q: string) => void,
 *   selectedStudent: Object|null,
 *   setSelectedStudent: (s: Object|null) => void,
 *   showAlertPopup: boolean,
 *   handleAlertClick: () => void,
 *   handleAlertClose: () => void,
 *   handleStudentClose: () => void,
 *   handleClear: () => void,
 *   handleTeacherToggle: (id: string) => void,
 *   handleConvChange: (conv: Object) => Promise<void>,
 *   totalStudents: number,
 *   globalAttendance: number,
 *   alertStudents: Array,
 *   searchResults: Array,
 * }}
 */
export default function useDashboard() {
  const {
    convocatorias,
    selectedConvocatoria: convocatoria,
    setSelectedConvocatoria,
    loading: convsLoading,
    error: convsError,
    reload,
  } = useConvocatorias()

  const [teachers, setTeachers] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedTeacher, setExpandedTeacher] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showAlertPopup, setShowAlertPopup] = useState(false)
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Handlers estabilizados con useCallback para componentes memorizados
  const handleAlertClick = useCallback(() => setShowAlertPopup(true), [])
  const handleAlertClose = useCallback(() => setShowAlertPopup(false), [])
  const handleStudentClose = useCallback(() => setSelectedStudent(null), [])
  const handleClear = useCallback(() => setSearchQuery(''), [])
  const handleTeacherToggle = useCallback((id) => setExpandedTeacher(prev => prev === id ? null : id), [])

  // Carga datos de una convocatoria concreta
  const loadConvData = async (conv) => {
    const [profesores, resumen] = await Promise.all([
      getProfesores(),
      getResumen(conv.id),
    ])
    setTeachers(buildTeachersHierarchy(profesores || [], resumen || []))
  }

  // Cuando el hook carga las convocatorias, cargar datos de la seleccionada
  useEffect(() => {
    if (convsLoading) return

    if (convsError) {
      setError(convsError)
      setLoading(false)
      return
    }

    if (!isApiEnabled()) {
      setTeachers(TEACHERS_DATA)
      setLoading(false)
      return
    }

    if (!convocatoria) {
      setTeachers([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    loadConvData(convocatoria)
      .then(() => { if (!cancelled) setLoading(false) })
      .catch(err => {
        if (!cancelled) {
          setError(err.message || 'Error al cargar datos')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [convsLoading, convsError, convocatoria]) // loadConvData es local sin useCallback, deps reales son convsLoading/convsError/convocatoria

  // Cambio de convocatoria desde el selector
  const handleConvChange = async (conv) => {
    setSelectedConvocatoria(conv)
    setLoading(true)
    setError(null)
    setExpandedTeacher(null)
    setSearchQuery('')
    try {
      await loadConvData(conv)
    } catch (err) {
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const totalStudents = useMemo(() => {
    if (!teachers) return 0
    return teachers.reduce((acc, t) => acc + t.groups.reduce((g, gr) => g + gr.students.length, 0), 0)
  }, [teachers])

  const globalAttendance = useMemo(() => {
    if (!teachers || teachers.length === 0) return 0
    return Math.round(
      teachers.reduce((acc, t) =>
        acc + t.groups.reduce((g, gr) => {
          if (gr.students.length === 0) return g
          return g + gr.students.reduce((s, st) => s + st.monthly, 0) / gr.students.length
        }, 0) / (t.groups.length || 1), 0
      ) / teachers.length
    )
  }, [teachers])

  const allStudents = useMemo(() => {
    if (!teachers) return []
    return teachers.flatMap(teacher =>
      teacher.groups.flatMap(group =>
        group.students.map(student => ({
          ...student,
          teacher: teacher.name,
          teacherId: teacher.id,
          group: group.number,
        }))
      )
    )
  }, [teachers])

  const alertStudents = useMemo(() => allStudents.filter(s => s.weekly <= 80), [allStudents])

  const searchResults = useMemo(() => {
    if (debouncedSearch.length < 2) return []
    return allStudents.filter(s => s.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
  }, [debouncedSearch, allStudents])

  return {
    convocatorias,
    convocatoria,
    reload,
    teachers,
    loading,
    error,
    expandedTeacher,
    searchQuery,
    setSearchQuery,
    selectedStudent,
    setSelectedStudent,
    showAlertPopup,
    handleAlertClick,
    handleAlertClose,
    handleStudentClose,
    handleClear,
    handleTeacherToggle,
    handleConvChange,
    totalStudents,
    globalAttendance,
    alertStudents,
    searchResults,
  }
}
