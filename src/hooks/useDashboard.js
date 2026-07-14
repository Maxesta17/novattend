import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import useConvocatorias from './useConvocatorias.js'
import useDebounce from './useDebounce.js'
import { TEACHERS_DATA } from '../config/teachers.js'
import { isApiEnabled } from '../config/api'
import { getProfesores, getResumen, AuthError } from '../services/api'
import buildTeachersHierarchy from '../utils/buildTeachersHierarchy.js'
import { aggregateAttendance } from '../utils/attendance.js'

/**
 * Hook custom que encapsula toda la logica de datos, estado y handlers del Dashboard CEO.
 *
 * Consume useConvocatorias internamente (no duplica su logica), gestiona la carga
 * de profesores/resumen via API, y provee todos los valores que DashboardPage necesita.
 *
 * Rendimiento (peaje Apps Script ~1,6s/llamada):
 * - getProfesores se dispara al montar, en paralelo con getConvocatorias (sin waterfall).
 * - Profesores se cachean en un ref: cambiar de convocatoria solo pide getResumen.
 * - Una unica via de carga (el effect) + token anti-race: gana la ultima seleccion.
 * - loading/error/teachers son derivados: el resultado se asocia a la convocatoria
 *   cargada, asi que un cambio de seleccion invalida el estado sin setState sincrono.
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
 *   handleStudentClose: () => void,
 *   handleClear: () => void,
 *   handleTeacherToggle: (id: string) => void,
 *   handleConvChange: (conv: Object) => void,
 *   totalStudents: number,
 *   globalAttendance: number,
 *   alertStudents: Array,
 *   streakStudents: Array,
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

  // Resultado de la ultima carga completada: a que convocatoria pertenece,
  // sus datos y su error. Solo se escribe en callbacks async (then/catch).
  const [loaded, setLoaded] = useState({ conv: null, teachers: null, error: null })
  const [expandedTeacher, setExpandedTeacher] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Cache de profesores (no varian entre convocatorias) + promesa en vuelo
  const profesoresCacheRef = useRef(null)
  const profesoresPromiseRef = useRef(null)
  // Token de carga: solo la carga mas reciente puede escribir el estado
  const loadTokenRef = useRef(0)

  // Handlers estabilizados con useCallback para componentes memorizados
  const handleStudentClose = useCallback(() => setSelectedStudent(null), [])
  const handleClear = useCallback(() => setSearchQuery(''), [])
  const handleTeacherToggle = useCallback((id) => setExpandedTeacher(prev => prev === id ? null : id), [])

  /**
   * Devuelve los profesores cacheados, reutiliza la promesa en vuelo si existe,
   * o dispara la peticion. Si falla, limpia la promesa para permitir reintento.
   */
  const fetchProfesores = useCallback(() => {
    if (profesoresCacheRef.current) return Promise.resolve(profesoresCacheRef.current)
    if (!profesoresPromiseRef.current) {
      profesoresPromiseRef.current = getProfesores()
        .then(profesores => {
          profesoresCacheRef.current = profesores
          return profesores
        })
        .catch(err => {
          profesoresPromiseRef.current = null
          throw err
        })
    }
    return profesoresPromiseRef.current
  }, [])

  // Prefetch de profesores al montar, en paralelo con getConvocatorias
  // (que dispara useConvocatorias). Evita el waterfall convocatorias->profesores.
  useEffect(() => {
    if (!isApiEnabled()) return
    // El error se ignora aqui: la carga real lo reintentara y lo mostrara.
    fetchProfesores().catch(() => {})
  }, [fetchProfesores])

  // Unica via de carga: cuando hay convocatoria seleccionada (inicial o por
  // cambio de selector), cargar profesores (cache) + resumen en paralelo.
  useEffect(() => {
    if (convsLoading || convsError) return
    if (!isApiEnabled() || !convocatoria) return

    const token = ++loadTokenRef.current
    const isStale = () => token !== loadTokenRef.current

    Promise.all([fetchProfesores(), getResumen(convocatoria.id)])
      .then(([profesores, resumen]) => {
        if (isStale()) return // otra carga mas reciente ya gano
        setLoaded({
          conv: convocatoria,
          teachers: buildTeachersHierarchy(profesores || [], resumen || []),
          error: null,
        })
      })
      .catch(err => {
        if (isStale()) return
        // Un 401 es sesion expirada, NO "sin datos": api.js ya emitio
        // auth:expired (redirige al login). No mostramos pantalla de error.
        if (err instanceof AuthError) return
        setLoaded(prev => ({
          conv: convocatoria,
          teachers: prev.teachers,
          error: err.message || 'Error al cargar datos',
        }))
      })
  }, [convsLoading, convsError, convocatoria, fetchProfesores])

  // Cambio de convocatoria desde el selector: solo actualiza la seleccion y
  // resetea la UI; la carga la dispara el effect (evita el doble fetch).
  const handleConvChange = useCallback((conv) => {
    setExpandedTeacher(null)
    setSearchQuery('')
    setSelectedConvocatoria(conv)
  }, [setSelectedConvocatoria])

  // Estados derivados: la carga esta "al dia" si el resultado pertenece a la
  // convocatoria seleccionada (comparacion por identidad: reload crea objetos nuevos).
  const apiMode = isApiEnabled()
  const upToDate = loaded.conv === convocatoria
  const loading = convsLoading || (apiMode && !convsError && Boolean(convocatoria) && !upToDate)
  const error = convsError || (upToDate ? loaded.error : null)
  const teachers = useMemo(() => {
    if (!apiMode) return TEACHERS_DATA
    return convocatoria ? loaded.teachers : []
  }, [apiMode, convocatoria, loaded.teachers])

  const totalStudents = useMemo(() => {
    if (!teachers) return 0
    return teachers.reduce((acc, t) => acc + t.groups.reduce((g, gr) => g + gr.students.length, 0), 0)
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

  // Asistencia global: % presentes sobre total de clases registradas
  // (formula compartida en src/utils/attendance.js)
  const globalAttendance = useMemo(() => aggregateAttendance(allStudents), [allStudents])

  // Alertas CEO: alumnos con 2+ faltas en la semana en curso (lun-jue)
  const alertStudents = useMemo(
    () => allStudents
      .filter(s => (s.faltasSemana ?? 0) >= 2)
      .sort((a, b) => (b.faltasSemana ?? 0) - (a.faltasSemana ?? 0)),
    [allStudents]
  )

  // Racha activa: alumnos cuyas 2+ ultimas clases consecutivas son falta
  const streakStudents = useMemo(
    () => allStudents
      .filter(s => (s.rachaFaltas ?? 0) >= 2)
      .sort((a, b) => (b.rachaFaltas ?? 0) - (a.rachaFaltas ?? 0)),
    [allStudents]
  )

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
    handleStudentClose,
    handleClear,
    handleTeacherToggle,
    handleConvChange,
    totalStudents,
    globalAttendance,
    alertStudents,
    streakStudents,
    searchResults,
  }
}
