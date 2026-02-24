import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BRAND } from '../config/brand'

// Datos mock de profesores, grupos y alumnos
const TEACHERS_DATA = [
  {
    id: 1,
    name: 'Samuel',
    initial: 'S',
    groups: [
      {
        id: 'G1S',
        number: 1,
        students: [
          { id: 's1', name: 'Laura García', weekly: 95, biweekly: 92, monthly: 90 },
          { id: 's2', name: 'Carlos Ruiz', weekly: 78, biweekly: 75, monthly: 72 },
          { id: 's3', name: 'María López', weekly: 88, biweekly: 86, monthly: 84 },
          { id: 's4', name: 'Pedro Sánchez', weekly: 92, biweekly: 90, monthly: 88 },
          { id: 's5', name: 'Ana Martín', weekly: 100, biweekly: 100, monthly: 98 },
          { id: 's6', name: 'David Fernández', weekly: 65, biweekly: 62, monthly: 60 },
          { id: 's7', name: 'Elena Torres', weekly: 85, biweekly: 83, monthly: 81 },
          { id: 's8', name: 'Jorge Navarro', weekly: 90, biweekly: 88, monthly: 86 },
          { id: 's9', name: 'Lucía Romero', weekly: 75, biweekly: 73, monthly: 70 },
          { id: 's10', name: 'Pablo Jiménez', weekly: 82, biweekly: 80, monthly: 78 },
          { id: 's11', name: 'Sofía Álvarez', weekly: 98, biweekly: 96, monthly: 94 },
          { id: 's12', name: 'Hugo Moreno', weekly: 55, biweekly: 52, monthly: 50 },
        ],
      },
      {
        id: 'G2S',
        number: 2,
        students: [
          { id: 's13', name: 'Valentina Cruz', weekly: 92, biweekly: 90, monthly: 88 },
          { id: 's14', name: 'Mateo Herrera', weekly: 68, biweekly: 65, monthly: 63 },
          { id: 's15', name: 'Isabella Díaz', weekly: 88, biweekly: 86, monthly: 85 },
          { id: 's16', name: 'Sebastián Ortiz', weekly: 95, biweekly: 93, monthly: 91 },
          { id: 's17', name: 'Camila Reyes', weekly: 85, biweekly: 83, monthly: 81 },
          { id: 's18', name: 'Nicolás Vargas', weekly: 72, biweekly: 70, monthly: 68 },
          { id: 's19', name: 'Martina Castro', weekly: 90, biweekly: 88, monthly: 86 },
          { id: 's20', name: 'Emiliano Ramos', weekly: 80, biweekly: 78, monthly: 76 },
          { id: 's21', name: 'Renata Flores', weekly: 98, biweekly: 96, monthly: 94 },
          { id: 's22', name: 'Tomás Mendoza', weekly: 60, biweekly: 58, monthly: 56 },
          { id: 's23', name: 'Antonella Peña', weekly: 87, biweekly: 85, monthly: 83 },
          { id: 's24', name: 'Alejandro Silva', weekly: 75, biweekly: 73, monthly: 71 },
        ],
      },
      {
        id: 'G3S',
        number: 3,
        students: Array.from({ length: 12 }, (_, i) => ({
          id: `s${25 + i}`,
          name: `Alumno G3-${i + 1}`,
          weekly: Math.floor(Math.random() * 50) + 50,
          biweekly: Math.floor(Math.random() * 50) + 50,
          monthly: Math.floor(Math.random() * 50) + 50,
        })),
      },
      {
        id: 'G4S',
        number: 4,
        students: Array.from({ length: 12 }, (_, i) => ({
          id: `s${37 + i}`,
          name: `Alumno G4-${i + 1}`,
          weekly: Math.floor(Math.random() * 50) + 50,
          biweekly: Math.floor(Math.random() * 50) + 50,
          monthly: Math.floor(Math.random() * 50) + 50,
        })),
      },
    ],
  },
  {
    id: 2,
    name: 'Maria Wolf',
    initial: 'M',
    groups: [
      { id: 'G1M', number: 1, students: Array.from({ length: 12 }, (_, i) => ({ id: `m1${i}`, name: `Alumno G1-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })) },
      { id: 'G2M', number: 2, students: Array.from({ length: 12 }, (_, i) => ({ id: `m2${i}`, name: `Alumno G2-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })) },
      { id: 'G3M', number: 3, students: Array.from({ length: 12 }, (_, i) => ({ id: `m3${i}`, name: `Alumno G3-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })) },
      { id: 'G4M', number: 4, students: Array.from({ length: 12 }, (_, i) => ({ id: `m4${i}`, name: `Alumno G4-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })) },
    ],
  },
  {
    id: 3,
    name: 'Nadine',
    initial: 'N',
    groups: Array.from({ length: 4 }, (_, g) => ({
      id: `G${g + 1}N`,
      number: g + 1,
      students: Array.from({ length: 12 }, (_, i) => ({ id: `n${g}${i}`, name: `Alumno G${g + 1}-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })),
    })),
  },
  {
    id: 4,
    name: 'Marta Battistella',
    initial: 'B',
    groups: Array.from({ length: 4 }, (_, g) => ({
      id: `G${g + 1}B`,
      number: g + 1,
      students: Array.from({ length: 12 }, (_, i) => ({ id: `b${g}${i}`, name: `Alumno G${g + 1}-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })),
    })),
  },
  {
    id: 5,
    name: 'Elisabeth Shick',
    initial: 'E',
    groups: Array.from({ length: 4 }, (_, g) => ({
      id: `G${g + 1}E`,
      number: g + 1,
      students: Array.from({ length: 12 }, (_, i) => ({ id: `e${g}${i}`, name: `Alumno G${g + 1}-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })),
    })),
  },
  {
    id: 6,
    name: 'Myriam Marcia',
    initial: 'Y',
    groups: Array.from({ length: 4 }, (_, g) => ({
      id: `G${g + 1}Y`,
      number: g + 1,
      students: Array.from({ length: 12 }, (_, i) => ({ id: `y${g}${i}`, name: `Alumno G${g + 1}-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })),
    })),
  },
  {
    id: 7,
    name: 'Sonja',
    initial: 'S',
    groups: Array.from({ length: 4 }, (_, g) => ({
      id: `G${g + 1}X`,
      number: g + 1,
      students: Array.from({ length: 12 }, (_, i) => ({ id: `x${g}${i}`, name: `Alumno G${g + 1}-${i + 1}`, weekly: Math.floor(Math.random() * 50) + 50, biweekly: Math.floor(Math.random() * 50) + 50, monthly: Math.floor(Math.random() * 50) + 50 })),
    })),
  },
]

