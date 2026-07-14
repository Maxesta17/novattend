/**
 * NovAttend - Operaciones automaticas (Ola de mejoras operativas backend)
 *
 * Helpers compartidos por los triggers automaticos: backup semanal, canario
 * diario, recordatorio de lista y resumen semanal para el CEO. Vive en el
 * mismo scope global de Apps Script que Código.js y reutiliza sus helpers
 * (SHEET_NAMES, sheetToObjects, isTruthy, esEmailValido_, writeLog) sin
 * redefinirlos.
 *
 * SEGURIDAD ANTI-SPAM: por defecto todo el sistema opera en DRY-RUN (ver
 * opsIsDryRun_). Los 7 profesores reales solo reciben correos cuando la
 * Script Property 'DRY_RUN' se fija EXPLICITAMENTE al string 'false'.
 */

// Email del desarrollador: destino de dry-run y de alertas de error/canario.
const OPS_DEV_EMAIL = 'manuruiz826@gmail.com';

/**
 * Indica si el sistema operativo esta en modo simulacro (dry-run).
 *
 * FAIL-SAFE: por defecto (Script Property 'DRY_RUN' ausente, vacia o con
 * cualquier valor que no sea el string exacto 'false') se considera
 * dry-run ACTIVO. Solo devuelve false cuando el valor guardado es
 * exactamente 'false'. Es intencional: un typo, un valor vacio o un fallo
 * al leer la property NUNCA debe traducirse en un envio real a los 7
 * profesores.
 *
 * @returns {boolean} true si dry-run esta activo (comportamiento por defecto).
 */
function opsIsDryRun_() {
  const valor = PropertiesService.getScriptProperties().getProperty('DRY_RUN');
  return valor !== 'false';
}

/**
 * Envio de email centralizado para toda la capa operativa, con salvaguardas
 * anti-spam:
 *  - Rechaza destinatarios invalidos sin enviar nada (reutiliza
 *    esEmailValido_, el mismo validador que el reset de password).
 *  - En dry-run, el correo SIEMPRE llega al dev (OPS_DEV_EMAIL) con el
 *    destinatario real anotado en el cuerpo, nunca al profesor.
 *  - Cualquier fallo de MailApp (cuota agotada, etc.) se captura y se
 *    loguea sin propagar la excepcion al llamador.
 *
 * @param {string} destinatario - email real del profesor/CEO.
 * @param {string} asunto - asunto del correo.
 * @param {string} cuerpo - cuerpo en texto plano.
 * @returns {boolean} true si el envio (real o dry-run) se realizo con exito.
 */
function opsEnviarEmail_(destinatario, asunto, cuerpo) {
  if (!esEmailValido_(destinatario)) {
    writeLog('OPERATIVA', 'EMAIL_INVALIDO', destinatario + ' | ' + asunto);
    return false;
  }

  try {
    if (opsIsDryRun_()) {
      MailApp.sendEmail(OPS_DEV_EMAIL, '[DRY-RUN] ' + asunto, 'Destinatario real: ' + destinatario + '\n\n' + cuerpo);
      writeLog('OPERATIVA', 'EMAIL_DRYRUN', destinatario + ' | ' + asunto);
    } else {
      MailApp.sendEmail(destinatario, asunto, cuerpo);
      writeLog('OPERATIVA', 'EMAIL', destinatario + ' | ' + asunto);
    }
    return true;
  } catch (err) {
    writeLog('OPERATIVA', 'EMAIL_ERROR', destinatario + ' | ' + asunto + ' | ' + err.message);
    return false;
  }
}

/**
 * Fecha de hoy en formato ISO (yyyy-MM-dd), en la zona horaria del script.
 * @returns {string}
 */
function opsHoyStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * Guard anti doble-ejecucion: true si el trigger identificado por `clave`
 * ya se marco como ejecutado HOY (ver opsMarcarEjecutadoHoy_). Necesario
 * porque los triggers horarios de Apps Script pueden solaparse o
 * reintentarse.
 * @param {string} clave - identificador corto del trigger (ej. 'backup').
 * @returns {boolean}
 */
