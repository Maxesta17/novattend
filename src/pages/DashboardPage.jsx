import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TEACHERS_DATA } from '../config/teachers.js'
import PageHeader from '../components/features/PageHeader.jsx'
import TeacherCard from '../components/features/TeacherCard.jsx'
import StudentDetailPopup from '../components/features/StudentDetailPopup.jsx'
import AlertList from '../components/features/AlertList.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import Badge from '../components/ui/Badge.jsx'
import SearchInput from '../components/ui/SearchInput.jsx'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [expandedTeacher, setExpandedTeacher] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showAlertPopup, setShowAlertPopup] = useState(false)

  const totalStudents = TEACHERS_DATA.reduce(
    (acc, t) => acc + t.groups.reduce((g, gr) => g + gr.students.length, 0), 0
  )
  const globalAttendance = Math.round(
    TEACHERS_DATA.reduce((acc, t) =>
      acc + t.groups.reduce((g, gr) =>
        g + gr.students.reduce((s, st) => s + st.monthly, 0) / gr.students.length, 0
      ) / t.groups.length, 0
    ) / TEACHERS_DATA.length
  )

  const allStudents = useMemo(() =>
    TEACHERS_DATA.flatMap(teacher =>
      teacher.groups.flatMap(group =>
        group.students.map(student => ({
          ...student,
          teacher: teacher.name,
          teacherId: teacher.id,
          group: group.number,
        }))
      )
    ), []
  )

  const alertStudents = useMemo(() => allStudents.filter(s => s.weekly <= 80), [allStudents])

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return []
    return allStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [searchQuery, allStudents])

  return (
    <>
      <div className="min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-off-white box-border pb-10">
        {/* Header */}
        <PageHeader
          title="Dashboard"
          subtitle="LingNova Academy"
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
          {TEACHERS_DATA.map(teacher => (
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
