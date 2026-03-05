/**
 * Servicio de conexion con el backend de Google Apps Script.
 *
 * Cuando VITE_API_URL no esta definida, todas las funciones
 * devuelven null y el frontend usa los datos mock locales.
 *
 * @module services/api
 */

import { API_URL, isApiEnabled } from '../config/api'

// ============================================================
// Fetch base
// ============================================================

async function apiGet(action, params = {}) {
  if (!isApiEnabled()) return null

  const url = new URL(API_URL)
  url.searchParams.set('action', action)
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      url.searchParams.set(key, val)
    }
  })

  const res = await fetch(url.toString())
  const json = await res.json()

  if (json.status === 'error') {
    throw new Error(json.error || 'Error desconocido de la API')
  }
  return json.data
}

async function apiPost(action, body = {}) {
  if (!isApiEnabled()) return null

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...body })
  })
  const json = await res.json()

  if (json.status === 'error') {
    throw new Error(json.error || 'Error desconocido de la API')
  }
  return json.data
}

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
 * Obtener registros de asistencia
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
 * Crear un alumno nuevo
 * @param {Object} data
 * @param {string} data.nombre
 * @param {string} data.convocatoria_id
 * @param {string} data.profesor_id
 * @param {string} data.grupo
 * @param {string} [data.email]
 * @param {string} [data.telefono]
 */
export async function crearAlumno(data) {
  return apiPost('crearAlumno', data)
}

/**
 * Actualizar datos de un alumno (mover grupo, cambiar profesor, baja)
 * @param {string} alumnoId
 * @param {Object} campos - campos a actualizar
 */
export async function actualizarAlumno(alumnoId, campos) {
  return apiPost('actualizarAlumno', { alumno_id: alumnoId, campos })
}