const getAttendanceColor = (percentage) => {
  if (percentage >= 80) return { color: '#2E7D32', bg: '#E8F5E9', status: 'Asistencia regular' }
  if (percentage >= 60) return { color: '#E65100', bg: '#FFF3E0', status: 'Requiere atención' }
  return { color: '#C62828', bg: '#FFEBEE', status: 'Alerta — contactar alumno' }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [expandedTeacher, setExpandedTeacher] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showAlertPopup, setShowAlertPopup] = useState(false)

  const totalStudents = TEACHERS_DATA.reduce((acc, t) => acc + t.groups.reduce((g, gr) => g + gr.students.length, 0), 0)
  const globalAttendance = Math.round(
    TEACHERS_DATA.reduce((acc, t) =>
      acc + t.groups.reduce((g, gr) =>
        g + gr.students.reduce((s, st) => s + st.monthly, 0) / gr.students.length, 0) / t.groups.length, 0) / TEACHERS_DATA.length
  )

  const allStudents = TEACHERS_DATA.flatMap(teacher =>
    teacher.groups.flatMap(group =>
      group.students.map(student => ({
        ...student,
        teacher: teacher.name,
        teacherId: teacher.id,
        group: group.number,
      }))
    )
  )

  const alertStudents = allStudents.filter(s => s.weekly <= 80)
  const alertCount = alertStudents.length

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return []
    return allStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [searchQuery])

  const toggleTeacher = (teacherId) => {
    setExpandedTeacher(expandedTeacher === teacherId ? null : teacherId)
    setExpandedGroups({})
  }

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  const handleStudentClick = (student) => {
    setSelectedStudent(student)
  }

  const handleAlertClick = () => {
    setShowAlertPopup(true)
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes popUp {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .fade-in {
          animation: fadeIn 0.3s ease;
        }

        .pop-up {
          animation: popUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      <div
        style={{
          minHeight: '100dvh',
          minHeight: '100vh',
          width: '100%',
          maxWidth: '430px',
          margin: '0 auto',
          background: BRAND.offWhite,
          boxSizing: 'border-box',
          paddingBottom: '40px',
        }}
      >
        {/* HEADER */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: `linear-gradient(165deg, #1A1A1A 0%, #2A1A1A 50%, #5C0000 100%)`,
            borderRadius: '0 0 24px 24px',
            padding: '16px 16px 12px',
            boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/logova1.png" alt="logo" style={{ width: '42px', height: '42px', borderRadius: '12px', objectFit: 'cover' }} />
              <div>
                <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '16px', fontWeight: 600, color: BRAND.white, margin: '0 0 2px 0' }}>
                  Dashboard
                </h2>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', color: `rgba(255,255,255,0.45)`, margin: 0 }}>
                  LingNova Academy
                </p>
              </div>
            </div>
            <div style={{ background: BRAND.gold, color: BRAND.burgundy, padding: '4px 10px', borderRadius: '6px', fontFamily: 'Montserrat, sans-serif', fontSize: '8.5px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
              ADMIN
            </div>
          </div>

          {/* STATS */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            <div
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '10px 8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '18px', fontWeight: 700, color: BRAND.gold }}>
                {totalStudents}
              </div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '9px', color: `rgba(255,255,255,0.6)` }}>
                Alumnos
              </div>
            </div>
            <div
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '10px 8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '18px', fontWeight: 700, color: BRAND.gold }}>
                {globalAttendance}%
              </div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '9px', color: `rgba(255,255,255,0.6)` }}>
                Asistencia
              </div>
            </div>
            <button
              onClick={handleAlertClick}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '10px 8px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(197,160,89,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            >
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '18px', fontWeight: 700, color: BRAND.gold }}>
                {alertCount}
              </div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '9px', color: `rgba(255,255,255,0.6)` }}>
                Alerta
              </div>
            </button>
          </div>
        </header>

        {/* BUSCADOR */}
        <div style={{ padding: '16px 16px 12px' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg
                style={{ position: 'absolute', left: '10px', color: BRAND.textMuted }}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Buscar alumno..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '36px',
                  padding: '10px 36px 10px 36px',
                  border: `1.5px solid ${BRAND.border}`,
                  borderRadius: '14px',
                  background: BRAND.white,
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: BRAND.textMuted,
                    fontSize: '18px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* RESULTADOS BÚSQUEDA */}
          {searchResults.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              {searchResults.map(student => (
                <div
                  key={student.id}
                  onClick={() => {
                    handleStudentClick(student)
                    setSearchQuery('')
                  }}
                  style={{
                    background: BRAND.white,
                    border: `1px solid ${BRAND.border}`,
                    borderRadius: '10px',
                    padding: '10px 12px',
                    marginBottom: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = BRAND.burgundySoft)}
                  onMouseLeave={e => (e.currentTarget.style.background = BRAND.white)}
                >
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', fontWeight: 500, color: BRAND.textDark }}>
                    {student.name}
                  </div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', color: BRAND.textMuted, marginTop: '2px' }}>
                    {student.teacher} · Grupo {student.group}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LISTA DE PROFESORES */}
        <div style={{ padding: '0 16px' }}>
          <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '15px', fontWeight: 600, color: BRAND.textDark, margin: '16px 0 12px 0' }}>
            Profesores
          </h3>

          {TEACHERS_DATA.map(teacher => {
            const teacherStudents = teacher.groups.flatMap(g => g.students)
            const teacherAttendance = Math.round(
              teacherStudents.reduce((acc, s) => acc + s.monthly, 0) / teacherStudents.length
            )
            const isExpanded = expandedTeacher === teacher.id

            return (
              <div key={teacher.id} style={{ marginBottom: '12px' }}>
                {/* CARD PROFESOR */}
                <div
                  onClick={() => toggleTeacher(teacher.id)}
                  style={{
                    background: BRAND.white,
                    border: `1.5px solid ${BRAND.border}`,
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = BRAND.cream)}
                  onMouseLeave={e => (e.currentTarget.style.background = BRAND.white)}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      minWidth: '38px',
                      borderRadius: '9px',
                      background: isExpanded ? `linear-gradient(135deg, ${BRAND.burgundy}, ${BRAND.burgundyLight})` : BRAND.cream,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isExpanded ? BRAND.white : BRAND.textMuted,
                      fontFamily: 'Cinzel, serif',
                      fontSize: '14px',
                      fontWeight: 700,
                    }}
                  >
                    {teacher.initial}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: 'Cinzel, serif', fontSize: '14px', fontWeight: 600, color: BRAND.textDark, margin: '0 0 2px 0' }}>
                      {teacher.name}
                    </h4>
                    <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', color: BRAND.textMuted, margin: 0 }}>
                      {teacher.groups.length} grupos · {teacherStudents.length} alumnos
                    </p>
                  </div>

                  <div
                    style={{
                      background: getAttendanceColor(teacherAttendance).bg,
                      color: getAttendanceColor(teacherAttendance).color,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontFamily: 'Cinzel, serif',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {teacherAttendance}%
                  </div>

                  <svg
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={BRAND.textMuted}
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {/* GRUPOS */}
                {isExpanded && (
                  <div style={{ paddingLeft: '12px', marginTop: '8px', borderLeft: `2px solid ${BRAND.borderLight}` }}>
                    {teacher.groups.map(group => {
                      const groupAttendance = Math.round(
                        group.students.reduce((acc, s) => acc + s.monthly, 0) / group.students.length
                      )
                      const isGroupExpanded = expandedGroups[group.id]

                      return (
                        <div key={group.id} style={{ marginBottom: '8px' }}>
                          {/* GROUP HEADER */}
                          <div
                            onClick={() => toggleGroup(group.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              background: BRAND.white,
                              border: `1px solid ${BRAND.borderLight}`,
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = BRAND.cream)}
                            onMouseLeave={e => (e.currentTarget.style.background = BRAND.white)}
                          >
                            <h5 style={{ fontFamily: 'Cinzel, serif', fontSize: '13px', fontWeight: 600, color: BRAND.burgundy, margin: 0, flex: 1 }}>
                              Grupo {group.number}
                            </h5>
                            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', color: BRAND.textMuted }}>
                              {group.students.length} alumnos
                            </span>
                            <div
                              style={{
                                background: getAttendanceColor(groupAttendance).bg,
                                color: getAttendanceColor(groupAttendance).color,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontFamily: 'Cinzel, serif',
                                fontSize: '10px',
                                fontWeight: 600,
                              }}
                            >
                              {groupAttendance}%
                            </div>
                            <svg
                              style={{ transform: isGroupExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={BRAND.textMuted}
                              strokeWidth="2"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>

                          {/* ALUMNOS */}
                          {isGroupExpanded && (
                            <div style={{ paddingLeft: '12px', marginTop: '6px', borderLeft: `2px solid ${BRAND.borderLight}` }}>
                              {group.students.map(student => {
                                const color = getAttendanceColor(student.monthly)
                                return (
                                  <div
                                    key={student.id}
                                    onClick={() => handleStudentClick({ ...student, teacher: teacher.name, teacherId: teacher.id, group: group.number })}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '8px 10px',
                                      borderRadius: '8px',
                                      background: BRAND.white,
                                      border: `1px solid ${BRAND.borderLight}`,
                                      marginBottom: '4px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = color.bg)}
                                    onMouseLeave={e => (e.currentTarget.style.background = BRAND.white)}
                                  >
                                    <div
                                      style={{
                                        width: '30px',
                                        height: '30px',
                                        minWidth: '30px',
                                        borderRadius: '6px',
                                        background: color.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: BRAND.white,
                                        fontFamily: 'Montserrat, sans-serif',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      {student.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', fontWeight: 500, color: BRAND.textDark }}>
                                        {student.name}
                                      </div>
                                      <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '9px', color: BRAND.textMuted }}>
                                        S:{student.weekly}% Q:{student.biweekly}% M:{student.monthly}%
                                      </div>
                                    </div>
                                    <div
                                      style={{
                                        background: color.bg,
                                        color: color.color,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontFamily: 'Cinzel, serif',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      {student.monthly}%
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* POPUP ALUMNO */}
      {selectedStudent && (
        <div
          className="fade-in"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="pop-up"
            style={{
              background: BRAND.white,
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '360px',
              boxShadow: `0 20px 60px rgba(0,0,0,0.3)`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${BRAND.burgundy}, ${BRAND.burgundyLight})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: BRAND.gold,
                  fontFamily: 'Cinzel, serif',
                  fontSize: '20px',
                  fontWeight: 700,
                  marginBottom: '12px',
                  boxShadow: `0 4px 12px rgba(128,0,0,0.3)`,
                }}
              >
                {selectedStudent.name.split(' ').map(n => n[0]).join('')}
              </div>
              <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '18px', fontWeight: 700, color: BRAND.textDark, margin: '0 0 4px 0', textAlign: 'center' }}>
                {selectedStudent.name}
              </h3>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: BRAND.textMuted, margin: 0, textAlign: 'center' }}>
                {selectedStudent.teacher} · Grupo {selectedStudent.group}
              </p>
            </div>

            {/* BARRAS DE PROGRESO */}
            {[
              { label: 'Esta semana', value: selectedStudent.weekly },
              { label: 'Quincenal', value: selectedStudent.biweekly },
              { label: 'Mensual', value: selectedStudent.monthly },
            ].map((metric, i) => {
              const color = getAttendanceColor(metric.value)
              return (
                <div key={i} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', fontWeight: 500, color: BRAND.textDark }}>
                      {metric.label}
                    </span>
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '12px', fontWeight: 600, color: color.color }}>
                      {metric.value}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      background: BRAND.borderLight,
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${metric.value}%`,
                        background: color.color,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )
            })}

            {/* INDICADOR DE ESTADO */}
            <div
              style={{
                marginTop: '20px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: getAttendanceColor(selectedStudent.monthly).bg,
                border: `1.5px solid ${getAttendanceColor(selectedStudent.monthly).color}`,
              }}
            >
              <div
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: getAttendanceColor(selectedStudent.monthly).color,
                  textAlign: 'center',
                }}
              >
                {getAttendanceColor(selectedStudent.monthly).status}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP ALERTA */}
      {showAlertPopup && (
        <div
          className="fade-in"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowAlertPopup(false)}
        >
          <div
            className="pop-up"
            style={{
              background: BRAND.white,
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '360px',
              maxHeight: '70vh',
              overflow: 'auto',
              boxShadow: `0 20px 60px rgba(0,0,0,0.3)`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '18px', fontWeight: 700, color: BRAND.textDark, margin: '0 0 4px 0' }}>
              Alumnos en Alerta
            </h2>
            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: BRAND.textMuted, margin: '0 0 16px 0' }}>
              Asistencia semanal ≤80%
            </p>

            {alertStudents.map(student => (
              <div
                key={student.id}
                onClick={() => {
                  handleStudentClick(student)
                  setShowAlertPopup(false)
                }}
                style={{
                  background: BRAND.white,
                  border: `1px solid ${BRAND.border}`,
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = BRAND.errorSoft)}
                onMouseLeave={e => (e.currentTarget.style.background = BRAND.white)}
              >
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', fontWeight: 500, color: BRAND.textDark, marginBottom: '2px' }}>
                  {student.name}
                </div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', color: BRAND.textMuted, marginBottom: '6px' }}>
                  {student.teacher} · Grupo {student.group}
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    background: BRAND.error,
                    color: BRAND.white,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontFamily: 'Cinzel, serif',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}
                >
                  {student.weekly}% semanal
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