function opsYaEjecutadoHoy_(clave) {
  const valor = PropertiesService.getScriptProperties().getProperty('ops_once_' + clave);
  return valor === opsHoyStr_();
}

/**
 * Marca el trigger `clave` como ejecutado hoy. La property se sobrescribe
 * cada vez (no acumula historico), asi que ScriptProperties no crece sin
 * limite.
 * @param {string} clave
 */
function opsMarcarEjecutadoHoy_(clave) {
  PropertiesService.getScriptProperties().setProperty('ops_once_' + clave, opsHoyStr_());
}

/**
 * Guard diario ATOMICO con ScriptLock: adquiere el lock global (el mismo que
 * warmCache y los escritores), comprueba si `clave` ya se marco hoy y, si no,
 * la marca — todo dentro del lock — antes de liberar. Cierra el TOCTOU del par
 * opsYaEjecutadoHoy_/opsMarcarEjecutadoHoy_ suelto: sin lock, dos disparos
 * simultaneos del mismo trigger podian pasar ambos el check y duplicar emails.
 *
 * @param {string} clave - identificador corto del trigger (ej. 'recordatorio').
 * @returns {boolean} true si el llamador debe PROCEDER (primera vez hoy); false
 *   si ya se ejecuto hoy o si el lock estaba ocupado (se cede el turno: mejor
 *   saltar que arriesgar un email duplicado).
 */
function opsGuardDiario_(clave) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    writeLog('OPERATIVA', 'GUARD_LOCK_OCUPADO', clave);
    return false;
  }
  try {
    if (opsYaEjecutadoHoy_(clave)) return false;
    opsMarcarEjecutadoHoy_(clave);
    return true;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Convocatorias activas HOY: activa=true y fecha_inicio <= hoy <= fecha_fin.
 * Misma logica que handleGetConvocatorias (Código.js: SHEET_NAMES.CONVOCATORIAS
 * con cabeceras id/nombre/fecha_inicio/fecha_fin/activa), reimplementada
 * aqui sin pasar por CacheService: los triggers corren fuera del ciclo de
 * peticion HTTP y no deben depender de ni invalidar la cache de la API.
 * @returns {Object[]} filas de CONVOCATORIAS activas hoy.
 */
function opsConvocatoriasActivas_() {
  const hoy = opsHoyStr_();
  return sheetToObjects(SHEET_NAMES.CONVOCATORIAS)
    .filter(c => isTruthy(c.activa) && c.fecha_inicio <= hoy && hoy <= c.fecha_fin);
}

/**
 * Instalacion idempotente de los 4 triggers automaticos de la capa
 * operativa. Ejecutar UNA VEZ desde el editor de Apps Script (o de nuevo
 * tras cambiar la programacion): borra los triggers previos de estas 4
 * funciones y los vuelve a crear, sin tocar ningun otro trigger del
 * proyecto. En particular, el trigger diario de warmCache (06-07h,
 * instalado a mano) NO esta en HANDLERS y debe sobrevivir intacto.
 */
function installTriggers() {
  const HANDLERS = ['triggerBackupSemanal', 'triggerCanarioDiario', 'triggerRecordatorioLista', 'triggerResumenSemanalCEO'];

  const existentes = ScriptApp.getProjectTriggers();
  let borrados = 0;
  existentes.forEach(function(t) {
    if (HANDLERS.indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
      borrados++;
    }
  });

  ScriptApp.newTrigger('triggerBackupSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(22).create();
  ScriptApp.newTrigger('triggerCanarioDiario').timeBased().everyDays(1).atHour(7).create();
  // El propio handler decide si hoy toca (lun-jue); el trigger dispara todos los dias a las 20h.
  ScriptApp.newTrigger('triggerRecordatorioLista').timeBased().everyDays(1).atHour(20).create();
  ScriptApp.newTrigger('triggerResumenSemanalCEO').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();

  const resumen = 'borrados=' + borrados + ' creados=' + HANDLERS.length;
  Logger.log('installTriggers: ' + resumen);
  writeLog('OPERATIVA', 'INSTALL_TRIGGERS', resumen);
}
