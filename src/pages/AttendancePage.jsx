import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isApiEnabled } from '../config/api'
import { guardarAsistencia } from '../services/api'
import useStudents, { GROUPS } from '../hooks/useStudents'
import PageHeader from '../components/features/PageHeader.jsx'
import GroupTabs from '../components/features/GroupTabs.jsx'
import StudentRow from '../components/features/StudentRow.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import ErrorBanner from '../components/ui/ErrorBanner.jsx'

/**
 * Pagina de marcado de asistencia para profesores.
 * Carga alumnos del grupo seleccionado, permite marcar presentes/ausentes y guardar.
 * @returns {JSX.Element}
 */
export default function AttendancePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const convocatoria = location.state?.convocatoria || null

  const sessionUser = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('user')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }, [])

  const profesorId = sessionUser?.username ? `prof-${sessionUser.username}` : null
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const {
    students,
    loadingStudents,
    loadError,
    selectedGroup,
    setSelectedGroup,
    toggleStudent,
    toggleAll,
    presentCount,
    absentCount,
    attendancePercent,
  } = useStudents(convocatoria, profesorId)

  const totalCount = students.length

  const handleSave = async () => {
    if (presentCount === 0) return
    setSaving(true)
    setSaveError(null)

    if (isApiEnabled() && convocatoria) {
      try {
        const hoy = new Date().toISOString().split('T')[0]
        await guardarAsistencia({
          fecha: hoy,
          convocatoria_id: convocatoria.id,
          profesor_id: profesorId,
          grupo: selectedGroup,
          alumnos: students.map(s => ({
            alumno_id: s.id || s.name,
            presente: s.present,
          })),
        })
      } catch (err) {
        setSaving(false)
        setSaveError(err.message || 'Error al guardar. Comprueba tu conexion e intentalo de nuevo.')
        return
      }
    } else {
      // Modo mock: simular delay
      await new Promise(r => setTimeout(r, 1500))
    }

    navigate('/saved', {
      state: {
        present: presentCount,
        total: totalCount,
        group: selectedGroup,
        convocatoria,
      },
    })
  }

  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  const subtitle = convocatoria
    ? `${convocatoria.nombre} · ${today}`
    : today

  const saveIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  )

  return (
    <div className="min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-off-white flex flex-col box-border">
      <PageHeader
        title={sessionUser?.name || 'Profesor'}
        subtitle={subtitle}
        badge={<Badge>LINGNOVA</Badge>}
        onLogout={() => { sessionStorage.removeItem('user'); navigate('/') }}
      >
        <GroupTabs
          groups={GROUPS}
          selected={selectedGroup}
          onChange={setSelectedGroup}
        />
      </PageHeader>

      <div className="flex gap-2 px-4 pt-4 mb-3">
        <StatCard icon="✓" value={presentCount} label="Presentes" color="success" />
        <StatCard icon="✗" value={absentCount} label="Ausentes" color="error" />
        <StatCard icon="◉" value={`${attendancePercent}%`} label="Asistencia" color="burgundy" />
      </div>

      <ProgressBar value={attendancePercent} className="mx-4 mb-5" />

      {loadError && (
        <div className="px-4">
          <ErrorBanner message={loadError} />
        </div>
      )}

      <div className="flex-1 pb-[110px] overflow-auto">
        <div className="px-4">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="font-cinzel text-[15px] font-semibold text-text-dark m-0 text-balance">
              Alumnos · {selectedGroup}
            </h3>
            <button
              onClick={toggleAll}
              className="bg-burgundy text-gold border-none rounded-md px-2.5 py-1 font-montserrat text-[11px] font-semibold cursor-pointer transition-colors duration-200 hover:bg-burgundy-light"
            >
              Marcar todo
            </button>
          </div>

          {loadingStudents && (
            <div className="space-y-2 py-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border-light animate-pulse">
                  <div className="size-[38px] rounded-[9px] bg-border-light" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-border-light rounded w-3/4" />
                  </div>
                  <div className="w-12 h-7 rounded-full bg-border-light" />
                </div>
              ))}
            </div>
          )}

          {!loadingStudents && students.map((student, idx) => {
            const initials = student.name.split(' ').slice(0, 2).map(n => n[0]).join('')
            return (
              <StudentRow
                key={`${selectedGroup}-${student.id || idx}`}
                name={student.name}
                initials={initials}
                isPresent={student.present}
                onToggle={() => toggleStudent(idx)}
                delay={Math.min(idx * 0.015, 0.15)}
              />
            )
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto px-4 pt-3 pb-[max(22px,env(safe-area-inset-bottom))] bg-off-white shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
        <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />
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
