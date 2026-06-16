import { useState, useEffect, useMemo, useCallback } from 'react'
import Modal from '../ui/Modal.jsx'
import AbsencesBlock from './AbsencesBlock.jsx'
import JustifyAbsenceModal from './JustifyAbsenceModal.jsx'
import {
  Header,
  SummaryRows,
  Last8Block,
  WeeklyHistoryBlock,
} from './StudentDetailBlocks.jsx'
import { weekStatusLabel, weekTone } from './studentDetailHelpers'
import { isApiEnabled } from '../../config/api'
import { getAsistenciaAlumno, justificarFalta } from '../../services/api'

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
 */
export default function StudentDetailPopup({ student, convocatoriaId, allowJustify = false, onClose }) {
  const [apiAbsences, setApiAbsences] = useState([])
  const [loadingAbsences, setLoadingAbsences] = useState(false)
  const [selectedAbsence, setSelectedAbsence] = useState(null)
  const [justifying, setJustifying] = useState(false)
  const [justifyError, setJustifyError] = useState(null)

  const mockAbsences = useMemo(() => student?.absences ?? [], [student])
  const shouldFetchApi = isApiEnabled() && !!convocatoriaId && !student?.absences?.length

  // Carga las faltas del alumno desde la API mapeando justificada/motivo.
  // Reutilizable para refrescar la lista tras justificar/quitar.
  const fetchAbsences = useCallback(async () => {
    if (!student || !shouldFetchApi) return
    setLoadingAbsences(true)
    try {
      const records = await getAsistenciaAlumno(convocatoriaId, student.id)
      const items = (records || [])
        .filter((r) => r.presente === false)
        .map((r) => ({
          fecha: r.fecha,
          justificada: r.justificada === true,
          motivo: r.motivo || '',
        }))
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
      setApiAbsences(items)
    } catch {
      setApiAbsences([])
    } finally {
      setLoadingAbsences(false)
    }
  }, [student, convocatoriaId, shouldFetchApi])

  useEffect(() => {
    if (!student || !shouldFetchApi) return
    let cancelled = false
    setApiAbsences([])
    ;(async () => {
      if (!cancelled) await fetchAbsences()
    })()
    return () => { cancelled = true }
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
      await fetchAbsences()
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
      await fetchAbsences()
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

      <AbsencesBlock
        loading={loadingAbsences}
        absences={absences}
        onJustifyClick={handleJustifyClick}
      />

      <div className={`mt-4 px-3.5 py-2.5 rounded-[10px] ${tone.bg} border-[1.5px] ${tone.border}`}>
        <div className={`font-montserrat text-xs font-semibold ${tone.color} text-center`}>
          {weekStatusLabel(faltasSemana, clasesSemana)}
        </div>
      </div>

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
