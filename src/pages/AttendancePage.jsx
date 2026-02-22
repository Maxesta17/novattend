import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BRAND } from '../config/brand'

const GROUPS_DATA = {
  1: ['Laura García', 'Carlos Ruiz', 'María López', 'Pedro Sánchez', 'Ana Martín', 'David Fernández', 'Elena Torres', 'Jorge Navarro', 'Lucía Romero', 'Pablo Jiménez', 'Sofía Álvarez', 'Hugo Moreno'],
  2: ['Valentina Cruz', 'Mateo Herrera', 'Isabella Díaz', 'Sebastián Ortiz', 'Camila Reyes', 'Nicolás Vargas', 'Martina Castro', 'Emiliano Ramos', 'Renata Flores', 'Tomás Mendoza', 'Antonella Peña', 'Alejandro Silva'],
  3: ['Bianca Wolff', 'Finn Becker', 'Clara Schmidt', 'Leon Müller', 'Emma Fischer', 'Paul Weber', 'Mia Richter', 'Luca Klein', 'Hannah Braun', 'Ben Hoffmann', 'Sophie Lange', 'Max Werner'],
  4: ['Amélie Dubois', 'Louis Martin', 'Chloé Bernard', 'Hugo Petit', 'Léa Moreau', 'Théo Laurent', 'Manon Simon', 'Jules Michel', 'Zoé Leroy', 'Arthur Roux', 'Inès Fournier', 'Gabriel Bonnet'],
}

