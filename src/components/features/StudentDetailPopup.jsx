import { useState, useEffect, useMemo } from 'react'
import Modal from '../ui/Modal.jsx'
import Avatar from '../ui/Avatar.jsx'
import { isApiEnabled } from '../../config/api'
import { getAsistenciaAlumno } from '../../services/api'

const formatDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const formatShort = (dateStr) => {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

// Color segun faltas absolutas en una semana de clases (lun-jue)
const weekTone = (faltas) => {
  if (faltas >= 3) return { color: 'text-error', bg: 'bg-error-soft', border: 'border-error' }
  if (faltas >= 2) return { color: 'text-warning', bg: 'bg-warning-soft', border: 'border-warning' }
  return { color: 'text-success', bg: 'bg-success-soft', border: 'border-success' }
}

/**
 * Popup con detalle de asistencia de un alumno.
 * Muestra faltas absolutas (semana, mes, convocatoria), mini-historial visual
 * de las ultimas 8 clases, evolucion semana a semana y dias de inasistencia.
 *
 * @param {object} props
 * @param {object|null} props.student - Datos del alumno (null = cerrado)
 * @param {string} [props.convocatoriaId] - ID de convocatoria para cargar faltas via API
 * @param {function} props.onClose - Handler al cerrar
 */
export default function StudentDetailPopup({ student, convocatoriaId, onClose }) {
  const [apiAbsences, setApiAbsences] = useState([])
  const [loadingAbsences, setLoadingAbsences] = useState(false)

  const mockAbsences = useMemo(() => student?.absences ?? [], [student])
  const shouldFetchApi = isApiEnabled() && !!convocatoriaId && !student?.absences?.length

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
  const faltasSemana = student.faltasSemana ?? 0
  const clasesSemana = student.clasesSemana ?? 0
  const faltasMes = student.faltasMes ?? 0
  const clasesMes = student.clasesMes ?? 0
  const faltasTotal = student.faltasTotal ?? 0
  const clasesTotal = student.clasesTotal ?? 0
  const ultimas8 = student.ultimas8 ?? []
  const historico = student.historicoSemanas ?? []
  const tone = weekTone(faltasSemana)

  return (
    <Modal isOpen onClose={onClose} ariaLabel="Detalle de asistencia del alumno">
      <Header initials={initials} student={student} />

      <SummaryRows
        faltasSemana={faltasSemana} clasesSemana={clasesSemana}
        faltasMes={faltasMes} clasesMes={clasesMes}
        faltasTotal={faltasTotal} clasesTotal={clasesTotal}
      />

      {ultimas8.length > 0 && <Last8Block records={ultimas8} />}

      {historico.length > 0 && <WeeklyHistoryBlock weeks={historico} />}

      <AbsencesBlock loading={loadingAbsences} absences={absences} />

      <div className={`mt-4 px-3.5 py-2.5 rounded-[10px] ${tone.bg} border-[1.5px] ${tone.border}`}>
        <div className={`font-montserrat text-xs font-semibold ${tone.color} text-center`}>
          {weekStatusLabel(faltasSemana, clasesSemana)}
        </div>
      </div>
    </Modal>
  )
}

function weekStatusLabel(faltas, clases) {
  if (clases === 0) return 'Sin clases registradas esta semana'
  if (faltas >= 3) return `Alerta — ${faltas} faltas esta semana`
  if (faltas >= 2) return `Atencion — ${faltas} faltas esta semana`
  return 'Asistencia regular esta semana'
}

function Header({ initials, student }) {
  return (
    <div className="flex flex-col items-center mb-4">
      <Avatar
        initials={initials}
        variant="colored"
        color="bg-burgundy"
        size="lg"
        className="mb-3 text-gold shadow-md"
      />
      <h3 className="font-cinzel text-lg font-bold text-text-dark m-0 mb-1 text-balance text-center">
        {student.name}
      </h3>
      <p className="font-montserrat text-xs text-text-muted m-0 text-pretty text-center">
        {student.teacher} · Grupo {student.group}
      </p>
    </div>
  )
}

function SummaryRow({ label, faltas, clases, isTotal }) {
  const tone = weekTone(faltas)
  const showTone = !isTotal && clases > 0
  const meta = clases === 0
    ? 'Sin clases'
    : `${faltas} ${faltas === 1 ? 'falta' : 'faltas'} / ${clases} ${clases === 1 ? 'clase' : 'clases'}`
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-light last:border-b-0">
      <span className="font-montserrat text-xs font-medium text-text-dark">{label}</span>
      <span className={`font-montserrat text-xs tabular-nums ${showTone ? tone.color + ' font-semibold' : 'text-text-body'}`}>
        {meta}
      </span>
    </div>
  )
}

function SummaryRows({ faltasSemana, clasesSemana, faltasMes, clasesMes, faltasTotal, clasesTotal }) {
  return (
    <div className="bg-cream rounded-[10px] px-3 py-1 mb-4">
      <SummaryRow label="Esta semana" faltas={faltasSemana} clases={clasesSemana} />
      <SummaryRow label="Este mes" faltas={faltasMes} clases={clasesMes} />
      <SummaryRow label="Convocatoria" faltas={faltasTotal} clases={clasesTotal} isTotal />
    </div>
  )
}

function Last8Block({ records }) {
  return (
    <div className="mb-4">
      <h4 className="font-cinzel text-xs font-semibold text-text-dark mb-2">
        Ultimas clases
      </h4>
      <div className="flex items-center gap-1.5 flex-wrap">
        {records.map(r => (
          <div
            key={r.fecha}
            title={`${formatDate(r.fecha)} · ${r.presente ? 'Presente' : 'Falta'}`}
            className={[
              'w-7 h-7 rounded-md flex items-center justify-center',
              'font-cinzel text-[9px] font-semibold tabular-nums',
              r.presente ? 'bg-success-soft text-success' : 'bg-error-soft text-error',
            ].join(' ')}
          >
            {formatShort(r.fecha)}
          </div>
        ))}
      </div>
      <p className="font-montserrat text-[10px] text-text-muted mt-1.5">
        Mas antiguo a la izquierda, mas reciente a la derecha
      </p>
    </div>
  )
}

function WeeklyHistoryBlock({ weeks }) {
  return (
    <div className="mb-4">
      <h4 className="font-cinzel text-xs font-semibold text-text-dark mb-2">
        Historico semanal
      </h4>
      <ul className="bg-cream rounded-[10px] px-3 py-1">
        {weeks.map(w => {
          const tone = weekTone(w.faltas)
          return (
            <li key={w.semana_inicio} className="flex items-center justify-between py-1.5 border-b border-border-light last:border-b-0">
              <span className="font-montserrat text-[11px] text-text-body">
                Sem. {formatShort(w.semana_inicio)}
              </span>
              <span className={`font-montserrat text-[11px] font-semibold ${tone.color}`}>
                {w.faltas} {w.faltas === 1 ? 'falta' : 'faltas'} / {w.clases}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function AbsencesBlock({ loading, absences }) {
  if (loading) {
    return (
      <p className="mt-2 font-montserrat text-xs text-text-muted text-center">
        Cargando faltas...
      </p>
    )
  }
  if (!absences.length) return null
  return (
    <div className="mb-2">
      <h4 className="font-cinzel text-xs font-semibold text-text-dark mb-2">
        Dias faltados ({absences.length})
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
  )
}
