/**
 * Endpoints de negocio del backend (lectura y escritura).
 * Todos delegan en apiGet/apiPost, que inyectan el token de sesion,
 * aplican timeout de 20s y traducen errores de red al espanol.
 *
 * @module services/api/endpoints
 */

import { apiGet, apiPost } from './http'

// ============================================================
// Endpoints de lectura
// ============================================================

/** Obtener convocatorias activas */
export async function getConvocatorias() {
  return apiGet('getConvocatorias')
}

/** Obtener lista de profesores activos */
export async function getProfesores() {
  return apiGet('getProfesores')
}

/**
 * Obtener alumnos filtrados
 * @param {string} convocatoriaId
 * @param {string} [profesorId]
 * @param {string} [grupo]
 */
export async function getAlumnos(convocatoriaId, profesorId, grupo) {
  return apiGet('getAlumnos', {
    convocatoria_id: convocatoriaId,
    profesor_id: profesorId,
    grupo
  })
}

/**
 * Obtener registros de asistencia.
 * Cada registro incluye, ademas de los campos base, los campos de justificacion:
 * `justificada` (boolean) y `motivo` (string, '' si no hay motivo). Las filas
 * antiguas sin esas columnas se devuelven como `justificada=false`/`motivo=''`.
 * @param {string} convocatoriaId
 * @param {string} [profesorId]
 * @param {string} [grupo]
 * @param {string} [fecha] - formato yyyy-MM-dd
 */
export async function getAsistencia(convocatoriaId, profesorId, grupo, fecha) {
  return apiGet('getAsistencia', {
    convocatoria_id: convocatoriaId,
    profesor_id: profesorId,
    grupo,
    fecha
  })
}

/**
 * Obtener resumen con porcentajes de asistencia
 * @param {string} convocatoriaId
 * @param {string} [profesorId]
 * @param {string} [grupo]
 */
export async function getResumen(convocatoriaId, profesorId, grupo) {
  return apiGet('getResumen', {
    convocatoria_id: convocatoriaId,
    profesor_id: profesorId,
    grupo
  })
}

/**
 * Obtener registros de asistencia de un alumno concreto.
 * Cada registro incluye `justificada` (boolean) y `motivo` (string) ademas de
 * los campos base; las faltas justificadas se distinguen por `justificada=true`.
 * @param {string} convocatoriaId
 * @param {string} alumnoId
 */
export async function getAsistenciaAlumno(convocatoriaId, alumnoId) {
  return apiGet('getAsistencia', {
    convocatoria_id: convocatoriaId,
    alumno_id: alumnoId
  })
}

// ============================================================
// Endpoints de escritura
// ============================================================

/**
 * Guardar asistencia de un grupo completo
 * @param {Object} data
 * @param {string} data.fecha - formato yyyy-MM-dd
 * @param {string} data.convocatoria_id
 * @param {string} data.profesor_id
 * @param {string} data.grupo
 * @param {Array<{alumno_id: string, presente: boolean}>} data.alumnos
 */
export async function guardarAsistencia(data) {
  return apiPost('guardarAsistencia', data)
}

/**
 * Justificar (o quitar la justificacion de) una falta pasada concreta.
 * Una falta justificada se excluye del calculo de asistencia en el backend.
 * @param {Object} payload
 * @param {string} payload.convocatoria_id
 * @param {string} payload.profesor_id
 * @param {string} payload.grupo - formato 'G1', 'G2'...
 * @param {string} payload.alumno_id
 * @param {string} payload.fecha - formato yyyy-MM-dd
 * @param {boolean} payload.justificada - true justifica, false quita la justificacion
 * @param {string} payload.motivo - motivo de la justificacion ('' si justificada=false)
 */
export async function justificarFalta(payload) {
  return apiPost('justificarFalta', payload)
}
