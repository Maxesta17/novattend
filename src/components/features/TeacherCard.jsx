import { useState, memo } from 'react'
import Avatar from '../ui/Avatar.jsx'
import Badge from '../ui/Badge.jsx'
import { getAttendanceScheme } from '../../config/teachers.js'

/**
 * Card expandible de profesor con grupos y alumnos.
 * @param {object} props
 * @param {object} props.teacher - Datos del profesor
 * @param {boolean} props.isExpanded - Si esta expandido
 * @param {function} props.onToggle - Handler al expandir/colapsar
 * @param {function} props.onStudentClick - Handler al pulsar un alumno
 */
export default memo(function TeacherCard({ teacher, isExpanded, onToggle, onStudentClick }) {
  const [expandedGroups, setExpandedGroups] = useState({})
  const teacherStudents = teacher.groups.flatMap(g => g.students)
  const teacherAttendance = aggregateAttendance(teacherStudents)
  const scheme = getAttendanceScheme(teacherAttendance)

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle()
    } else if (e.key === 'Escape' && isExpanded) {
      e.preventDefault()
      onToggle()
    }
  }

  return (
    <div className="mb-3">
      {/* Card profesor */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className="bg-white border-[1.5px] border-border rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all duration-300 hover:bg-cream"
      >
        <Avatar
          initials={teacher.initial}
          variant={isExpanded ? 'active' : 'inactive'}
          className="font-cinzel text-sm font-bold"
        />
        <div className="flex-1">
          <h4 className="font-cinzel text-sm font-semibold text-text-dark m-0 mb-0.5 text-balance">
            {teacher.name}
          </h4>
          <p className="font-montserrat text-[11px] text-text-muted m-0">
            {teacher.groups.length} grupos · {teacherStudents.length} alumnos
          </p>
        </div>
        <Badge variant="status" color={scheme.bg} textColor={scheme.text} className="text-xs">
          {teacherAttendance}%
        </Badge>
        <ChevronIcon rotated={isExpanded} />
      </div>

      {/* Grupos expandidos */}
      {isExpanded && (
        <div className="pl-3 mt-2 border-l-2 border-border-light">
          {teacher.groups.map(group => (
            <GroupSection
              key={group.id}
              group={group}
              teacherName={teacher.name}
              teacherId={teacher.id}
              isExpanded={!!expandedGroups[group.id]}
              onToggle={() => toggleGroup(group.id)}
              onStudentClick={onStudentClick}
            />
          ))}
        </div>
      )}
    </div>
  )
})

function GroupSection({ group, teacherName, teacherId, isExpanded, onToggle, onStudentClick }) {
  const groupAttendance = aggregateAttendance(group.students)
  const scheme = getAttendanceScheme(groupAttendance)

  return (
    <div className="mb-2">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- D-02: contenido expandido es informativo, no interactivo por teclado */}
      <div
        onClick={onToggle}
        className="flex items-center gap-2.5 py-2.5 px-3 rounded-[10px] cursor-pointer bg-white border border-border-light transition-all duration-200 hover:bg-cream"
      >
        <h5 className="font-cinzel text-[13px] font-semibold text-burgundy m-0 flex-1">
          Grupo {group.number}
        </h5>
        <span className="font-montserrat text-[11px] text-text-muted">
          {group.students.length} alumnos
        </span>
        <Badge variant="status" color={scheme.bg} textColor={scheme.text} className="text-[10px]">
          {groupAttendance}%
        </Badge>
        <ChevronIcon rotated={isExpanded} size={14} />
      </div>

      {isExpanded && (
        <div className="pl-3 mt-1.5 border-l-2 border-border-light">
          {group.students.map(student => {
            const studentAttendance = singleAttendance(student)
            const s = getAttendanceScheme(studentAttendance)
            const initials = student.name.split(' ').map(n => n[0]).join('')
            const fSem = student.faltasSemana ?? 0
            const fMes = student.faltasMes ?? 0
            const fTotal = student.faltasTotal ?? 0
            return (
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- D-02: contenido expandido es informativo, no interactivo por teclado
              <div
                key={student.id}
                onClick={() => onStudentClick({ ...student, teacher: teacherName, teacherId, group: group.number })}
                className="flex items-center gap-2 py-2 px-2.5 rounded-lg bg-white border border-border-light mb-1 cursor-pointer transition-all duration-200 hover:bg-opacity-50"
              >
                <Avatar initials={initials} variant="colored" color={s.bg} size="sm" className={s.text} />
                <div className="flex-1 min-w-0">
                  <div className="font-montserrat text-xs font-medium text-text-dark truncate">{student.name}</div>
                  <div className="font-montserrat text-[9px] text-text-muted tabular-nums">
                    Sem:{fSem} · Mes:{fMes} · Total:{fTotal} faltas
                    {student.rachaFaltas >= 2 && (
                      <span className="text-error"> · Racha {student.rachaFaltas}</span>
                    )}
                  </div>
                </div>
                <Badge variant="status" color={s.bg} textColor={s.text} className="text-[10px]">
                  {studentAttendance}%
                </Badge>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// % asistencia de un alumno: presentes / clases totales (con fallback a monthly viejo)
function singleAttendance(student) {
  if (typeof student.clasesTotal === 'number' && student.clasesTotal > 0) {
    const presentes = student.clasesTotal - (student.faltasTotal ?? 0)
    return Math.round((presentes / student.clasesTotal) * 100)
  }
  return student.monthly ?? 0
}

// % asistencia agregado de una lista de alumnos: suma faltas/clases (no media de medias)
function aggregateAttendance(students) {
  if (students.length === 0) return 0
  let totalClases = 0
  let totalFaltas = 0
  let hasNew = false
  students.forEach(s => {
    if (typeof s.clasesTotal === 'number') {
      totalClases += s.clasesTotal
      totalFaltas += s.faltasTotal ?? 0
      if (s.clasesTotal > 0) hasNew = true
    }
  })
  if (hasNew && totalClases > 0) {
    return Math.round(((totalClases - totalFaltas) / totalClases) * 100)
  }
  // Fallback a monthly viejo (mocks que aun no tienen campos nuevos)
  return Math.round(students.reduce((acc, s) => acc + (s.monthly ?? 0), 0) / students.length)
}

function ChevronIcon({ rotated, size = 16 }) {
  return (
    <svg
      aria-hidden="true"
      className={`transition-transform duration-300 ${rotated ? 'rotate-180' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="6 9 12 15 18 9" className="text-text-muted" />
    </svg>
  )
}
