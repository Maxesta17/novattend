/**
 * Servicio de conexion con el backend de Google Apps Script.
 *
 * Cuando VITE_API_URL no esta definida, todas las funciones
 * devuelven null y el frontend usa los datos mock locales.
 *
 * Auth por token:
 *   - apiGet: agrega token como query param si existe en sesion.
 *   - apiPost: incluye token en el body JSON si existe.
 *   - El api_key compartido fue retirado; el token de sesion es la unica via de auth.
 *
 * Clasificacion de errores por code/reason numerico (no por regex de mensaje):
 *   - 401 → AuthError (limpia sesion y emite auth:expired)
 *   - 403 → PermissionError (NO limpia sesion)
 *   - Timeout/red → Error generico (NO limpia sesion)
 *
 * @module services/api
 */

import { API_URL, isApiEnabled } from '../config/api'
import { getToken, clearSession } from '../config/session'

// ============================================================
// Clases de error de autenticacion
// ============================================================

/**
 * Error de autenticacion (401): token invalido o credenciales incorrectas.
 * Al capturarlo, la sesion se limpia y el usuario es redirigido al login.
 */
export class AuthError extends Error {
  constructor(message, reason) {
    super(message)
    this.name = 'AuthError'
    this.code = 401
    this.reason = reason || 'token_invalid'
  }
}

/**
 * Error de permiso (403): el usuario esta autenticado pero carece de acceso.
 * NO limpia la sesion — el usuario sigue logueado.
 */
export class PermissionError extends Error {
  constructor(message, reason) {
    super(message)
    this.name = 'PermissionError'
    this.code = 403
    this.reason = reason || 'forbidden'
  }
}

// ============================================================
// Clasificacion de errores por code numerico
// ============================================================

/**
 * Lanza el error correcto segun el code/reason del JSON de respuesta.
 * Solo se invoca cuando json.status === 'error'.
 * Un timeout o error de red NUNCA pasa por aqui (no borra sesion).
 *
 * @param {Object} json - respuesta parseada del backend
 */
function throwApiError(json) {
  const message = json.error || 'Error desconocido de la API'
  const code = json.code
  const reason = json.reason

  if (code === 401) {
    // 401 de auth: limpiar sesion + emitir auth:expired
    clearSession()
    throw new AuthError(message, reason)
  }

  if (code === 403) {
    // 403 de permisos: NO limpiar sesion
    throw new PermissionError(message, reason)
  }

  // Cualquier otro error de negocio
  throw new Error(message)
}

// ============================================================
// Fetch base
// ============================================================

async function apiGet(action, params = {}) {
  if (!isApiEnabled()) return null

  const url = new URL(API_URL)
  url.searchParams.set('action', action)

  // Auth exclusiva por token de sesion; el api_key compartido fue retirado.
  const token = getToken()
  if (token) url.searchParams.set('token', token)

  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      url.searchParams.set(key, val)
    }
  })

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status}: ${res.statusText}`)
  }
  const json = await res.json()

  if (json.status === 'error') {
    throwApiError(json)
  }
  return json.data
}

async function apiPost(action, body = {}) {
  if (!isApiEnabled()) return null

  // Auth exclusiva por token de sesion; el api_key compartido fue retirado.
  const token = getToken()

  // Nota: usamos text/plain en lugar de application/json a proposito.
  // Apps Script lee el body desde e.postData.contents independientemente del
  // Content-Type, y text/plain evita el preflight CORS OPTIONS que iOS Safari
  // (sobre todo versiones viejas) no tolera bien con Apps Script Web Apps.
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action,
      ...(token ? { token } : {}),
      ...body
    })
  })
  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status}: ${res.statusText}`)
  }
  const json = await res.json()

  if (json.status === 'error') {
    throwApiError(json)
  }
  return json.data
}

// ============================================================
// Endpoint de login (timeout propio por el coste de PBKDF2)
// ============================================================

/**
 * Solicita autenticacion al backend.
 * Usa un AbortController propio con timeout de 10s (PBKDF2 es costoso).
 * El token resultante NO se inyecta en esta llamada (es la que lo genera).
 *
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{token, profesor_id, rol, nombre, exp, must_change_password}>}
 */
export async function loginRequest(username, password) {
  if (!isApiEnabled()) return null

  // 20s: PBKDF2 corre en el servidor (Apps Script). Con PBKDF2_ITER=1000 el login
  // ronda ~3-4s en caliente, pero el primer login del dia (instancia fria) se midio
  // en ~12s. Dejamos margen amplio para cold start + redes moviles lentas. (Antes
  // 10s, que con los 10000 iters originales abortaba SIEMPRE -> "Error al conectar".)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'login', username, password }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}: ${res.statusText}`)
    }
    const json = await res.json()

    if (json.status === 'error') {
      // Login fallido: clasificar por code numerico
      // 401 en login NO llama a clearSession (no hay sesion que limpiar aun)
      const message = json.error || 'Error desconocido de la API'
      const code = json.code
      const reason = json.reason
      if (code === 401) {
        throw new AuthError(message, reason)
      }
      if (code === 403) {
        throw new PermissionError(message, reason)
      }
      throw new Error(message)
    }

    return json.data
  } catch (err) {
    clearTimeout(timeoutId)
    // AbortError = timeout de red → NO limpiar sesion
    if (err.name === 'AbortError') {
      throw new Error('La solicitud de login tardo demasiado. Comprueba tu conexion.')
    }
    throw err
  }
}

// ============================================================
// Endpoint de reset de password por email ("olvide mi contrasena")
// ============================================================

/**
 * Solicita un reset de password por email. NO requiere sesion.
 * El backend responde SIEMPRE con un mensaje generico (anti-enumeracion): no
 * revela si el usuario existe. Si existe y tiene email, le envia una temporal.
 * Timeout propio porque el backend hashea (PBKDF2) y envia el correo.
 *
 * @param {string} username
 * @param {string} email - email del profesor (segundo factor: debe coincidir con el de la hoja)
 * @returns {Promise<{message: string}|null>}
 */
export async function solicitarReset(username, email) {
  if (!isApiEnabled()) {
    return { message: 'Si los datos son correctos, te hemos enviado un correo con una contraseña temporal.' }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'solicitarReset', username, email }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}: ${res.statusText}`)
    }
    const json = await res.json()
    if (json.status === 'error') {
      throw new Error(json.error || 'Error desconocido de la API')
    }
    return json.data
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado. Comprueba tu conexión.')
    }
    throw err
  }
}

// ============================================================
// Endpoint de cambio de password
// ============================================================

/**
 * Cambia la password del usuario autenticado.
 * El token de sesion ya se inyecta automaticamente por apiPost.
 *
 * IMPORTANTE: el backend incrementa token_version al cambiar la password,
 * lo que REVOCA el token actual. Tras un cambio correcto, la sesion debe
 * limpiarse (clearSession) y el usuario re-autenticarse con la nueva password.
 *
 * @param {string} nuevaPassword - nueva password en claro (validada por el backend)
 * @returns {Promise<Object|null>} data de confirmacion del backend
 */
export async function cambiarPassword(nuevaPassword) {
  return apiPost('cambiarPassword', { nueva_password: nuevaPassword })
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
