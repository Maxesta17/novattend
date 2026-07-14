import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isApiEnabled } from '../config/api'
import { getSession, logout } from '../config/session'
import { guardarAsistencia } from '../services/api'
import { formatLocalDate, formatLongDate, labelFromIso } from '../utils/dateUtils'
import useStudents, { GROUPS } from '../hooks/useStudents'
import PageHeader from '../components/features/PageHeader.jsx'
import GroupTabs from '../components/features/GroupTabs.jsx'
import StudentList from '../components/features/StudentList.jsx'
import DateHeaderControl from '../components/features/DateHeaderControl.jsx'
import ConfirmPastDayModal from '../components/features/ConfirmPastDayModal.jsx'
import WhatsNewModal from '../components/features/WhatsNewModal.jsx'
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

  // Anti guardado fantasma: con API activa y sin convocatoria (URL directa o
  // icono PWA) volver al login, que recalcula las convocatorias activas.
  useEffect(() => {
    if (isApiEnabled() && !convocatoria) navigate('/', { replace: true })
  }, [convocatoria, navigate])

  const sessionUser = useMemo(() => getSession(), [])

  // profesor_id viene del backend (auth real); compat con sesiones viejas via username.
  const profesorId = sessionUser?.profesor_id
    ?? (sessionUser?.username ? `prof-${sessionUser.username}` : null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  // todayIso se fija una vez por sesion (igual que selectedDate) para que
  // cruzar medianoche con la pestana abierta no marque "dia pasado" en falso.
  const todayIso = useMemo(() => formatLocalDate(new Date()), [])
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isPastDay = selectedDate !== todayIso
  const selectedLabel = labelFromIso(selectedDate)

  const {
    students,
    loadingStudents,
    loadError,
    presenceLoadFailed,
    retryLoad,
    selectedGroup,
    setSelectedGroup,
    toggleStudent,
    toggleAll,
    presentCount,
    absentCount,
    attendancePercent,
  } = useStudents(convocatoria, profesorId, selectedDate)

  const totalCount = students.length

  // Guardar exige alumnos cargados (0 alumnos daria NaN% y registros vacios).
  // Hoy: al menos 1 presente (evita guardados vacios por error). Dia pasado:
  // 0 presentes vale, pero se bloquea si fallo la pre-carga (no machacar con ceros).
  const canSave = totalCount > 0 && (isPastDay ? !presenceLoadFailed : presentCount > 0)

  // Si es un dia pasado, pedir confirmacion antes de sobrescribir.
  const handleSaveClick = () => {
    if (!canSave) return
    if (isPastDay) {
      setSelectorOpen(false)
      setConfirmOpen(true)
      return
    }
    persistAttendance()
  }

  const persistAttendance = async () => {
    if (saving) return // guard anti doble submit (doble tap en Confirmar)
    setSaving(true)
    setSaveError(null)

    // Con API activa NUNCA se simula un guardado: o guarda de verdad o falla.
    if (isApiEnabled()) {
      try {
        await guardarAsistencia({
          fecha: selectedDate,
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
        setConfirmOpen(false)
        setSaveError(err.message || 'Error al guardar. Comprueba tu conexion e intentalo de nuevo.')
        return
      }
    } else {
      // Modo mock (sin API): simular delay
      await new Promise(r => setTimeout(r, 1500))
    }

    navigate('/saved', {
      state: {
        present: presentCount,
        total: totalCount,
        group: selectedGroup,
        convocatoria,
        savedDate: selectedDate,
      },
    })
  }

  const today = formatLongDate(new Date())
  const dateText = isPastDay ? selectedLabel : today
  const subtitle = convocatoria
    ? `${convocatoria.nombre} · ${dateText}`
    : dateText

  const saveIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
  )

  return (
    <div className="min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-off-white flex flex-col box-border">
      <PageHeader
        title={sessionUser?.nombre || sessionUser?.name || 'Profesor'}
        subtitle={subtitle}
        badge={<Badge>LINGNOVA</Badge>}
        onLogout={() => { logout(); navigate('/') }}
      >
        <GroupTabs
          groups={GROUPS}
          selected={selectedGroup}
          onChange={setSelectedGroup}
        />
        <DateHeaderControl
          selectedDate={selectedDate}
          selectedLabel={selectedLabel}
          isPastDay={isPastDay}
          isOpen={selectorOpen}
          onToggle={() => setSelectorOpen(o => !o)}
          onSelectDate={setSelectedDate}
          onClose={() => setSelectorOpen(false)}
        />
      </PageHeader>

      <div className="flex gap-2 px-4 pt-4 mb-3">
        <StatCard icon="✓" value={presentCount} label="Presentes" color="success" />
        <StatCard icon="✗" value={absentCount} label="Ausentes" color="error" />
        <StatCard icon="◉" value={`${attendancePercent}%`} label="Asistencia" color="burgundy" />
      </div>

      <ProgressBar value={attendancePercent} className="mx-4 mb-5" />

      {(loadError || presenceLoadFailed) && (
        <div className="px-4 mb-3">
          <ErrorBanner message={loadError || 'No se pudo cargar la asistencia ya guardada de este día. Reintenta antes de guardar.'} />
          <button
            onClick={retryLoad}
            className="w-full font-montserrat text-xs font-semibold text-burgundy bg-transparent border border-burgundy/30 rounded-lg py-2 cursor-pointer hover:bg-burgundy-soft transition-colors duration-150"
          >
            Reintentar
          </button>
        </div>
      )}

      <div
        role="tabpanel"
        aria-labelledby={`tab-grupo-${selectedGroup}`}
        className="flex-1 pb-[110px] overflow-auto"
      >
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

          {!loadingStudents && (
            <StudentList
              students={students}
              selectedGroup={selectedGroup}
              onToggle={toggleStudent}
              convocatoria={convocatoria}
              profesorId={profesorId}
            />
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto px-4 pt-3 pb-[max(22px,env(safe-area-inset-bottom))] bg-off-white shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
        <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />
        <Button
          variant={canSave ? 'primary' : 'disabled'}
          loading={saving}
          icon={saveIcon}
          fullWidth
          onClick={handleSaveClick}
        >
          {saving ? 'Guardando...' : `Guardar asistencia · ${presentCount}/${totalCount}`}
        </Button>
      </div>

      <ConfirmPastDayModal
        isOpen={confirmOpen}
        dateLabel={selectedLabel}
        group={selectedGroup}
        loading={saving}
        onCancel={() => { if (!saving) setConfirmOpen(false) }}
        onConfirm={persistAttendance}
      />

      {/* Novedad "justificar faltas": se muestra una vez por dispositivo. */}
      <WhatsNewModal enabled={(sessionUser?.rol ?? sessionUser?.role) === 'teacher'} />
    </div>
  )
}
