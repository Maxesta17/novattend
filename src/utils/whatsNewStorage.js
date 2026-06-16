/**
 * Persistencia de novedades vistas ("what's new") en localStorage.
 * Clave versionada: versionar el sufijo (_v1) permite reutilizar el patron en
 * futuras novedades cambiando solo la version, sin reabrir lo ya visto.
 * Todos los accesos van envueltos en try/catch porque localStorage puede fallar
 * (modo privado / cuota) y nunca debe romper la pagina.
 */

/** Clave de la novedad "justificar faltas". */
export const WHATSNEW_JUSTIFICAR_KEY = 'novattend_whatsnew_justificar_v1'

/**
 * Indica si el usuario ya vio la novedad en este dispositivo.
 * @param {string} key - Clave a comprobar.
 * @returns {boolean} true si ya fue vista (o si localStorage no es accesible).
 */
export function hasSeenWhatsNew(key) {
  try {
    return localStorage.getItem(key) !== null
  } catch {
    // Si no podemos leer, asumimos "ya vista" para no molestar ni romper la pagina.
    return true
  }
}

/**
 * Marca la novedad como vista en este dispositivo.
 * @param {string} key - Clave a escribir.
 */
export function markWhatsNewSeen(key) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // Silencioso: si no podemos persistir, el modal podra reaparecer, pero
    // nunca rompemos la pagina por un fallo de localStorage.
  }
}
