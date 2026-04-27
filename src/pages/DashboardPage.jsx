import { useNavigate } from 'react-router-dom'
import useDashboard from '../hooks/useDashboard.js'
import PageHeader from '../components/features/PageHeader.jsx'
import TeacherCard from '../components/features/TeacherCard.jsx'
import StudentDetailPopup from '../components/features/StudentDetailPopup.jsx'
import WeekAlerts from '../components/features/WeekAlerts.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import Badge from '../components/ui/Badge.jsx'
import SearchInput from '../components/ui/SearchInput.jsx'
import ConvocatoriaSelector from '../components/features/ConvocatoriaSelector.jsx'
import DashboardSkeleton from '../components/features/DashboardSkeleton.jsx'

/**
 * Dashboard analitico para el CEO.
 * Muestra estadisticas globales, listado de profesores y busqueda de alumnos.
 * @returns {JSX.Element}
 */
export default function DashboardPage() {
  const navigate = useNavigate()
  const {
    convocatorias, convocatoria, reload,
    teachers, loading, error,
    expandedTeacher, searchQuery, setSearchQuery,
    selectedStudent, setSelectedStudent,
    handleStudentClose,
    handleClear, handleTeacherToggle, handleConvChange,
    totalStudents, globalAttendance, alertStudents, streakStudents, searchResults,
  } = useDashboard()

  if (loading) return <DashboardSkeleton />

  if (error) return (
    <div className="min-h-dvh min-h-screen flex flex-col items-center justify-center gap-3 bg-off-white px-6">
      <p className="font-montserrat text-sm text-error text-center text-pretty">{error}</p>
      <button onClick={reload} className="font-montserrat text-sm text-burgundy underline">Reintentar</button>
    </div>
  )

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
              label="En alerta"
              color="gold"
              variant="dark"
            />
          </div>
        </PageHeader>

        {/* Buscador */}
        <div className="px-4 pt-4 pb-3">
          <SearchInput
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onClear={handleClear}
            placeholder="Buscar alumno..."
          />

          {searchResults.length > 0 && (
            <div className="mt-3">
              {searchResults.map(student => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => { setSelectedStudent(student); setSearchQuery('') }}
                  className="bg-white border border-border rounded-[10px] py-2.5 px-3 mb-1.5 text-left w-full transition-all duration-200 hover:bg-burgundy-soft"
                >
                  <div className="font-montserrat text-[13px] font-medium text-text-dark">
                    {student.name}
                  </div>
                  <div className="font-montserrat text-[11px] text-text-muted mt-0.5">
                    {student.teacher} · Grupo {student.group}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Alertas de la semana */}
        <WeekAlerts
          weekStudents={alertStudents}
          streakStudents={streakStudents}
          onStudentClick={setSelectedStudent}
        />

        {/* Lista de profesores */}
        <div className="px-4">
          <h3 className="font-cinzel text-[15px] font-semibold text-text-dark mt-6 mb-3 text-balance">
            Profesores
          </h3>
          {(teachers || []).map(teacher => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              isExpanded={expandedTeacher === teacher.id}
              onToggle={() => handleTeacherToggle(teacher.id)}
              onStudentClick={setSelectedStudent}
            />
          ))}
        </div>
      </div>

      {/* Popup detalle alumno */}
      <StudentDetailPopup
        student={selectedStudent}
        convocatoriaId={convocatoria?.id}
        onClose={handleStudentClose}
      />
    </>
  )
}
