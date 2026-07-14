import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Modal from '../ui/Modal.jsx'
import AbsencesBlock from './AbsencesBlock.jsx'
import JustifyAbsenceModal from './JustifyAbsenceModal.jsx'
import {
  Header,
  SummaryRows,
  Last8Block,
  WeeklyHistoryBlock,
} from './StudentDetailBlocks.jsx'
import {
  weekStatusLabel,
  weekTone,
  absencesCacheKey,
  getCachedAbsences,
  setCachedAbsences,
  invalidateCachedAbsences,
} from './studentDetailHelpers'
import { isApiEnabled } from '../../config/api'
import { getAsistenciaAlumno, justificarFalta } from '../../services/api'

// Claves de metricas del resumen: si el student no trae NINGUNA (p.ej. abierto
// desde AttendancePage solo con id/nombre/grupo), ocultamos el resumen y el
// banner semanal para no presentar "0/0" inventados como datos reales.
const METRIC_KEYS = ['faltasSemana', 'clasesSemana', 'faltasMes', 'clasesMes', 'faltasTotal', 'clasesTotal']

/**
 * Popup con detalle de asistencia de un alumno.
 * Muestra faltas absolutas (semana, mes, convocatoria), mini-historial visual
 * de las ultimas 8 clases, evolucion semana a semana y dias de inasistencia,
 * con opcion de justificar/quitar la justificacion de cada falta (modo API).
 *
 * @param {object} props
 * @param {object|null} props.student - Datos del alumno (null = cerrado)
 * @param {string} [props.convocatoriaId] - ID de convocatoria para cargar faltas via API
 * @param {boolean} [props.allowJustify=false] - Habilita justificar faltas (solo profesor; el CEO es solo lectura)
 * @param {function} props.onClose - Handler al cerrar
 * @param {function} [props.onDirtyClose] - Se invoca al cerrar si hubo cambios (justificar/quitar justificacion)
 */