export default function AttendancePage() {
  const navigate = useNavigate()
  const [selectedGroup, setSelectedGroup] = useState(1)
  const [students, setStudents] = useState(
    GROUPS_DATA[1].map(name => ({ name, present: false }))
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStudents(GROUPS_DATA[selectedGroup].map(name => ({ name, present: false })))
  }, [selectedGroup])

  const handleGroupChange = (group) => {
    setSelectedGroup(group)
  }

  const toggleStudent = (index) => {
    const updated = [...students]
    updated[index].present = !updated[index].present
    setStudents(updated)
  }

  const toggleAll = () => {
    const allPresent = students.every(s => s.present)
    setStudents(students.map(s => ({ ...s, present: !allPresent })))
  }

  const presentCount = students.filter(s => s.present).length
  const totalCount = students.length
  const absentCount = totalCount - presentCount
  const attendancePercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

  const handleSave = () => {
    if (presentCount === 0) return
    setSaving(true)
    setTimeout(() => {
      navigate('/saved', { state: { present: presentCount, total: totalCount, group: selectedGroup } })
    }, 1500)
  }

  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .student-row {
          animation: slideUp 0.4s ease-out forwards;
          opacity: 0;
        }

        .toggle-switch {
          position: relative;
          transition: all 0.3s ease;
        }

        .spinner {
          animation: spin 1.5s linear infinite;
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
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* HEADER STICKY */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: `linear-gradient(165deg, #1A1A1A 0%, #2A1A1A 50%, #5C0000 100%)`,
            borderRadius: '0 0 24px 24px',
            padding: '16px 16px 12px',
            boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
            backgroundImage: `radial-gradient(circle at 85% 0%, rgba(128,0,0,0.3) 0%, transparent 50%), linear-gradient(165deg, #1A1A1A 0%, #2A1A1A 50%, #5C0000 100%)`,
          }}
        >
          {/* Fila superior: Avatar + Nombre + Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: `linear-gradient(135deg, ${BRAND.burgundy}, ${BRAND.burgundyLight})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: BRAND.gold,
                  fontFamily: 'Cinzel, serif',
                  fontSize: '18px',
                  fontWeight: 700,
                  boxShadow: `0 4px 12px rgba(128,0,0,0.4)`,
                }}
              >
                S
              </div>
              <div>
                <h2
                  style={{
                    fontFamily: 'Cinzel, serif',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: BRAND.white,
                    margin: '0 0 2px 0',
                  }}
                >
                  Samuel
                </h2>
                <p
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: `rgba(255,255,255,0.45)`,
                    margin: 0,
                  }}
                >
                  {today}
                </p>
              </div>
            </div>
            <div
              style={{
                background: BRAND.gold,
                color: BRAND.burgundy,
                padding: '4px 10px',
                borderRadius: '6px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '8.5px',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              LINGNOVA
            </div>
          </div>

          {/* Fila inferior: Botones de grupo */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
            }}
          >
            {[1, 2, 3, 4].map(g => (
              <button
                key={g}
                onClick={() => handleGroupChange(g)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Cinzel, serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  background:
                    selectedGroup === g
                      ? `linear-gradient(135deg, ${BRAND.burgundy}, ${BRAND.burgundyLight})`
                      : `rgba(255,255,255,0.05)`,
                  color: selectedGroup === g ? BRAND.gold : `rgba(255,255,255,0.38)`,
                }}
              >
                Grupo {g}
              </button>
            ))}
          </div>
        </header>

        {/* STATS */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '16px 16px 0',
            marginBottom: '12px',
          }}
        >
          {[
            { label: 'Presentes', value: presentCount, color: BRAND.success, bg: BRAND.successSoft, icon: '✓' },
            { label: 'Ausentes', value: absentCount, color: BRAND.error, bg: BRAND.errorSoft, icon: '✗' },
            { label: 'Asistencia', value: `${attendancePercent}%`, color: BRAND.burgundy, bg: BRAND.burgundySoft, icon: '◉' },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: stat.bg,
                borderRadius: '12px',
                padding: '12px 8px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: stat.color,
                  marginBottom: '2px',
                }}
              >
                {stat.icon} {stat.value}
              </div>
              <div
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '9.5px',
                  color: stat.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: 600,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* BARRA DE PROGRESO */}
        <div
          style={{
            height: '5px',
            background: BRAND.borderLight,
            borderRadius: '2.5px',
            overflow: 'hidden',
            margin: '0 16px 20px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${attendancePercent}%`,
              background: `linear-gradient(90deg, ${BRAND.burgundy}, ${BRAND.gold})`,
              transition: 'width 0.45s ease',
            }}
          />
        </div>

        {/* LISTA DE ALUMNOS */}
        <div
          style={{
            flex: 1,
            paddingBottom: '110px',
            overflow: 'auto',
          }}
        >
          <div style={{ padding: '0 16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <h3
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: BRAND.textDark,
                  margin: 0,
                }}
              >
                Alumnos · Grupo {selectedGroup}
              </h3>
              <button
                onClick={toggleAll}
                style={{
                  background: `linear-gradient(135deg, ${BRAND.burgundy}, ${BRAND.burgundyLight})`,
                  color: BRAND.gold,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                Marcar todo
              </button>
            </div>

            {students.map((student, idx) => {
              const initials = student.name
                .split(' ')
                .slice(0, 2)
                .map(n => n[0])
                .join('')
              const isPresent = student.present

              return (
                <div
                  key={idx}
                  className="student-row"
                  style={{
                    animationDelay: `${idx * 0.03}s`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '12px',
                    background: isPresent ? BRAND.burgundySoft : BRAND.white,
                    border: `1.5px solid ${isPresent ? `${BRAND.burgundy}30` : BRAND.borderLight}`,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onClick={() => toggleStudent(idx)}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      minWidth: '38px',
                      borderRadius: '9px',
                      background: isPresent
                        ? `linear-gradient(135deg, ${BRAND.burgundy}, ${BRAND.burgundyLight})`
                        : BRAND.cream,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isPresent ? BRAND.white : BRAND.textMuted,
                      fontFamily: isPresent ? 'Cinzel, serif' : 'Montserrat, sans-serif',
                      fontSize: isPresent ? '16px' : '12px',
                      fontWeight: isPresent ? 700 : 500,
                    }}
                  >
                    {isPresent ? '✓' : initials}
                  </div>

                  {/* Nombre */}
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14.5px',
                        fontWeight: isPresent ? 600 : 400,
                        color: isPresent ? BRAND.burgundy : BRAND.textDark,
                        margin: 0,
                      }}
                    >
                      {student.name}
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className="toggle-switch"
                    style={{
                      width: '48px',
                      height: '28px',
                      borderRadius: '14px',
                      background: isPresent
                        ? `linear-gradient(135deg, ${BRAND.burgundy}, ${BRAND.burgundyLight})`
                        : '#CDCDCD',
                      position: 'relative',
                      boxShadow: isPresent ? `0 2px 8px rgba(128,0,0,0.3)` : 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: isPresent ? '24px' : '2px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '11px',
                        background: BRAND.white,
                        transition: 'left 0.3s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* BOTÓN GUARDAR FIJO */}
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            maxWidth: '430px',
            margin: '0 auto',
            padding: '12px 16px 22px',
            background: `linear-gradient(to top, ${BRAND.offWhite}FF, ${BRAND.offWhite}E6)`,
            boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <button
            onClick={handleSave}
            disabled={presentCount === 0 || saving}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '14px',
              border: 'none',
              background:
                presentCount === 0
                  ? '#CCCCCC'
                  : `linear-gradient(135deg, ${BRAND.burgundy}, ${BRAND.burgundyLight})`,
              color: BRAND.white,
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: 700,
              cursor: presentCount === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              opacity: saving ? 0.8 : 1,
            }}
          >
            {saving ? (
              <svg
                className="spinner"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
            )}
            {saving ? 'Guardando...' : `Guardar asistencia · ${presentCount}/${totalCount}`}
          </button>
        </div>
      </div>
    </>
  )
}
