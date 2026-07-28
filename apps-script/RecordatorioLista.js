/**
 * NovAttend - Recordatorio diario de lista sin pasar (Ola operativa)
 *
 * Trigger DIARIO instalado por installTriggers() (OperacionesBase.js) a las
 * 20h con handler triggerRecordatorioLista. Como el trigger es diario (Apps
 * Script no permite triggers "solo lunes a jueves"), este handler decide
 * internamente si hoy toca ejecutar.
 *
 * Objetivo: avisar por email a cada profesor activo que, teniendo alumnos
 * activos asignados en alguna convocatoria activa hoy, NO ha registrado
 * ningun asiento de asistencia hoy para esa convocatoria.
 *
 * Depende de helpers globales definidos en OperacionesBase.js (NO redefinir
 * aqui): OPS_DEV_EMAIL, opsIsDryRun_, opsEnviarEmail_, opsHoyStr_,
 * opsYaEjecutadoHoy_/opsMarcarEjecutadoHoy_, opsConvocatoriasActivas_.
 * Depende tambien de helpers de Código.js: SHEET_NAMES, sheetToObjects,
 * isTruthy, writeLog.
 */

// Profesores excluidos del recordatorio por decision de negocio: siguen
// activos y usando la app con normalidad, pero NO reciben este email. Se
// filtran por id de PROFESORES (no por nombre ni email, que pueden cambiar).
const RECORDATORIO_EXCLUIDOS_ = ['prof-maria']; // Maria Wolf

// Nombres en espanol para construir la fecha legible del email sin depender
// del locale del proyecto de Apps Script (que puede no ser es_ES). Se derivan
// SIEMPRE de los componentes yyyy-MM-dd de opsHoyStr_ via Date.UTC, nunca de
// new Date() directo, para no arrastrar el desfase UTC/tz del runtime V8.
const DIAS_SEMANA_RECORDATORIO_ = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_RECORDATORIO_ = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Convierte 'yyyy-MM-dd' en una fecha legible en espanol, ej.
 * 'martes 14 de julio de 2026'.
 *
 * Usa Date.UTC con los componentes numericos del string (no new Date(iso)
 * directo ni new Date() del runtime) para que el dia de la semana no dependa
 * de la zona horaria por defecto del entorno de ejecucion.
 *
 * @param {string} isoStr - fecha 'yyyy-MM-dd' (salida de opsHoyStr_).
 * @returns {string} fecha legible en espanol.
 */
function formatearFechaLegibleRecordatorio_(isoStr) {
  const partes = isoStr.split('-');
  const anio = Number(partes[0]);
  const mesIdx = Number(partes[1]) - 1;
  const diaMes = Number(partes[2]);
  const fechaUtc = new Date(Date.UTC(anio, mesIdx, diaMes));
  const diaSemana = DIAS_SEMANA_RECORDATORIO_[fechaUtc.getUTCDay()];
  const mes = MESES_RECORDATORIO_[fechaUtc.getUTCMonth()];
  return diaSemana + ' ' + diaMes + ' de ' + mes + ' de ' + anio;
}

/**
 * Indica si un profesor tiene al menos un alumno activo asignado en una
 * convocatoria concreta. Sin alumnos activos, esa convocatoria NO genera
 * recordatorio para ese profesor (nada que pasar de lista).
 *
 * @param {Array<Object>} alumnos - filas de ALUMNOS (sheetToObjects).
 * @param {string} convocatoriaId
 * @param {string} profesorId
 * @returns {boolean}
 */
function tieneAlumnosActivosRecordatorio_(alumnos, convocatoriaId, profesorId) {
  return alumnos.some(function(a) {
    return isTruthy(a.activo) && a.convocatoria_id === convocatoriaId && a.profesor_id === profesorId;
  });
}

/**
 * Indica si el profesor ya registro CUALQUIER asiento de asistencia hoy para
 * esa convocatoria (aunque solo haya marcado un grupo cuenta como "lista
 * pasada": criterio acordado). Defensivo ante r.fecha no-string (fila
 * corrupta o hoja atipica): esa fila nunca cuenta como lista pasada.
 *
 * @param {Array<Object>} asistencia - filas de ASISTENCIA (sheetToObjects).
 * @param {string} profesorId
 * @param {string} convocatoriaId
 * @param {string} hoyStr - 'yyyy-MM-dd' de opsHoyStr_.
 * @returns {boolean}
 */
function yaPasoListaHoyRecordatorio_(asistencia, profesorId, convocatoriaId, hoyStr) {
  return asistencia.some(function(r) {
    if (typeof r.fecha !== 'string') return false;
    return r.profesor_id === profesorId && r.convocatoria_id === convocatoriaId && r.fecha === hoyStr;
  });
}

/**
 * Construye el cuerpo (texto plano, espanol) del email de recordatorio.
 * Sin datos sensibles: solo nombre del profesor, fecha y nombres de
 * convocatoria (dato publico de negocio, no personal).
 *
 * @param {{nombre:string}} profesor
 * @param {Array<{nombre:string}>} pendientes - convocatorias sin lista pasada hoy.
 * @param {string} fechaLegible - salida de formatearFechaLegibleRecordatorio_.
 * @returns {string}
 */
