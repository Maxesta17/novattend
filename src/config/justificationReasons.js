/**
 * Motivos predefinidos para justificar una falta de asistencia.
 *
 * El array se usa para poblar el selector del modal de justificacion.
 * El ultimo elemento (OTHER_REASON) activa un campo de texto libre cuando
 * el motivo elegido no encaja en la lista predefinida.
 *
 * @module config/justificationReasons
 */

/** Etiqueta especial que indica motivo de texto libre. */
export const OTHER_REASON = 'Otro'

/**
 * Lista de motivos predefinidos. OTHER_REASON siempre es el ultimo elemento
 * para que el selector lo muestre al final como opcion de texto libre.
 * @type {string[]}
 */
export const JUSTIFICATION_REASONS = [
  'Enfermedad',
  'Cita medica',
  'Asunto familiar',
  'Viaje',
  OTHER_REASON,
]