export default function StudentDetailPopup({ student, convocatoriaId, allowJustify = false, onClose, onDirtyClose = () => {} }) {
  const [apiAbsences, setApiAbsences] = useState([])
  const [absencesError, setAbsencesError] = useState(null)
  const [loadingAbsences, setLoadingAbsences] = useState(false)
  const [selectedAbsence, setSelectedAbsence] = useState(null)
  const [justifying, setJustifying] = useState(false)
  const [justifyError, setJustifyError] = useState(null)

  const mockAbsences = useMemo(() => student?.absences ?? [], [student])
  const shouldFetchApi = isApiEnabled() && !!convocatoriaId && !student?.absences?.length

  // Token de peticion: el popup se reusa (no remonta) al cambiar de alumno, asi
  // que cada fetch captura su id local y descarta respuestas obsoletas tras el await.
  const requestIdRef = useRef(0)
  // Cambios pendientes: se activa al justificar/desjustificar con exito y se
  // notifica al padre (onDirtyClose) al cerrar, para refrescar porcentajes.
  const dirtyRef = useRef(false)

  // Carga las faltas del alumno: primero intenta el cache de modulo (apertura
  // instantanea) y si no hay entrada pide a la API mapeando justificada/motivo.
  // Con skipCache invalida la entrada y fuerza datos frescos (Reintentar,
  // recarga tras justificar/quitar justificacion).
  const fetchAbsences = useCallback(async ({ skipCache = false } = {}) => {
    if (!student || !shouldFetchApi) return
    const key = absencesCacheKey(convocatoriaId, student.id)
    if (skipCache) invalidateCachedAbsences(key)
    const cached = getCachedAbsences(key)
    if (cached) {
      requestIdRef.current++ // descarta cualquier fetch en vuelo
      setApiAbsences(cached)
      setAbsencesError(null)
      setLoadingAbsences(false)
      return
    }
    const localId = ++requestIdRef.current
    setLoadingAbsences(true)
    setAbsencesError(null)
    try {
      const records = await getAsistenciaAlumno(convocatoriaId, student.id)
      if (localId !== requestIdRef.current) return
      const items = (records || [])
        .filter((r) => r.presente === false)
        .map((r) => ({
          fecha: r.fecha,
          justificada: r.justificada === true,
          motivo: r.motivo || '',
        }))
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
      setCachedAbsences(key, items)
      setApiAbsences(items)
    } catch {
      if (localId !== requestIdRef.current) return
      // Error visible: "fallo la carga" no debe confundirse con "sin faltas".
      setApiAbsences([])
      setAbsencesError('No se pudieron cargar las faltas del alumno')
    } finally {
      if (localId === requestIdRef.current) setLoadingAbsences(false)
    }
  }, [student, convocatoriaId, shouldFetchApi])

  useEffect(() => {
    // Nuevo alumno (o cierre): resetea el flag de cambios pendientes.
    dirtyRef.current = false
    if (!student || !shouldFetchApi) return
    // Invalida cualquier fetch en curso antes de cargar el nuevo alumno.
    requestIdRef.current++
    setApiAbsences([])
    setAbsencesError(null)
    fetchAbsences()
  }, [student, shouldFetchApi, fetchAbsences])

  // El boton "Justificar" solo se ofrece al profesor (allowJustify) en modo API
  // con los datos del payload. El CEO es solo lectura: nunca recibe allowJustify.
  const canJustify = allowJustify && shouldFetchApi && !!student?.teacherId
  const handleJustifyClick = canJustify ? setSelectedAbsence : undefined

  const buildPayload = (justificada, motivo) => ({
    convocatoria_id: convocatoriaId,
    profesor_id: student.teacherId,
    // Acepta group como numero (1) o string ("G1"/"1") sin duplicar el prefijo.
    grupo: `G${String(student.group).replace(/^G/i, '')}`,
    alumno_id: student.id,
    fecha: selectedAbsence.fecha,
    justificada,
    motivo,
  })

  const handleConfirm = async (motivo) => {
    setJustifying(true)
    setJustifyError(null)
    try {
      await justificarFalta(buildPayload(true, motivo))
      dirtyRef.current = true
      await fetchAbsences({ skipCache: true })
      setSelectedAbsence(null)
    } catch (e) {
      setJustifyError(e.message || 'No se pudo justificar la falta')
    } finally {
      setJustifying(false)
    }
  }

  const handleUnjustify = async () => {
    setJustifying(true)
    setJustifyError(null)
    try {
      await justificarFalta(buildPayload(false, ''))
      dirtyRef.current = true
      await fetchAbsences({ skipCache: true })
      setSelectedAbsence(null)
    } catch (e) {
      setJustifyError(e.message || 'No se pudo quitar la justificacion')
    } finally {
      setJustifying(false)
    }
  }

  // Cierra el modal de justificacion limpiando cualquier error previo.
  const closeJustifyModal = () => {
    setJustifyError(null)
    setSelectedAbsence(null)
  }

  // Al cerrar con cambios pendientes avisa al padre (p.ej. el Dashboard
  // recarga el resumen para que el % no quede desactualizado).
  const handleClose = () => {
    if (dirtyRef.current) onDirtyClose()
    dirtyRef.current = false
    onClose()
  }

  const absences = shouldFetchApi ? apiAbsences : mockAbsences

  if (!student) return null

  const initials = student.name.split(' ').map(n => n[0]).join('')
  const hasMetrics = METRIC_KEYS.some((k) => student[k] !== undefined)
  const faltasSemana = student.faltasSemana ?? 0
  const clasesSemana = student.clasesSemana ?? 0
  const ultimas8 = student.ultimas8 ?? []
  const historico = student.historicoSemanas ?? []
  const tone = weekTone(faltasSemana)

  return (
    <Modal isOpen onClose={handleClose} ariaLabel="Detalle de asistencia del alumno">
      <Header initials={initials} student={student} />

      {hasMetrics && (
        <SummaryRows
          faltasSemana={faltasSemana} clasesSemana={clasesSemana}
          faltasMes={student.faltasMes ?? 0} clasesMes={student.clasesMes ?? 0}
          faltasTotal={student.faltasTotal ?? 0} clasesTotal={student.clasesTotal ?? 0}
        />
      )}

      {ultimas8.length > 0 && <Last8Block records={ultimas8} />}

      {historico.length > 0 && <WeeklyHistoryBlock weeks={historico} />}

      <AbsencesBlock
        loading={loadingAbsences}
        error={absencesError}
        absences={absences}
        onJustifyClick={handleJustifyClick}
        onRetry={() => fetchAbsences({ skipCache: true })}
      />

      {hasMetrics && (
        <div className={`mt-4 px-3.5 py-2.5 rounded-[10px] ${tone.bg} border-[1.5px] ${tone.border}`}>
          <div className={`font-montserrat text-xs font-semibold ${tone.color} text-center`}>
            {weekStatusLabel(faltasSemana, clasesSemana)}
          </div>
        </div>
      )}

      {selectedAbsence && (
        <JustifyAbsenceModal
          isOpen
          absence={{ alumno_id: student.id, fecha: selectedAbsence.fecha }}
          currentReason={selectedAbsence.motivo}
          isJustified={selectedAbsence.justificada}
          loading={justifying}
          error={justifyError}
          onClose={closeJustifyModal}
          onConfirm={handleConfirm}
          onUnjustify={handleUnjustify}
        />
      )}
    </Modal>
  )
}
