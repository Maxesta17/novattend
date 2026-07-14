import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isApiEnabled } from '../config/api'
import { guardarAsistencia } from '../services/api'
import { enqueue, removeMatching, isNetworkError } from '../services/offlineQueue'
import { clearPendingMarks } from '../utils/pendingMarksStorage'

/**
 * Hook de guardado de asistencia con soporte offline.
 *
 * Extrae de AttendancePage la logica persistAttendance + canSave y le anade
 * la cola offline: si el POST falla por red/timeout (o no hay conexion), el
 * payload se encola en IndexedDB y se navega a /saved como "pendiente".
 * Un error de negocio del backend NO se encola: se muestra como siempre.
 *
 * Fix M5: todo guardado con exito (online o encolado offline) limpia el
 * snapshot de marcas sin guardar de pendingMarksStorage -- ya no hace falta
 * restaurarlas si una sesion expira despues.
 *
 * @param {Object} args
 * @param {Object|null} args.convocatoria - convocatoria activa (con id y nombre)
 * @param {string|null} args.profesorId - id del profesor en sesion
 * @param {string} args.group - grupo seleccionado ('G1'...'G4')
 * @param {string} args.date - fecha seleccionada (yyyy-MM-dd)
 * @param {Array<{id: string, name: string, present: boolean}>} args.students - alumnos del grupo
 * @param {number} args.presentCount - numero de presentes
 * @param {boolean} args.isPastDay - true si la fecha no es hoy
 * @param {boolean} args.presenceLoadFailed - true si fallo la pre-carga del dia pasado
 * @returns {{saving: boolean, saveError: string|null, clearSaveError: function, canSave: boolean, persistAttendance: function(): Promise<boolean>}}
 */
export default function useSaveAttendance({
  convocatoria,
  profesorId,
  group,
  date,
  students,
  presentCount,
  isPastDay,
  presenceLoadFailed,
}) {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const totalCount = students.length

  // Guardar exige alumnos cargados (0 alumnos daria NaN% y registros vacios).
  // Hoy: al menos 1 presente (evita guardados vacios por error). Dia pasado:
  // 0 presentes vale, pero se bloquea si fallo la pre-carga (no machacar con ceros).
  const canSave = totalCount > 0 && (isPastDay ? !presenceLoadFailed : presentCount > 0)

  /** Navega a la pantalla de confirmacion (queued=true si quedo en cola). */
  const goToSaved = (queued) => {
    navigate('/saved', {
      state: {
        present: presentCount,
        total: totalCount,
        group,
        convocatoria,
        savedDate: date,
        queued,
      },
    })
  }

  /**
   * Guarda la asistencia (o la encola si no hay red).
   * @returns {Promise<boolean>} true si guardo/encolo (navega), false si mostro error
   */
  const persistAttendance = async () => {
    if (saving) return true // guard anti doble submit (doble tap en Confirmar)
    setSaving(true)
    setSaveError(null)

    // Con API activa NUNCA se simula un guardado: guarda, encola o falla.
    if (isApiEnabled()) {
      const payload = {
        fecha: date,
        convocatoria_id: convocatoria.id,
        profesor_id: profesorId,
        grupo: group,
        alumnos: students.map(s => ({
          alumno_id: s.id || s.name,
          presente: s.present,
        })),
      }
      try {
        // Sin conexion detectada: encolar directamente sin gastar el timeout de 20s.
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          await enqueue(payload)
          // Fix M5: guardado (aunque sea encolado) ya no hay marcas "sin guardar" que restaurar.
          clearPendingMarks(convocatoria.id, group, date)
          goToSaved(true)
          return true
        }
        await guardarAsistencia(payload)
        // Anti-pisado: purgar pendientes viejos de la misma convocatoria+grupo+fecha
        // para que un replay posterior no machaque este guardado mas nuevo.
        await removeMatching(payload).catch(() => {})
      } catch (err) {
        if (isNetworkError(err)) {
          try {
            await enqueue(payload)
            clearPendingMarks(convocatoria.id, group, date)
            goToSaved(true)
            return true
          } catch {
            // IndexedDB fallo: caer al flujo de error normal (nada de exito falso)
          }
        }
        setSaving(false)
        setSaveError(err.message || 'Error al guardar. Comprueba tu conexion e intentalo de nuevo.')
        return false
      }
    } else {
      // Modo mock (sin API): simular delay
      await new Promise(r => setTimeout(r, 1500))
    }

    // Guardado con exito (online): limpiar el snapshot de marcas sin guardar.
    clearPendingMarks(convocatoria?.id, group, date)
    goToSaved(false)
    return true
  }

  return {
    saving,
    saveError,
    clearSaveError: () => setSaveError(null),
    canSave,
    persistAttendance,
  }
}
