/**
 * NovAttend - Canario diario (Ola de mejoras operativas backend)
 *
 * Trigger diario (7h, instalado por installTriggers en OperacionesBase.js)
 * que verifica que el Web App de produccion responde. Alerta al dev por
 * email si el ping falla o tarda mas de CANARIO_LATENCIA_MAX_MS.
 *
 * ALCANCE REAL (importante, leer antes de confiar en un canario "verde"):
 * este canario mide con UrlFetchApp DESDE DENTRO de la red de Google, asi
 * que solo verifica que el script SE EJECUTE y la hoja responda. NO mide la
 * experiencia del usuario externo: el peaje de red del borde
 * script.google.com -> script.googleusercontent.com (30-45s medidos desde
 * fuera en el incidente de agosto 2026) queda completamente fuera de su
 * vista. Para esa parte del camino esta el canario externo, que corre desde
 * un runner de GitHub Actions cada 15 min: .github/workflows/canario-externo.yml
 */

// Endpoint de ping vigilado (action=ping esta EXENTA de token, ver resolveAuth_
// en Código.js). La URL /exec de produccion NO vive en este archivo (es
// codigo versionado en un repo publico): es OBLIGATORIA la Script Property
// 'CANARIO_URL'. Fijala en el MISMO momento en que cambie VITE_API_URL del
// frontend tras un `clasp deploy` con ID nuevo, para vigilar exactamente el
// endpoint que usa la app. Si la property falta o esta vacia, el canario NO
// hace fetch: registra el error y avisa por email al dev (fallo ruidoso a
// proposito — un canario silencioso da falsa tranquilidad).
// NO se usa ScriptApp.getService().getUrl(): desde un trigger puede devolver la
// URL /dev (exige login, no da JSON anonimo) y dispararia falsas alarmas diarias.

/**
 * URL efectiva del canario: Script Property 'CANARIO_URL'. No hay fallback
 * hardcodeado (ver comentario de cabecera del archivo).
 * @returns {string|null} la URL configurada, o null si falta/esta vacia.
 */
function opsCanarioUrl_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CANARIO_URL');
  return (prop && prop.trim()) ? prop.trim() : null;
}

// Umbral de latencia (ms) a partir del cual se considera degradado aunque
// el ping haya respondido 200/ok. 5000ms = ~2,4x el maximo observado en las
// ultimas medidas reales de este canario interno (1188-2111ms): margen
// holgado para no generar falsos positivos por variacion normal de Apps
// Script, pero ajustado para detectar una degradacion genuina del script o
// de la hoja (que es lo unico que este canario puede ver — ver ALCANCE REAL
// arriba). El umbral anterior (15000ms) estaba a 7x el maximo observado y
// por construccion no podia dispararse nunca: era un umbral muerto.
const CANARIO_LATENCIA_MAX_MS = 5000;

/**
 * Comprueba la salud del Web App de produccion via su endpoint de ping.
 * Sano = HTTP 200 y cuerpo JSON parseable con status === 'ok' (formato de
 * jsonResponse en Código.js). Cuerpo no-JSON, status distinto, codigo HTTP
 * distinto de 200, o el propio fetch lanzando (red caida) cuentan como
 * fallo. Fallo o latencia > CANARIO_LATENCIA_MAX_MS dispara alerta por
 * email al dev.
 *
 * Guard anti doble-ejecucion: se marca "ejecutado hoy" al PRINCIPIO (a
 * diferencia del backup semanal), porque el objetivo es como maximo 1
 * chequeo/dia y un fallo de todos modos ya genera el email de alerta.
 */
function triggerCanarioDiario() {
  try {
    // NOTA: este guard NO usa opsGuardDiario_ (lock) a proposito. El canario
    // corre a las 7h, solapando la ventana de warmCache (6-7h) que retiene el
    // ScriptLock; contender por el lock haria saltar el chequeo. El unico email
    // del canario es al dev y solo en fallo: un duplicado raro es aceptable.
    if (opsYaEjecutadoHoy_('canario')) {
      writeLog('OPERATIVA', 'CANARIO_SKIP', 'ya ejecutado hoy (' + opsHoyStr_() + ')');
      return;
    }
    opsMarcarEjecutadoHoy_('canario');

    const canarioUrl = opsCanarioUrl_();
    if (!canarioUrl) {
      writeLog('OPERATIVA', 'ERROR_CANARIO', 'falta la Script Property CANARIO_URL');
      opsEnviarEmail_(
        OPS_DEV_EMAIL,
        'NovAttend — ERROR en canario diario',
        'El canario diario no pudo ejecutarse: falta la Script Property "CANARIO_URL".\n\n' +
        'Fijala en Apps Script > Configuracion del proyecto > Propiedades del script, ' +
        'con la URL /exec vigente (ver comentario en CanarioDiario.js).'
      );
      return;
    }

    let code = 0;
    let cuerpoTexto = '';
    let latencia = 0;
    let sano = false;
    const t0 = Date.now();

    try {
      const resp = UrlFetchApp.fetch(canarioUrl, { muteHttpExceptions: true, followRedirects: true });
      latencia = Date.now() - t0;
      code = resp.getResponseCode();
      cuerpoTexto = resp.getContentText();
      sano = opsRespuestaCanarioSana_(code, cuerpoTexto);
    } catch (fetchErr) {
      // Red caida u otra excepcion de UrlFetchApp: latencia medida hasta el
      // punto de fallo, se trata igualmente como chequeo no sano.
      latencia = Date.now() - t0;
      cuerpoTexto = 'Excepcion en UrlFetchApp.fetch: ' + fetchErr.message;
      sano = false;
    }

    if (!sano || latencia > CANARIO_LATENCIA_MAX_MS) {
      const detalle =
        'Fecha/hora: ' + new Date().toISOString() + '\n' +
        'Codigo HTTP: ' + code + '\n' +
        'Latencia: ' + latencia + ' ms\n\n' +
        'Respuesta (primeros 500 caracteres):\n' + cuerpoTexto.substring(0, 500);
      opsEnviarEmail_(OPS_DEV_EMAIL, 'NovAttend — ALERTA canario', detalle);
    }

    writeLog('OPERATIVA', 'CANARIO', 'code=' + code + ' latencia=' + latencia + 'ms ok=' + sano);
  } catch (err) {
    writeLog('OPERATIVA', 'ERROR_CANARIO', err.message);
    opsEnviarEmail_(
      OPS_DEV_EMAIL,
      'NovAttend — ERROR en canario diario',
      'El canario diario fallo:\n\n' + err.message + '\n\n' + (err.stack || '')
    );
  }
}

/**
 * Determina si una respuesta del endpoint de ping es sana.
 * @param {number} code - codigo HTTP de la respuesta.
 * @param {string} cuerpoTexto - cuerpo crudo de la respuesta.
 * @returns {boolean} true si code===200 y el cuerpo es JSON con status==='ok'.
 */
function opsRespuestaCanarioSana_(code, cuerpoTexto) {
  if (code !== 200) return false;
  try {
    const json = JSON.parse(cuerpoTexto);
    return !!json && json.status === 'ok';
  } catch (e) {
    return false;
  }
}
