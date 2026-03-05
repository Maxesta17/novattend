import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/features/PageHeader.jsx'
import GroupTabs from '../components/features/GroupTabs.jsx'
import StudentRow from '../components/features/StudentRow.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'

const GROUPS_DATA = {
  1: ['Laura García', 'Carlos Ruiz', 'María López', 'Pedro Sánchez', 'Ana Martín', 'David Fernández', 'Elena Torres', 'Jorge Navarro', 'Lucía Romero', 'Pablo Jiménez', 'Sofía Álvarez', 'Hugo Moreno'],
  2: ['Valentina Cruz', 'Mateo Herrera', 'Isabella Díaz', 'Sebastián Ortiz', 'Camila Reyes', 'Nicolás Vargas', 'Martina Castro', 'Emiliano Ramos', 'Renata Flores', 'Tomás Mendoza', 'Antonella Peña', 'Alejandro Silva'],
  3: ['Bianca Wolff', 'Finn Becker', 'Clara Schmidt', 'Leon Müller', 'Emma Fischer', 'Paul Weber', 'Mia Richter', 'Luca Klein', 'Hannah Braun', 'Ben Hoffmann', 'Sophie Lange', 'Max Werner'],
  4: ['Amélie Dubois', 'Louis Martin', 'Chloé Bernard', 'Hugo Petit', 'Léa Moreau', 'Théo Laurent', 'Manon Simon', 'Jules Michel', 'Zoé Leroy', 'Arthur Roux', 'Inès Fournier', 'Gabriel Bonnet'],
}

export default function AttendancePage() {
  const navigate = useNavigate()
  const sessionUser = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('user')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }, [])
  const [selectedGroup, setSelectedGroup] = useState(1)
  const [students, setStudents] = useState(
    GROUPS_DATA[1].map(name => ({ name, present: false }))
  )
  const [saving, setSaving] = useState(false)

  const handleGroupChange = (group) => {
    setSelectedGroup(group)
    setStudents(GROUPS_DATA[group].map(name => ({ name, present: false })))
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

  const saveIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  )

  return (
    <div className="min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-off-white flex flex-col box-border">
      {/* Header */}
      <PageHeader
        title={sessionUser?.name || 'Samuel'}
        subtitle={today}
        badge={<Badge>LINGNOVA</Badge>}
        onLogout={() => { sessionStorage.removeItem('novattend_user'); navigate('/') }}
      >
        <GroupTabs
          groups={[1, 2, 3, 4]}
          selected={selectedGroup}
          onChange={handleGroupChange}
        />
      </PageHeader>

      {/* Stats */}
      <div className="flex gap-2 px-4 pt-4 mb-3">
        <StatCard icon="✓" value={presentCount} label="Presentes" color="success" />
        <StatCard icon="✗" value={absentCount} label="Ausentes" color="error" />
        <StatCard icon="◉" value={`${attendancePercent}%`} label="Asistencia" color="burgundy" />
      </div>

      {/* Barra de progreso */}
      <ProgressBar value={attendancePercent} className="mx-4 mb-5" />

      {/* Lista de alumnos */}
      <div className="flex-1 pb-[110px] overflow-auto">
        <div className="px-4">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="font-cinzel text-[15px] font-semibold text-text-dark m-0">
              Alumnos · Grupo {selectedGroup}
            </h3>
            <button
              onClick={toggleAll}
              className="bg-gradient-to-br from-burgundy to-burgundy-light text-gold border-none rounded-md px-2.5 py-1 font-montserrat text-[11px] font-semibold cursor-pointer transition-all duration-300"
            >
              Marcar todo
            </button>
          </div>

          {students.map((student, idx) => {
            const initials = student.name.split(' ').slice(0, 2).map(n => n[0]).join('')
            return (
              <StudentRow
                key={`${selectedGroup}-${idx}`}
                name={student.name}
                initials={initials}
                isPresent={student.present}
                onToggle={() => toggleStudent(idx)}
                delay={idx * 0.03}
              />
            )
          })}
        </div>
      </div>

      {/* Boton guardar fijo */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto px-4 pt-3 pb-[22px] bg-gradient-to-t from-off-white to-off-white/90 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
        <Button
          variant={presentCount === 0 ? 'disabled' : 'primary'}
          loading={saving}
          icon={saveIcon}
          fullWidth
          onClick={handleSave}
        >
          {saving ? 'Guardando...' : `Guardar asistencia · ${presentCount}/${totalCount}`}
        </Button>
      </div>
    </div>
  )
}
