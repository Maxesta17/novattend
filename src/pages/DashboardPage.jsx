import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TEACHERS_DATA } from '../config/teachers.js'
import { isApiEnabled } from '../config/api.js'
import { getConvocatorias, getProfesores, getResumen } from '../services/api.js'
import PageHeader from '../components/features/PageHeader.jsx'
import TeacherCard from '../components/features/TeacherCard.jsx'
import StudentDetailPopup from '../components/features/StudentDetailPopup.jsx'
import AlertList from '../components/features/AlertList.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import Badge from '../components/ui/Badge.jsx'
import SearchInput from '../components/ui/SearchInput.jsx'

/**
 * Transforma la respuesta plana de la API en la jerarquia teacher->group->students.
 * @param {Array} profesores - Lista de profesores de la API
 * @param {Array} resumen - Lista plana de resumen con porcentajes
 * @returns {Array} Estructura compatible con TeacherCard
 */
function buildTeachersHierarchy(profesores, resumen) {
  return profesores.map(prof => {
    const profRows = resumen.filter(r => r.profesor_id === prof.id)
    const groupIds = [...new Set(profRows.map(r => r.grupo))]
    const groups = groupIds.map(gId => ({
      id: `${gId}-${prof.id}`,
      number: Number(gId.replace(/\D/g, '')) || gId,
      students: profRows
        .filter(r => r.grupo === gId)
        .map(r => ({
          id: r.alumno_id,
          name: r.nombre,
          weekly: r.semanal ?? 0,
          biweekly: r.quincenal ?? 0,
          monthly: r.mensual ?? 0,
        })),
    }))
    return {
      id: prof.id,
      name: prof.nombre,
      initial: (prof.nombre || '?')[0].toUpperCase(),
      groups,
    }
  })
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [teachers, setTeachers] = useState(null)
  const [convocatoria, setConvocatoria] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedTeacher, setExpandedTeacher] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showAlertPopup, setShowAlertPopup] = useState(false)

  // Carga de datos: API o mock
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!isApiEnabled()) {
        setTeachers(TEACHERS_DATA)
        setConvocatoria(null)
        return
      }
      const convocatorias = await getConvocatorias()
      const activeConv = convocatorias?.[0] ?? null
      setConvocatoria(activeConv)
      if (!activeConv) {
        setTeachers([])
        return
      }
      const [profesores, resumen] = await Promise.all([
        getProfesores(),
        getResumen(activeConv.id),
      ])
      setTeachers(buildTeachersHierarchy(profesores || [], resumen || []))
    } catch (err) {
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Estadisticas globales
  const totalStudents = useMemo(() => {
    if (!teachers) return 0
    return teachers.reduce(
      (acc, t) => acc + t.groups.reduce((g, gr) => g + gr.students.length, 0), 0
    )
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

  // Listado plano de alumnos para busqueda y alertas
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

  // Estado de carga
  if (loading) {
    return (
      <div className="min-h-dvh min-h-screen flex items-center justify-center bg-off-white">
        <p className="font-montserrat text-sm text-text-muted">Cargando dashboard...</p>
      </div>
    )
  }

  // Estado de error
  if (error) {
    return (
      <div className="min-h-dvh min-h-screen flex flex-col items-center justify-center gap-3 bg-off-white px-6">
        <p className="font-montserrat text-sm text-error text-center">{error}</p>
        <button onClick={loadData} className="font-montserrat text-sm text-burgundy underline">
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
          <h3 className="font-cinzel text-[15px] font-semibold text-text-dark mt-4 mb-3">
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
