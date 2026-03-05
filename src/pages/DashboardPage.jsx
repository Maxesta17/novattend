import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TEACHERS_DATA } from '../config/teachers.js'
import { isApiEnabled } from '../config/api.js'
import { getProfesores, getResumen } from '../services/api.js'
import useConvocatorias from '../hooks/useConvocatorias.js'
import PageHeader from '../components/features/PageHeader.jsx'
import TeacherCard from '../components/features/TeacherCard.jsx'
import StudentDetailPopup from '../components/features/StudentDetailPopup.jsx'
import AlertList from '../components/features/AlertList.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import Badge from '../components/ui/Badge.jsx'
import SearchInput from '../components/ui/SearchInput.jsx'
import ConvocatoriaSelector from '../components/features/ConvocatoriaSelector.jsx'
import buildTeachersHierarchy from '../utils/buildTeachersHierarchy.js'

export default function DashboardPage() {
  const navigate = useNavigate()
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
  }, [convsLoading, convsError, convocatoria]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (searchQuery.length < 2) return []
    return allStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [searchQuery, allStudents])

  if (loading) {
    return (
      <div className="min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-off-white box-border">
        <div className="bg-burgundy-dark rounded-b-3xl px-4 pt-4 pb-3 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-[42px] rounded-xl bg-white/10" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-white/10 rounded" />
              <div className="h-3 w-32 bg-white/10 rounded" />
            </div>
          </div>
          <div className="flex gap-1.5 mb-3">
            <div className="flex-1 h-16 rounded-xl bg-white/[0.06]" />
            <div className="flex-1 h-16 rounded-xl bg-white/[0.06]" />
            <div className="flex-1 h-16 rounded-xl bg-white/[0.06]" />
          </div>
        </div>
        <div className="px-4 pt-4 space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white border border-border rounded-xl p-3 flex items-center gap-3 animate-pulse">
              <div className="size-[38px] rounded-[9px] bg-border-light" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-border-light rounded w-1/2" />
                <div className="h-3 bg-border-light rounded w-1/3" />
              </div>
              <div className="h-5 w-10 bg-border-light rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-dvh min-h-screen flex flex-col items-center justify-center gap-3 bg-off-white px-6">
        <p className="font-montserrat text-sm text-error text-center text-pretty">{error}</p>
        <button onClick={reload} className="font-montserrat text-sm text-burgundy underline">
          Reintentar
        </button>
      </div>
    )
  }

  const subtitle = convocatoria?.nombre || 'LingNova Academy'

  return (
    <>
      <div className="min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-off-white box-border pb-10">
        {/* Header */}
        <PageHeader
          title="Dashboard"
          subtitle={subtitle}
          badge={<Badge variant="admin">ADMIN</Badge>}
          onLogout={() => { sessionStorage.removeItem('user'); navigate('/') }}
        >
          <ConvocatoriaSelector
            convocatorias={convocatorias}
            selectedId={convocatoria?.id}
            onChange={handleConvChange}
          />
          <div className="flex gap-1.5 mb-3">
            <StatCard value={totalStudents} label="Alumnos" color="gold" variant="dark" />
            <StatCard value={`${globalAttendance}%`} label="Asistencia" color="gold" variant="dark" />
            <StatCard
              value={alertStudents.length}
              label="Alerta"
              color="gold"
              variant="dark"
              onClick={() => setShowAlertPopup(true)}
              className="hover:bg-gold/15"
            />
          </div>
        </PageHeader>

        {/* Buscador */}
        <div className="px-4 pt-4 pb-3">
          <SearchInput
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Buscar alumno..."
          />

          {searchResults.length > 0 && (
            <div className="mt-3">
              {searchResults.map(student => (
                <div
                  key={student.id}
                  onClick={() => { setSelectedStudent(student); setSearchQuery('') }}
                  className="bg-white border border-border rounded-[10px] py-2.5 px-3 mb-1.5 cursor-pointer transition-all duration-200 hover:bg-burgundy-soft"
                >
                  <div className="font-montserrat text-[13px] font-medium text-text-dark">
                    {student.name}
                  </div>
                  <div className="font-montserrat text-[11px] text-text-muted mt-0.5">
                    {student.teacher} · Grupo {student.group}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista de profesores */}
        <div className="px-4">
          <h3 className="font-cinzel text-[15px] font-semibold text-text-dark mt-4 mb-3 text-balance">
            Profesores
          </h3>
          {(teachers || []).map(teacher => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              isExpanded={expandedTeacher === teacher.id}
              onToggle={() => setExpandedTeacher(expandedTeacher === teacher.id ? null : teacher.id)}
              onStudentClick={setSelectedStudent}
            />
          ))}
        </div>
      </div>

      {/* Popups */}
      <StudentDetailPopup
        student={selectedStudent}
        convocatoriaId={convocatoria?.id}
        onClose={() => setSelectedStudent(null)}
      />

      {showAlertPopup && (
        <AlertList
          students={alertStudents}
          onStudentClick={(s) => { setSelectedStudent(s); setShowAlertPopup(false) }}
          onClose={() => setShowAlertPopup(false)}
        />
      )}
    </>
  )
}
