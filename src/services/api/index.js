/**
 * Barrel del servicio API: re-exporta la superficie publica completa.
 *
 * La API publica es identica a la del antiguo api.js monolitico:
 * los importers siguen haciendo `import { X } from '../services/api'`.
 *
 * throwApiError, apiGet y apiPost son internos y NO se re-exportan:
 * los endpoints deben consumirse por sus funciones nombradas.
 *
 * @module services/api/index
 */

export { AuthError, PermissionError } from './errors'
export { loginRequest, solicitarReset, cambiarPassword } from './auth'
export {
  getConvocatorias,
  getProfesores,
  getAlumnos,
  getAsistencia,
  getResumen,
  getAsistenciaAlumno,
  guardarAsistencia,
  justificarFalta
} from './endpoints'
