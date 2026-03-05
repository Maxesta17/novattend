import { useState, useEffect, useMemo } from 'react'
import Modal from '../ui/Modal.jsx'
import Avatar from '../ui/Avatar.jsx'
import ProgressBar from '../ui/ProgressBar.jsx'
import { isApiEnabled } from '../../config/api'
import { getAsistenciaAlumno } from '../../services/api'

/**
 * Popup con detalle de asistencia de un alumno.
 * @param {object} props
 * @param {object|null} props.student - Datos del alumno (null = cerrado)
 * @param {string} props.student.name - Nombre completo
 * @param {string} props.student.teacher - Nombre del profesor
 * @param {number} props.student.group - Numero de grupo
 * @param {number} props.student.weekly - Porcentaje semanal
 * @param {number} props.student.biweekly - Porcentaje quincenal
 * @param {number} props.student.monthly - Porcentaje mensual
 * @param {string[]} [props.student.absences] - Fechas de inasistencia (YYYY-MM-DD, solo mock)
 * @param {string} [props.convocatoriaId] - ID de convocatoria para cargar faltas via API
 * @param {function} props.onClose - Handler al cerrar
 */

const formatDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const getAttendanceColor = (pct) => {
  if (pct >= 80) return { color: 'text-success', bg: 'bg-success-soft', bar: 'bg-success', border: 'border-success', status: 'Asistencia regular' }
  if (pct >= 60) return { color: 'text-warning', bg: 'bg-warning-soft', bar: 'bg-warning', border: 'border-warning', status: 'Requiere atencion' }
  return { color: 'text-error', bg: 'bg-error-soft', bar: 'bg-error', border: 'border-error', status: 'Alerta — contactar alumno' }
}

export default function StudentDetailPopup({ student, convocatoriaId, onClose }) {
  const [apiAbsences, setApiAbsences] = useState([])
  const [loadingAbsences, setLoadingAbsences] = useState(false)

  // Mock: si el alumno ya trae faltas locales, usarlas directamente
  const mockAbsences = useMemo(() => student?.absences ?? [], [student])
  const shouldFetchApi = isApiEnabled() && !!convocatoriaId && !student?.absences?.length

  // Carga de faltas bajo demanda via API
  useEffect(() => {
    if (!student || !shouldFetchApi) return

    let cancelled = false

    const fetchAbsences = async () => {
      setLoadingAbsences(true)
      setApiAbsences([])
      try {
        const records = await getAsistenciaAlumno(convocatoriaId, student.id)
        if (cancelled) return
        const dates = (records || [])
          .filter((r) => r.presente === false)
          .map((r) => r.fecha)
          .sort((a, b) => b.localeCompare(a))
        setApiAbsences(dates)
      } catch {
        if (!cancelled) setApiAbsences([])
      } finally {
        if (!cancelled) setLoadingAbsences(false)
      }
    }

    fetchAbsences()
    return () => { cancelled = true }
  }, [student, convocatoriaId, shouldFetchApi])

  const absences = shouldFetchApi ? apiAbsences : mockAbsences

  if (!student) return null

  const initials = student.name.split(' ').map(n => n[0]).join('')
  const metrics = [
    { label: 'Esta semana', value: student.weekly },
    { label: 'Quincenal', value: student.biweekly },
    { label: 'Mensual', value: student.monthly },
  ]
  const monthlyStatus = getAttendanceColor(student.monthly)

  return (
    <Modal isOpen onClose={onClose}>
      {/* Cabecera con avatar */}
      <div className="flex flex-col items-center mb-5">
        <Avatar
          initials={initials}
          variant="colored"
          color="bg-gradient-to-br from-burgundy to-burgundy-light"
          size="lg"
          className="mb-3 text-gold shadow-[0_4px_12px_rgba(128,0,0,0.3)]"
        />
        <h3 className="font-cinzel text-lg font-bold text-text-dark m-0 mb-1 text-center">
          {student.name}
        </h3>
        <p className="font-montserrat text-xs text-text-muted m-0 text-center">
          {student.teacher} · Grupo {student.group}
        </p>
      </div>

      {/* Barras de progreso */}
      {metrics.map((metric, i) => {
        const scheme = getAttendanceColor(metric.value)
        return (
          <div key={i} className="mb-4">
            <div className="flex justify-between mb-1.5">
              <span className="font-montserrat text-xs font-medium text-text-dark">
                {metric.label}
              </span>
              <span className={`font-cinzel text-xs font-semibold ${scheme.color}`}>
                {metric.value}%
              </span>
            </div>
            <ProgressBar value={metric.value} color={scheme.bar} size="md" />
          </div>
        )
      })}

      {/* Fechas de inasistencia */}
      {loadingAbsences ? (
        <p className="mt-5 font-montserrat text-xs text-text-muted text-center">
          Cargando faltas...
        </p>
      ) : absences.length > 0 && (
        <div className="mt-5">
          <h4 className="font-cinzel text-xs font-semibold text-text-dark mb-2">
            Dias de inasistencia ({absences.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {absences.map(date => (
              <span
                key={date}
                className="font-montserrat text-[10px] px-2 py-1 rounded-md bg-error-soft text-error font-medium"
              >
                {formatDate(date)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Indicador de estado */}
      <div
        className={`mt-5 px-3.5 py-3 rounded-[10px] ${monthlyStatus.bg} border-[1.5px] ${monthlyStatus.border}`}
      >
        <div className={`font-montserrat text-xs font-semibold ${monthlyStatus.color} text-center`}>
          {monthlyStatus.status}
        </div>
      </div>
    </Modal>
  )
}