function construirCuerpoRecordatorioLista_(profesor, pendientes, fechaLegible) {
  const listado = pendientes.map(function(c) { return '  - ' + c.nombre; }).join('\n');
  const enPlural = pendientes.length > 1;
  return (
    'Hola ' + (profesor.nombre || '') + ',\n\n' +
    'Hoy ' + fechaLegible + ' todavía no has pasado lista en NovAttend' +
    (enPlural ? ' para estas convocatorias:\n\n' : ' para esta convocatoria:\n\n') +
    listado + '\n\n' +
    'Por favor, entra en https://novattend.vercel.app y registra la asistencia antes de que termine el día.\n\n' +
    'Gracias,\nNovAttend'
  );
}

/**
 * Handler del trigger diario de recordatorio de lista. Nombre EXACTO exigido
 * por installTriggers() (OperacionesBase.js).
 *
 * Flujo: valida dia lun-jue -> guard anti doble-ejecucion diaria -> lee cada
 * hoja UNA vez -> para cada (convocatoria activa x profesor activo no-ceo y
 * no excluido en RECORDATORIO_EXCLUIDOS_)
 * con alumnos activos asignados, comprueba si ya paso lista hoy -> agrega en
 * UN email por profesor (max) listando convocatorias pendientes -> cierra con
 * un resumen en LOG. Cualquier fallo se captura, se loguea y se avisa al dev.
 */
function triggerRecordatorioLista() {
  try {
    // Dia de la semana SIN new Date().getDay() directo: se deriva de opsHoyStr_
    // (zona del script) via Date.UTC, coherente con el resto del archivo.
    const pGate = opsHoyStr_().split('-');
    const diaSemana = new Date(Date.UTC(Number(pGate[0]), Number(pGate[1]) - 1, Number(pGate[2]))).getUTCDay();
    if (diaSemana < 1 || diaSemana > 4) return; // Solo lunes-jueves; trigger es diario

    // Guard ATOMICO (lock + check + marca) ANTES de leer datos o enviar nada:
    // prioridad absoluta es que una ejecucion doble jamas duplique emails a
    // profesores reales. Si el envio falla a mitad, se pierde el recordatorio
    // de ese dia -- aceptable frente al riesgo de duplicar.
    if (!opsGuardDiario_('recordatorio')) {
      writeLog('OPERATIVA', 'RECORDATORIO_SKIP', 'ya ejecutado hoy o lock ocupado');
      return;
    }

    const convocatorias = opsConvocatoriasActivas_();
    if (!convocatorias || convocatorias.length === 0) {
      writeLog('OPERATIVA', 'RECORDATORIO', 'sin convocatorias activas hoy');
      return;
    }

    // Lectura de cada hoja UNA sola vez. Hojas vacias -> sheetToObjects ya
    // devuelve [] (no lanza), el flujo degrada solo sin recordatorios.
    const profesores = sheetToObjects(SHEET_NAMES.PROFESORES)
      .filter(function(p) {
        if (!isTruthy(p.activo) || p.rol === 'ceo') return false;
        return RECORDATORIO_EXCLUIDOS_.indexOf(p.id) === -1;
      });
    const alumnos = sheetToObjects(SHEET_NAMES.ALUMNOS);
    const asistencia = sheetToObjects(SHEET_NAMES.ASISTENCIA);

    const hoyStr = opsHoyStr_();
    const fechaLegible = formatearFechaLegibleRecordatorio_(hoyStr);

    let avisados = 0;
    let sinEmail = 0;
    let alDia = 0;

    profesores.forEach(function(p) {
      const pendientes = [];

      convocatorias.forEach(function(conv) {
        if (!tieneAlumnosActivosRecordatorio_(alumnos, conv.id, p.id)) return;
        if (!yaPasoListaHoyRecordatorio_(asistencia, p.id, conv.id, hoyStr)) {
          pendientes.push(conv);
        }
      });

      if (pendientes.length === 0) {
        alDia++;
        return;
      }

      const asunto = 'NovAttend — Recordatorio: hoy no has pasado lista';
      const cuerpo = construirCuerpoRecordatorioLista_(p, pendientes, fechaLegible);
      const enviado = opsEnviarEmail_(p.email, asunto, cuerpo);
      if (enviado) {
        avisados++;
      } else {
        sinEmail++;
      }
    });

    writeLog('OPERATIVA', 'RECORDATORIO', 'avisados=' + avisados + ' sinEmail=' + sinEmail +
      ' alDia=' + alDia + ' excluidos=' + RECORDATORIO_EXCLUIDOS_.length);
  } catch (err) {
    const detalle = err && err.message ? err.message : String(err);
    writeLog('OPERATIVA', 'ERROR_RECORDATORIO', detalle);
    opsEnviarEmail_(
      OPS_DEV_EMAIL,
      'NovAttend — ERROR en recordatorio de lista',
      'triggerRecordatorioLista fallo con el siguiente error:\n\n' + detalle
    );
  }
}
