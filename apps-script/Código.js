/**
 * NovAttend - Backend API (Google Apps Script)
 *
 * Despliega como Web App desde el editor de Apps Script.
 * Configuracion: Ejecutar como "Yo" | Acceso "Cualquiera".
 *
 * Hojas requeridas: CONVOCATORIAS, PROFESORES, ALUMNOS, ASISTENCIA, LOG
 */

// ============================================================
// CONFIGURACION
// ============================================================

const SHEET_NAMES = {
  CONVOCATORIAS: 'CONVOCATORIAS',
  PROFESORES: 'PROFESORES',
  ALUMNOS: 'ALUMNOS',
  ASISTENCIA: 'ASISTENCIA',
  LOG: 'LOG'
};

// Columnas que contienen valores de fecha y reciben normalizacion a ISO (yyyy-MM-dd).
// Solo estas cabeceras pasan por normalizeSheetDate_; el resto de columnas se
// convierten unicamente si son instanceof Date (comportamiento previo).
const DATE_COLUMNS = ['fecha', 'fecha_inicio', 'fecha_fin'];

// ============================================================
// CACHE
// ============================================================

const CACHE_TTL = 120; // segundos (2 minutos) — TTL por defecto de lecturas en vivo
// TTL largo para warmCache (6h = maximo de CacheService). El precalentado de las
// 6:00 debe sobrevivir hasta la franja de uso real (8-12h), no expirar a los 2 min.
// Es seguro porque toda escritura invalida la clave 'res_<convocatoria>' (cacheInvalidate).
const WARM_TTL = 21600; // segundos (6 horas)
const cache_ = CacheService.getScriptCache();

/**
 * Lee del cache o ejecuta fetchFn y guarda el resultado.
 * Si el JSON supera 100KB, devuelve sin cachear.
 */
function cacheGet(key, fetchFn, ttl) {
  const cached = cache_.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const data = fetchFn();
  const json = JSON.stringify(data);

  // Limite de CacheService: 100KB por entrada
  if (json.length < 100000) {
    cache_.put(key, json, ttl || CACHE_TTL);
  }

  return data;
}

/**
 * Invalida todas las claves que coincidan con los prefijos dados.
 * CacheService no soporta iteracion, asi que mantenemos un registro
 * de claves activas en una clave especial '_keys'.
 *
 * La purga determinista al final corre SIEMPRE, aunque _keys haya expirado.
 * Es necesaria porque warmCache cachea la clave 'res_<conv>__' con WARM_TTL (6h)
 * pero el indice _keys solo vive CACHE_TTL*3 (6 min). A partir del minuto 6,
 * _keys ya no lista la clave calentada y la purga via indice no la borra; sin
 * esta purga extra, el CEO veria resumen stale hasta que expiren las 6h.
 */
function cacheInvalidate(prefixes) {
  const keysJson = cache_.get('_keys');

  // Purga via indice: solo si _keys aun esta en cache
  if (keysJson) {
    const keys = JSON.parse(keysJson);
    const toRemove = keys.filter(k => prefixes.some(p => k.startsWith(p)));

    if (toRemove.length > 0) {
      cache_.removeAll(toRemove);
      const remaining = keys.filter(k => !toRemove.includes(k));
      if (remaining.length > 0) {
        cache_.put('_keys', JSON.stringify(remaining), CACHE_TTL * 3);
      } else {
        cache_.remove('_keys');
      }
    }
  }

  // Purga determinista de la clave calentada huerfana: la clave global de
  // warmCache es 'res_<conv>__' (profesor_id y grupo vacios). Se borra aunque
  // _keys haya expirado y ya no la liste.
  prefixes.forEach(function(p) {
    if (p.indexOf('res_') === 0) {
      cache_.remove(p + '__');
    }
  });
}

/**
 * Registra una clave en el indice de claves activas.
 */
function cacheTrackKey(key) {
  const keysJson = cache_.get('_keys');
  const keys = keysJson ? JSON.parse(keysJson) : [];
  if (!keys.includes(key)) {
    keys.push(key);
    cache_.put('_keys', JSON.stringify(keys), CACHE_TTL * 3);
  }
}

/**
 * Wrapper: cachea con tracking de clave.
 */
function cachedGet(key, fetchFn, ttl) {
  cacheTrackKey(key);
  return cacheGet(key, fetchFn, ttl);
}

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Normaliza un valor de celda de fecha a string ISO (yyyy-MM-dd).
 *
 * Casos soportados:
 *   - instanceof Date  → formatea con Utilities.formatDate (comportamiento original).
 *   - string yyyy-MM-dd → se devuelve sin cambios (ya es ISO correcto).
 *   - string dd/mm/yyyy → se interpreta como DIA/MES/AÑO (locale espanol, NO mes/dia)
 *                         y se convierte a yyyy-MM-dd.
 *   - Cualquier otro string → se devuelve tal cual (no romper guardia downstream).
 *   - Otro tipo          → se devuelve sin tocar.
 *
 * ASUNCION CLAVE: el formato dd/mm/yyyy sigue la convencion espanola (dia primero),
 * NO la anglosajona (mes primero). Ejemplo: "30/06/2026" → "2026-06-30".
 *
 * @param {*}      v  - Valor crudo de la celda.
 * @param {string} tz - Zona horaria del script (Session.getScriptTimeZone()).
 * @returns {*} String ISO yyyy-MM-dd o el valor original si no aplica.
 */
function normalizeSheetDate_(v, tz) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  if (typeof v === 'string') {
    const s = v.trim();
    // Ya esta en formato ISO correcto
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Formato dd/mm/yyyy (locale espanol): DIA/MES/AÑO
    const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const dia = ddmmyyyy[1].padStart(2, '0');
      const mes = ddmmyyyy[2].padStart(2, '0');
      const anio = ddmmyyyy[3];
      return anio + '-' + mes + '-' + dia;
    }
    // Otro formato de texto: devolver sin cambios
    return s;
  }
  // Tipo no reconocido (numero, booleano, null, etc.): sin cambios
  return v;
}

/**
 * Convierte una hoja en array de objetos usando la fila 1 como cabeceras.
 */
function sheetToObjects(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => h.toString().trim());
  const rows = [];
  // Calcular zona horaria una sola vez fuera del bucle (evita llamada repetida)
  const tz = Session.getScriptTimeZone();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Saltar filas vacias (primera columna vacia)
    if (!row[0] && row[0] !== false && row[0] !== 0) continue;

    const obj = {};
    headers.forEach((header, j) => {
      let val = row[j];
      if (DATE_COLUMNS.indexOf(header) !== -1) {
        // Columna de fecha: normalizar a ISO (soporta Date, yyyy-MM-dd y dd/mm/yyyy)
        val = normalizeSheetDate_(val, tz);
      } else if (val instanceof Date) {
        // Columna no-fecha con celda Date (ej: hora_registro): convertir a ISO igual que antes
        val = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
      }
      obj[header] = val;
    });
    rows.push(obj);
  }
  return rows;
}

/**
 * Respuesta JSON estandar.
 */
function jsonResponse(data, status) {
  const output = JSON.stringify({
    status: status || 'ok',
    data: data,
    timestamp: new Date().toISOString()
  });
  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Respuesta de error.
 */
function jsonError(message, code) {
  const output = JSON.stringify({
    status: 'error',
    error: message,
    code: code || 400
  });
  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Escribe una entrada en la hoja LOG.
 */
function writeLog(usuario, accion, detalle) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.LOG);
  if (!sheet) return;

  sheet.appendRow([
    new Date(),
    usuario,
    accion,
    detalle
  ]);
}

/**
 * Genera un ID unico basado en prefijo + timestamp.
 */
function generateId(prefix) {
  return prefix + '-' + Date.now().toString(36);
}

/**
 * Coercion laxa de valores booleanos procedentes de Google Sheets.
 *
 * Cuando una celda no tiene checkbox (ej. filas 51+ en ALUMNOS antes de
 * ejecutar setupSheets con el limite ampliado), el valor 'activo'/'activa'
 * puede llegar como texto ('VERDADERO', 'TRUE', '1', 'SI', 'X') en vez del
 * booleano nativo true. Un filtro estricto === true descartaria esas filas
 * y el alumno desapareceria de la app.
 *
 * Este helper devuelve true para booleano nativo true, para el numero 1
 * y para los textos canonicos de afirmacion de Sheets (ES/EN).
 * En cualquier otro caso devuelve false.
 *
 * NO usar para 'presente' ni 'justificada': esos valores los escribe el
 * codigo y deben seguir evaluandose de forma estricta (=== true).
 *
 * @param {*} v - Valor a evaluar (booleano, numero, string, null, undefined)
 * @returns {boolean}
 */
function isTruthy(v) {
  if (v === true) return true;
  if (v === 1) return true;
  if (typeof v === 'string') {
    return ['TRUE', 'VERDADERO', 'SI', 'SÍ', 'X', '1'].indexOf(v.trim().toUpperCase()) !== -1;
  }
  return false;
}

// ============================================================
// AUTENTICACION
// ============================================================

/**
 * Valida el API key del request contra la Script Property 'API_KEY'.
 * Para GET: el token viene en e.parameter.api_key
 * Para POST: el token viene en body.api_key (body ya parseado)
 *
 * @param {string} token - API key enviado en el request
 * @param {string} action - Nombre de la action solicitada
 * @returns {GoogleAppsScript.Content.TextOutput|null} jsonError si invalido, null si valido
 */
function validateApiKey(token, action) {
  const expected = PropertiesService.getScriptProperties().getProperty('API_KEY')
  if (!expected || token !== expected) {
    console.warn('AUTH_REJECTED', {
      action: action || 'desconocida',
      timestamp: new Date().toISOString()
    })
    return jsonError('No autorizado', 401)
  }
  return null
}

// ============================================================
// GET — Lectura de datos
// ============================================================

function doGet(e) {
  try {
    const authError = validateApiKey(e.parameter.api_key, e.parameter.action)
    if (authError) return authError

    const action = e.parameter.action;

    switch (action) {
      case 'getConvocatorias':
        return handleGetConvocatorias(e);
      case 'getProfesores':
        return handleGetProfesores(e);
      case 'getAlumnos':
        return handleGetAlumnos(e);
      case 'getAsistencia':
        return handleGetAsistencia(e);
      case 'getResumen':
        return handleGetResumen(e);
      case 'ping':
        return jsonResponse({ message: 'NovAttend API activa' });
      default:
        return jsonError('Accion no reconocida: ' + action, 400);
    }
  } catch (err) {
    writeLog('API', 'ERROR_GET', (e.parameter.action || 'sin-action') + ' | ' + err.message);
    return jsonError(err.message, 500);
  }
}

/**
 * Devuelve convocatorias. Por defecto solo las activas por fecha.
 * Una convocatoria esta activa si: fecha_inicio <= hoy <= fecha_fin.
 * Parametro ?todas=true devuelve todas sin filtrar.
 */
function handleGetConvocatorias(e) {
  if (e.parameter.todas === 'true') {
    return jsonResponse(sheetToObjects(SHEET_NAMES.CONVOCATORIAS));
  }

  const data = cachedGet('conv', function() {
    const todas = sheetToObjects(SHEET_NAMES.CONVOCATORIAS);
    const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    return todas.filter(c => isTruthy(c.activa) && c.fecha_inicio <= hoy && hoy <= c.fecha_fin);
  });

  return jsonResponse(data);
}

/**
 * Devuelve profesores activos.
 */
function handleGetProfesores(e) {
  if (e.parameter.todos === 'true') {
    return jsonResponse(sheetToObjects(SHEET_NAMES.PROFESORES));
  }

  const data = cachedGet('prof', function() {
    return sheetToObjects(SHEET_NAMES.PROFESORES).filter(p => isTruthy(p.activo));
  });

  return jsonResponse(data);
}

/**
 * Devuelve alumnos filtrados por convocatoria y/o profesor.
 */
function handleGetAlumnos(e) {
  const convocatoriaId = e.parameter.convocatoria_id || '';
  const profesorId = e.parameter.profesor_id || '';
  const grupo = e.parameter.grupo || '';

  // Sin cache si piden todos (incluidos inactivos)
  if (e.parameter.todos === 'true') {
    let alumnos = sheetToObjects(SHEET_NAMES.ALUMNOS);
    if (convocatoriaId) alumnos = alumnos.filter(a => a.convocatoria_id === convocatoriaId);
    if (profesorId) alumnos = alumnos.filter(a => a.profesor_id === profesorId);
    if (grupo) alumnos = alumnos.filter(a => a.grupo === grupo);
    return jsonResponse(alumnos);
  }

  const cacheKey = 'alu_' + convocatoriaId + '_' + profesorId + '_' + grupo;
  const data = cachedGet(cacheKey, function() {
    let alumnos = sheetToObjects(SHEET_NAMES.ALUMNOS).filter(a => isTruthy(a.activo));
    if (convocatoriaId) alumnos = alumnos.filter(a => a.convocatoria_id === convocatoriaId);
    if (profesorId) alumnos = alumnos.filter(a => a.profesor_id === profesorId);
    if (grupo) alumnos = alumnos.filter(a => a.grupo === grupo);
    return alumnos;
  });

  return jsonResponse(data);
}

/**
 * Devuelve registros de asistencia filtrados.
 *
 * Cacheado por combinacion de filtros. La consulta tipica (un alumno concreto,
 * desde el popup de detalle) devuelve pocos registros y cabe de sobra en el
 * limite de 100KB de CacheService, evitando releer las ~900 filas de la hoja
 * en cada apertura del popup.
 */
function handleGetAsistencia(e) {
  const convocatoriaId = e.parameter.convocatoria_id || '';
  const profesorId = e.parameter.profesor_id || '';
  const grupo = e.parameter.grupo || '';
  const fecha = e.parameter.fecha || ''; // formato: yyyy-MM-dd
  const alumnoId = e.parameter.alumno_id || '';

  const cacheKey = 'asist_' + convocatoriaId + '_' + profesorId + '_' +
    grupo + '_' + fecha + '_' + alumnoId;

  const data = cachedGet(cacheKey, function() {
    let registros = sheetToObjects(SHEET_NAMES.ASISTENCIA);

    if (convocatoriaId) {
      registros = registros.filter(r => r.convocatoria_id === convocatoriaId);
    }
    if (profesorId) {
      registros = registros.filter(r => r.profesor_id === profesorId);
    }
    if (grupo) {
      registros = registros.filter(r => r.grupo === grupo);
    }
    if (fecha) {
      registros = registros.filter(r => r.fecha === fecha);
    }
    if (alumnoId) {
      registros = registros.filter(r => r.alumno_id === alumnoId);
    }

    // Lectura defensiva de columnas nuevas: filas antiguas (7 columnas) no
    // tienen 'justificada'/'motivo'; sheetToObjects las deja como undefined.
    // Coaccionar a tipos estables para el frontend: justificada=boolean, motivo=string.
    return registros.map(r => {
      r.justificada = r.justificada === true;
      r.motivo = r.motivo || '';
      return r;
    });
  });

  return jsonResponse(data);
}

/**
 * Calcula y devuelve resumen de asistencia.
 * Devuelve metricas absolutas (faltas) orientadas a deteccion de patrones,
 * mas campos viejos (semanal/quincenal/mensual en %) por compatibilidad.
 */
function handleGetResumen(e) {
  const convocatoriaId = e.parameter.convocatoria_id;
  const profesorId = e.parameter.profesor_id || '';
  const grupo = e.parameter.grupo || '';

  if (!convocatoriaId) {
    return jsonError('convocatoria_id es obligatorio para getResumen', 400);
  }

  const cacheKey = 'res_' + convocatoriaId + '_' + profesorId + '_' + grupo;
  const data = cachedGet(cacheKey, function() {
    return computeResumen(convocatoriaId, profesorId, grupo);
  });

  return jsonResponse(data);
}

/**
 * Devuelve la fecha del lunes (00:00) de la semana ISO a la que pertenece d.
 * Lunes-jueves son los dias de clase; semana = lunes a domingo natural.
 */
function mondayOf_(d) {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = dt.getDay(); // 0=dom, 1=lun, ..., 6=sab
  const diff = (day === 0 ? -6 : 1 - day);
  dt.setDate(dt.getDate() + diff);
  return dt;
}

/**
 * Calcula resumen de asistencia (extraido para cacheabilidad).
 */
function computeResumen(convocatoriaId, profesorId, grupo, preAlumnos, preRegistros) {
  // preAlumnos/preRegistros: filas ya leidas de ALUMNOS/ASISTENCIA. Permiten a
  // warmCache leer cada hoja UNA vez y reutilizarla para todas las convocatorias,
  // en lugar de releer las hojas completas por cada convocatoria. Si no se pasan,
  // se leen aqui (comportamiento original para los callers en vivo).
  let alumnos = (preAlumnos || sheetToObjects(SHEET_NAMES.ALUMNOS))
    .filter(a => isTruthy(a.activo) && a.convocatoria_id === convocatoriaId);

  if (profesorId) alumnos = alumnos.filter(a => a.profesor_id === profesorId);
  if (grupo) alumnos = alumnos.filter(a => a.grupo === grupo);

  let registros = (preRegistros || sheetToObjects(SHEET_NAMES.ASISTENCIA))
    .filter(r => r.convocatoria_id === convocatoriaId);

  if (profesorId) registros = registros.filter(r => r.profesor_id === profesorId);
  if (grupo) registros = registros.filter(r => r.grupo === grupo);

  const tz = Session.getScriptTimeZone();
  const hoy = new Date();
  const fmt = d => Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  const hoyStr = fmt(hoy);

  // Ventanas viejas (compatibilidad con frontend actual)
  const hace7 = new Date(hoy);  hace7.setDate(hoy.getDate() - 7);
  const hace15 = new Date(hoy); hace15.setDate(hoy.getDate() - 15);
  const hace30 = new Date(hoy); hace30.setDate(hoy.getDate() - 30);
  const hace7Str = fmt(hace7), hace15Str = fmt(hace15), hace30Str = fmt(hace30);

  // Ventana semana en curso (lunes a domingo de hoy)
  const lunesActual = mondayOf_(hoy);
  const domingoActual = new Date(lunesActual);
  domingoActual.setDate(lunesActual.getDate() + 6);
  const lunesActualStr = fmt(lunesActual);
  const domingoActualStr = fmt(domingoActual);

  // Mes natural en curso
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioMesStr = fmt(inicioMes);

  const porAlumno = {};
  registros.forEach(r => {
    if (!porAlumno[r.alumno_id]) {
      porAlumno[r.alumno_id] = {
        total: 0, presentes: 0,
        sem_total: 0, sem_presentes: 0,
        quin_total: 0, quin_presentes: 0,
        mens_total: 0, mens_presentes: 0,
        sem_actual_total: 0, sem_actual_faltas: 0,
        mes_total: 0, mes_faltas: 0,
        justificadas: 0,
        registros: []
      };
    }
    const stats = porAlumno[r.alumno_id];
    const fecha = r.fecha;
    const presente = r.presente === true;
    // Lectura defensiva: solo === true cuenta como justificada.
    const justificada = r.justificada === true;

    // Toda fila (justificada o no) se guarda en registros para que siga
    // VISIBLE en el historial (ultimas_8, racha, historico_semanas). El flag
    // justificada permite al frontend pintarla distinta (gold).
    stats.registros.push({ fecha: fecha, presente: presente, justificada: justificada });

    // Falta justificada: se EXCLUYE de todos los porcentajes. No suma a total
    // ni a presentes en ninguna ventana (semanal, quincenal, mensual, semana
    // actual, mes actual, total), para que el % no se vea penalizado.
    // Solo se contabiliza aparte en stats.justificadas. No tocamos los _total
    // de las ventanas mas abajo: salimos tras registrar la justificada.
    if (justificada) {
      stats.justificadas++;
      return;
    }

    stats.total++;
    if (presente) stats.presentes++;

    if (fecha >= hace7Str && fecha <= hoyStr) {
      stats.sem_total++;
      if (presente) stats.sem_presentes++;
    }
    if (fecha >= hace15Str && fecha <= hoyStr) {
      stats.quin_total++;
      if (presente) stats.quin_presentes++;
    }
    if (fecha >= hace30Str && fecha <= hoyStr) {
      stats.mens_total++;
      if (presente) stats.mens_presentes++;
    }
    if (fecha >= lunesActualStr && fecha <= domingoActualStr) {
      stats.sem_actual_total++;
      if (!presente) stats.sem_actual_faltas++;
    }
    if (fecha >= inicioMesStr && fecha <= hoyStr) {
      stats.mes_total++;
      if (!presente) stats.mes_faltas++;
    }
  });

  const pct = (presentes, total) => total > 0 ? Math.round((presentes / total) * 100) : 0;

  return alumnos.map(a => {
    const s = porAlumno[a.id] || {
      total: 0, presentes: 0,
      sem_total: 0, sem_presentes: 0,
      quin_total: 0, quin_presentes: 0,
      mens_total: 0, mens_presentes: 0,
      sem_actual_total: 0, sem_actual_faltas: 0,
      mes_total: 0, mes_faltas: 0,
      justificadas: 0,
      registros: []
    };

    // Ordenar registros del alumno por fecha ascendente (mas antiguo primero)
    const regsOrdenados = s.registros.slice().sort(function(x, y) {
      return x.fecha < y.fecha ? -1 : (x.fecha > y.fecha ? 1 : 0);
    });

    // Ultimas 8 clases (mas reciente al final, como histograma). Incluye las
    // justificadas con su flag para que el frontend las pinte distinto (gold).
    const ultimas_8 = regsOrdenados.slice(-8);

    // Racha de faltas: cuantas clases consecutivas mas recientes son falta NO
    // justificada. Una justificada es NEUTRAL: no incrementa la racha (no es
    // una falta real) pero tampoco la rompe (se salta con continue). Asi una
    // justificada no infla la racha ni oculta faltas reales consecutivas.
    let racha = 0;
    for (let i = regsOrdenados.length - 1; i >= 0; i--) {
      if (regsOrdenados[i].justificada === true) continue; // neutral: ni suma ni resetea
      if (regsOrdenados[i].presente === false) racha++;
      else break;
    }

    // Historico semanal: agrupar por semana lun-dom, ultimas 8 semanas.
    // Coherencia con el %: una justificada NO cuenta en 'clases' ni en 'faltas'
    // (igual que se excluye del porcentaje). Se contabiliza aparte en
    // 'justificadas' para que la semana siga siendo visible y el frontend pueda
    // mostrar el marcador gold sin penalizar la ratio faltas/clases.
    const porSemana = {};
    regsOrdenados.forEach(function(r) {
      // Guarda: si la fecha esta malformada (editada a mano por Aurora como
      // dd/mm/yyyy, numero o vacia), dt queda Invalid Date y fmt/Utilities.formatDate
      // lanzaria una excepcion que subia hasta doGet como HTTP 500 para toda la
      // convocatoria. Ahora se salta del agrupado semanal sin tocar registros/
      // ultimas_8/pct ni el resto del resumen.
      if (typeof r.fecha !== 'string') return;
      const partes = r.fecha.split('-');
      if (partes.length !== 3) return;
      const yr = Number(partes[0]);
      const mo = Number(partes[1]);
      const dy = Number(partes[2]);
      if (isNaN(yr) || isNaN(mo) || isNaN(dy) || yr === 0 || mo === 0 || dy === 0) return;
      const dt = new Date(yr, mo - 1, dy);
      if (isNaN(dt.getTime())) return;
      const lun = mondayOf_(dt);
      const lunStr = fmt(lun);
      if (!porSemana[lunStr]) {
        porSemana[lunStr] = { semana_inicio: lunStr, clases: 0, faltas: 0, justificadas: 0 };
      }
      if (r.justificada === true) {
        porSemana[lunStr].justificadas++;
        return; // no suma a clases ni faltas: coherente con el %
      }
      porSemana[lunStr].clases++;
      if (!r.presente) porSemana[lunStr].faltas++;
    });
    const semanasArr = Object.keys(porSemana)
      .sort()
      .map(function(k) { return porSemana[k]; });
    const historico_semanas = semanasArr.slice(-8);

    return {
      alumno_id: a.id,
      nombre: a.nombre,
      profesor_id: a.profesor_id,
      grupo: a.grupo,
      // Campos viejos (compatibilidad)
      semanal: pct(s.sem_presentes, s.sem_total),
      quincenal: pct(s.quin_presentes, s.quin_total),
      mensual: pct(s.mens_presentes, s.mens_total),
      clases_total: s.total,
      clases_presentes: s.presentes,
      // Campos nuevos (faltas absolutas + tendencia)
      faltas_semana_actual: s.sem_actual_faltas,
      clases_semana_actual: s.sem_actual_total,
      faltas_mes: s.mes_faltas,
      clases_mes: s.mes_total,
      faltas_total: s.total - s.presentes,
      faltas_justificadas: s.justificadas,
      racha_faltas: racha,
      ultimas_8: ultimas_8,
      historico_semanas: historico_semanas
    };
  });
}

// ============================================================
// POST — Escritura de datos
// ============================================================

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    const authError = validateApiKey(body.api_key, body.action)
    if (authError) return authError

    const action = body.action;

    switch (action) {
      case 'guardarAsistencia':
        return handleGuardarAsistencia(body);
      case 'crearAlumno':
        return handleCrearAlumno(body);
      case 'actualizarAlumno':
        return handleActualizarAlumno(body);
      case 'justificarFalta':
        return handleJustificarFalta(body);
      default:
        return jsonError('Accion POST no reconocida: ' + action, 400);
    }
  } catch (err) {
    writeLog('API', 'ERROR_POST', (body && body.action || 'sin-action') + ' | ' + err.message);
    return jsonError(err.message, 500);
  }
}

/**
 * Guarda la asistencia de un grupo completo para una fecha.
 *
 * Body esperado:
 * {
 *   action: "guardarAsistencia",
 *   fecha: "2026-04-15",
 *   convocatoria_id: "conv-2026-04",
 *   profesor_id: "prof-samuel",
 *   grupo: "G1",
 *   alumnos: [
 *     { alumno_id: "alu-001", presente: true },
 *     { alumno_id: "alu-002", presente: false }
 *   ]
 * }
 */
function handleGuardarAsistencia(body) {
  const { fecha, convocatoria_id, profesor_id, grupo, alumnos } = body;

  if (!fecha || !convocatoria_id || !profesor_id || !grupo || !alumnos) {
    return jsonError('Faltan campos obligatorios: fecha, convocatoria_id, profesor_id, grupo, alumnos', 400);
  }

  // Lock para evitar escrituras concurrentes (cola india)
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return jsonError('Servidor ocupado, reintenta en unos segundos', 503);
  }

  try {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ASISTENCIA);

  if (!sheet) {
    return jsonError('No se encontro la hoja ASISTENCIA', 500);
  }

  // Eliminar registros previos de la misma fecha/grupo/profesor/convocatoria
  // Estrategia: filtrar filas que NO coinciden + agregar nuevas → reescribir todo
  // Una sola operacion de escritura en vez de N deleteRow() individuales
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const fechaCol = headers.indexOf('fecha');
  const convCol = headers.indexOf('convocatoria_id');
  const profCol = headers.indexOf('profesor_id');
  const grupoCol = headers.indexOf('grupo');
  const alumnoCol = headers.indexOf('alumno_id');
  // Columnas nuevas; -1 si la hoja real aun no tiene las cabeceras (degradacion con gracia)
  const justCol = headers.indexOf('justificada');
  const motivoCol = headers.indexOf('motivo');
  const tz = Session.getScriptTimeZone();

  // Filtrar: conservar filas que NO son del mismo grupo/fecha.
  // En paralelo, construir mapa de preservacion de justificaciones de las filas
  // que SI vamos a borrar (mismo fecha/grupo/profesor/convocatoria), para no
  // perder justificaciones previas al borrar+reescribir el dia.
  const filasConservadas = [];
  const preservadas = {}; // alumno_id -> { justificada: bool, motivo: string }
  for (let i = 1; i < data.length; i++) {
    // Saltar filas vacias
    if (!data[i][0] && data[i][0] !== 0) continue;

    const rowFecha = data[i][fechaCol];
    const rowFechaStr = rowFecha instanceof Date
      ? Utilities.formatDate(rowFecha, tz, 'yyyy-MM-dd')
      : rowFecha;

    const esMismoGrupo = rowFechaStr === fecha &&
        data[i][convCol] === convocatoria_id &&
        data[i][profCol] === profesor_id &&
        data[i][grupoCol] === grupo;

    if (!esMismoGrupo) {
      filasConservadas.push(data[i]);
    } else if (justCol !== -1) {
      // Fila que se va a borrar: guardar su justificacion si la tiene
      const rowJust = data[i][justCol] === true;
      if (rowJust) {
        preservadas[data[i][alumnoCol]] = {
          justificada: true,
          motivo: motivoCol !== -1 ? (data[i][motivoCol] || '') : ''
        };
      }
    }
  }

  // Agregar nuevos registros. Cada fila se extiende a headers.length valores.
  // Justificada/motivo solo se preservan para alumnos que SIGUEN ausentes
  // (no tiene sentido justificar una presencia).
  const ahora = new Date();
  const numCols = headers.length;
  const filasNuevas = alumnos.map(a => {
    const presente = a.presente === true;
    const prev = (!presente && preservadas[a.alumno_id]) || null;
    const fila = [
      fecha,
      a.alumno_id,
      convocatoria_id,
      profesor_id,
      grupo,
      presente,
      ahora
    ];
    // Rellenar columnas restantes (justificada, motivo y cualquier futura) por indice
    while (fila.length < numCols) fila.push('');
    if (justCol !== -1) fila[justCol] = prev ? true : false;
    if (motivoCol !== -1) fila[motivoCol] = prev ? prev.motivo : '';
    return fila;
  });

  const todasLasFilas = filasConservadas.concat(filasNuevas);

  // Reescribir hoja completa (una sola operacion). Usar headers.length en vez
  // de un numero magico para robustez ante el numero real de columnas.
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, numCols).clearContent();
  }
  if (todasLasFilas.length > 0) {
    sheet.getRange(2, 1, todasLasFilas.length, numCols).setValues(todasLasFilas);
  }

  // Invalidar cache de resumen y de asistencia para esta convocatoria
  cacheInvalidate(['res_' + convocatoria_id, 'asist_' + convocatoria_id]);

  // Actualizar estadisticas de la hoja de grupo afectada
  try {
    actualizarEstadisticasGrupo(convocatoria_id, profesor_id, grupo);
  } catch (err) {
    Logger.log('Error actualizando estadisticas: ' + err.message);
  }

  // Log
  const presentes = alumnos.filter(a => a.presente).length;
  writeLog(
    profesor_id,
    'GUARDAR_ASISTENCIA',
    grupo + ' | ' + fecha + ' | ' + presentes + '/' + alumnos.length + ' presentes'
  );

  return jsonResponse({
    message: 'Asistencia guardada correctamente',
    registros: filasNuevas.length,
    presentes: presentes
  });

  } finally {
    lock.releaseLock();
  }
}

/**
 * Justifica (o desjustifica) una falta concreta de un alumno.
 *
 * Una falta justificada se excluye del calculo de asistencia (ver computeResumen).
 * Solo se pueden justificar ausencias (presente === false), nunca presencias.
 *
 * Body esperado:
 * {
 *   action: "justificarFalta",
 *   convocatoria_id: "conv-2026-04",
 *   profesor_id: "prof-samuel",
 *   grupo: "G1",
 *   alumno_id: "alu-001",
 *   fecha: "2026-04-15",
 *   justificada: true,
 *   motivo: "Enfermedad"
 * }
 *
 * La fila se identifica por fecha + alumno_id + convocatoria_id (clave unica
 * en la practica: un alumno pertenece a un solo grupo/profesor por convocatoria).
 */
function handleJustificarFalta(body) {
  const { convocatoria_id, profesor_id, grupo, alumno_id, fecha, justificada, motivo } = body;

  // Validar obligatorios. justificada debe ser booleano explicito.
  if (!convocatoria_id || !alumno_id || !fecha || typeof justificada !== 'boolean') {
    return jsonError('Faltan campos obligatorios: convocatoria_id, alumno_id, fecha, justificada (booleano)', 400);
  }

  // Lock para evitar escrituras concurrentes (mismo patron que guardar)
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return jsonError('Servidor ocupado, reintenta en unos segundos', 503);
  }

  try {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ASISTENCIA);

  if (!sheet) {
    return jsonError('No se encontro la hoja ASISTENCIA', 500);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const fechaCol = headers.indexOf('fecha');
  const alumnoCol = headers.indexOf('alumno_id');
  const convCol = headers.indexOf('convocatoria_id');
  const presenteCol = headers.indexOf('presente');
  const justCol = headers.indexOf('justificada');
  const motivoCol = headers.indexOf('motivo');
  const tz = Session.getScriptTimeZone();

  // Las columnas nuevas deben existir en la hoja real (paso manual del usuario).
  // Si faltan, no se puede escribir: devolver error claro en vez de corromper datos.
  if (justCol === -1 || motivoCol === -1) {
    return jsonError('La hoja ASISTENCIA no tiene las columnas justificada/motivo. Anadelas en la fila 1.', 500);
  }

  // Localizar la fila unica por fecha + alumno_id + convocatoria_id
  let filaIndex = -1;
  let coincidencias = 0;
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0] && data[i][0] !== 0) continue;

    const rowFecha = data[i][fechaCol];
    const rowFechaStr = rowFecha instanceof Date
      ? Utilities.formatDate(rowFecha, tz, 'yyyy-MM-dd')
      : rowFecha;

    if (rowFechaStr === fecha &&
        data[i][alumnoCol] === alumno_id &&
        data[i][convCol] === convocatoria_id) {
      coincidencias++;
      if (filaIndex === -1) filaIndex = i;
    }
  }

  if (filaIndex === -1) {
    return jsonError('Falta no encontrada', 404);
  }

  // Datos sucios: loguear si hay duplicados; se actualiza la primera coincidencia.
  if (coincidencias > 1) {
    writeLog(profesor_id || 'API', 'JUSTIFICAR_FALTA_DUP',
      'Duplicados (' + coincidencias + ') para ' + fecha + ' | ' + alumno_id + ' | ' + convocatoria_id);
  }

  // No se puede justificar una presencia
  if (data[filaIndex][presenteCol] === true) {
    return jsonError('No se puede justificar una presencia', 400);
  }

  // Escribir justificada/motivo. Al desjustificar se limpia el motivo.
  const nuevoMotivo = justificada ? (motivo || '') : '';
  sheet.getRange(filaIndex + 1, justCol + 1).setValue(justificada);
  sheet.getRange(filaIndex + 1, motivoCol + 1).setValue(nuevoMotivo);

  // Invalidar cache de resumen y asistencia (cambia el calculo de porcentajes)
  cacheInvalidate(['res_' + convocatoria_id, 'asist_' + convocatoria_id]);

  writeLog(
    profesor_id || 'API',
    'JUSTIFICAR_FALTA',
    (grupo || '') + ' | ' + fecha + ' | ' + alumno_id + ' | ' + (justificada ? nuevoMotivo : 'quitada')
  );

  return jsonResponse({ message: 'Falta actualizada', justificada: justificada, motivo: nuevoMotivo });

  } finally {
    lock.releaseLock();
  }
}

/**
 * Crea un alumno nuevo.
 *
 * Body esperado:
 * {
 *   action: "crearAlumno",
 *   nombre: "Rosa Cruz Ruiz",
 *   convocatoria_id: "conv-2026-04",
 *   profesor_id: "prof-samuel",
 *   grupo: "G1",
 *   email: "",
 *   telefono: ""
 * }
 */
function handleCrearAlumno(body) {
  const { nombre, convocatoria_id, profesor_id, grupo } = body;

  if (!nombre || !convocatoria_id || !profesor_id || !grupo) {
    return jsonError('Faltan campos obligatorios: nombre, convocatoria_id, profesor_id, grupo', 400);
  }

  // Lock para evitar IDs duplicados en escrituras concurrentes
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return jsonError('Servidor ocupado, reintenta en unos segundos', 503);
  }

  try {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ALUMNOS);

  const id = generateId('alu');

  sheet.appendRow([
    id,
    nombre,
    convocatoria_id,
    profesor_id,
    grupo,
    body.email || '',
    body.telefono || '',
    true // activo
  ]);

  // Invalidar cache de alumnos para esta convocatoria
  cacheInvalidate(['alu_' + convocatoria_id]);

  writeLog(body.usuario || 'admin', 'CREAR_ALUMNO', nombre + ' | ' + grupo + ' | ' + convocatoria_id);

  return jsonResponse({ id: id, message: 'Alumno creado correctamente' });

  } finally {
    lock.releaseLock();
  }
}

/**
 * Actualiza datos de un alumno existente (mover grupo, cambiar profesor, dar de baja).
 *
 * Body esperado:
 * {
 *   action: "actualizarAlumno",
 *   alumno_id: "alu-001",
 *   campos: {
 *     grupo: "G3",
 *     profesor_id: "prof-maria",
 *     activo: false
 *   }
 * }
 */
function handleActualizarAlumno(body) {
  const { alumno_id, campos } = body;

  if (!alumno_id || !campos) {
    return jsonError('Faltan campos obligatorios: alumno_id, campos', 400);
  }

  // Lock para evitar lecturas inconsistentes durante actualizacion
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return jsonError('Servidor ocupado, reintenta en unos segundos', 503);
  }

  try {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ALUMNOS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');

  // Buscar fila del alumno
  let filaIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === alumno_id) {
      filaIndex = i;
      break;
    }
  }

  if (filaIndex === -1) {
    return jsonError('Alumno no encontrado: ' + alumno_id, 404);
  }

  // Actualizar campos especificados
  const camposActualizados = [];
  Object.keys(campos).forEach(campo => {
    const colIndex = headers.indexOf(campo);
    if (colIndex !== -1) {
      sheet.getRange(filaIndex + 1, colIndex + 1).setValue(campos[campo]);
      camposActualizados.push(campo + '=' + campos[campo]);
    }
  });

  // Invalidar cache de alumnos, asistencia y resumen.
  // Un cambio de grupo/profesor afecta a las tres (el filtrado depende de ellos).
  cacheInvalidate(['alu_', 'asist_', 'res_']);

  writeLog(
    body.usuario || 'admin',
    'ACTUALIZAR_ALUMNO',
    alumno_id + ' | ' + camposActualizados.join(', ')
  );

  return jsonResponse({ message: 'Alumno actualizado', campos: camposActualizados });

  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// WARM CACHE — Calentar cache de resumenes (disparador matutino)
// ============================================================

/**
 * Pre-calcula y cachea el resumen de cada convocatoria activa.
 *
 * Pensado para ejecutarse con un disparador time-driven temprano (ej. 7:00),
 * de modo que el primer profesor del dia no pague el calculo en frio
 * (medido en ~6,5s vs ~1,6s en caliente).
 *
 * Configuracion del disparador (manual, una vez):
 *   Editor Apps Script > Disparadores > Anadir disparador
 *   - Funcion: warmCache
 *   - Evento: Basado en tiempo > Temporizador diario > 6-7 a.m.
 */
function warmCache() {
  const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const convocatorias = sheetToObjects(SHEET_NAMES.CONVOCATORIAS)
    .filter(c => isTruthy(c.activa) && c.fecha_inicio <= hoy && hoy <= c.fecha_fin);

  if (convocatorias.length === 0) {
    writeLog('SISTEMA', 'WARM_CACHE', '0 convocatorias activas, nada que precalentar');
    return 0;
  }

  // Lectura UNICA de las hojas pesadas. Se reutilizan para todas las
  // convocatorias en lugar de releerlas por cada una: esto elimina el
  // O(convocatorias x hoja) que hacia que el run cruzara el cap de 6 min
  // cuando la latencia de Sheets es alta a primera hora.
  const alumnos = sheetToObjects(SHEET_NAMES.ALUMNOS);
  const registros = sheetToObjects(SHEET_NAMES.ASISTENCIA);

  let calentadas = 0;
  let fallidas = 0;
  convocatorias.forEach(c => {
    // try/catch por convocatoria: una lenta o con datos corruptos no debe
    // tumbar el calentado de las demas.
    try {
      // Resumen global de la convocatoria (sin filtro de profesor/grupo).
      // La clave debe coincidir EXACTA con la de handleGetResumen:
      // 'res_' + convocatoria_id + '_' + profesor_id + '_' + grupo (ultimos vacios).
      const cacheKey = 'res_' + c.id + '_' + '' + '_' + '';
      // WARM_TTL (6h) en vez del CACHE_TTL por defecto: el calentado debe llegar
      // a la franja de uso real, no expirar a los 2 min.
      cachedGet(cacheKey, function() {
        return computeResumen(c.id, '', '', alumnos, registros);
      }, WARM_TTL);
      calentadas++;
    } catch (err) {
      fallidas++;
      writeLog('SISTEMA', 'WARM_CACHE_ERROR', c.id + ' | ' + err.message);
    }
  });

  writeLog('SISTEMA', 'WARM_CACHE',
    calentadas + ' precalentada(s)' + (fallidas ? ' | ' + fallidas + ' fallida(s)' : ''));
  return calentadas;
}

// ============================================================
// SETUP — Ejecutar una vez para crear las hojas
// ============================================================

/**
 * Ejecutar manualmente desde el editor de Apps Script para crear
 * las 5 hojas con sus cabeceras.
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const hojas = {
    'CONVOCATORIAS': ['id', 'nombre', 'fecha_inicio', 'fecha_fin', 'activa'],
    // Columnas E..I (password_hash, salt, rol, must_change_password,
    // token_version) AÑADIDAS al final para la auth real: NO reordenar las 4
    // primeras (id, nombre, email, activo). Gestion convocatorias.js indexa por
    // posicion (data[i][0/1/3]) y reordenar romperia esos accesos.
    'PROFESORES': ['id', 'nombre', 'email', 'activo', 'password_hash', 'salt', 'rol', 'must_change_password', 'token_version'],
    'ALUMNOS': ['id', 'nombre', 'convocatoria_id', 'profesor_id', 'grupo', 'email', 'telefono', 'activo'],
    'ASISTENCIA': ['fecha', 'alumno_id', 'convocatoria_id', 'profesor_id', 'grupo', 'presente', 'hora_registro', 'justificada', 'motivo'],
    'LOG': ['timestamp', 'usuario', 'accion', 'detalle']
  };

  Object.keys(hojas).forEach(nombre => {
    let sheet = ss.getSheetByName(nombre);
    if (!sheet) {
      sheet = ss.insertSheet(nombre);
    }

    // Escribir cabeceras en fila 1
    const headers = hojas[nombre];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Formato cabecera: negrita + fondo gris
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#f3f3f3');

    // Congelar fila 1
    sheet.setFrozenRows(1);
  });

  // Formato especial: columna 'activa'/'activo' como checkbox
  // 400 filas cubre los 336 alumnos actuales con margen. Si se deja en 50,
  // las filas 51+ reciben el valor activo como texto (VERDADERO/TRUE) en vez
  // de booleano nativo, y un filtro estricto === true descartaria esos alumnos.
  const CHECKBOX_ROWS = 400;
  const checkboxSheets = ['CONVOCATORIAS', 'PROFESORES', 'ALUMNOS'];
  checkboxSheets.forEach(nombre => {
    const sheet = ss.getSheetByName(nombre);
    const headers = hojas[nombre];
    const activoCol = headers.indexOf('activa') !== -1
      ? headers.indexOf('activa')
      : headers.indexOf('activo');
    if (activoCol !== -1) {
      const rule = SpreadsheetApp.newDataValidation()
        .requireCheckbox()
        .build();
      sheet.getRange(2, activoCol + 1, CHECKBOX_ROWS, 1).setDataValidation(rule);
    }
  });

  // NO aplicar checkbox masivo a ASISTENCIA.presente
  // Los valores TRUE/FALSE se escriben por codigo al guardar asistencia

  writeLog('SISTEMA', 'SETUP', 'Hojas creadas/verificadas correctamente');
  SpreadsheetApp.getUi().alert('Setup completado. Las 5 hojas estan listas.');
}

// ============================================================
// PROTEGER ESTRUCTURA — Ejecutar una vez
// ============================================================

/**
 * Protege la fila de cabeceras (fila 1) de todas las hojas del sistema
 * para que Aurora no pueda modificar nombres de columnas ni estructura.
 * Aurora puede editar datos (fila 2+), pero no cabeceras.
 *
 * Ejecutar manualmente desde el editor de Apps Script.
 * Requiere el email de Aurora como editor permitido.
 */
function protegerEstructura() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const emailResp = ui.prompt(
    'Email de Aurora',
    'Introduce el email de Aurora (editora de datos):',
    ui.ButtonSet.OK_CANCEL
  );
  if (emailResp.getSelectedButton() !== ui.Button.OK) return;
  const auroraEmail = emailResp.getResponseText().trim();
  if (!auroraEmail) {
    ui.alert('Email vacio. Operacion cancelada.');
    return;
  }

  const hojasProteger = ['CONVOCATORIAS', 'PROFESORES', 'ALUMNOS', 'ASISTENCIA', 'LOG'];
  let protegidas = 0;

  hojasProteger.forEach(nombre => {
    const sheet = ss.getSheetByName(nombre);
    if (!sheet) return;

    const numCols = sheet.getMaxColumns();

    // Proteger fila 1 (cabeceras) — solo el owner puede editarla
    const protCabecera = sheet.getRange(1, 1, 1, numCols).protect()
      .setDescription('Cabeceras ' + nombre + ' — no modificar');
    protCabecera.removeEditors(protCabecera.getEditors());
    if (protCabecera.canDomainEdit()) {
      protCabecera.setDomainEdit(false);
    }

    // Proteger la hoja completa pero permitir edicion de datos (fila 2+)
    const protHoja = sheet.protect()
      .setDescription('Estructura ' + nombre + ' — Aurora solo edita datos');
    protHoja.addEditor(auroraEmail);
    // Marcar fila 2+ como no protegida (Aurora puede editar datos)
    protHoja.setUnprotectedRanges([sheet.getRange(2, 1, sheet.getMaxRows() - 1, numCols)]);
    if (protHoja.canDomainEdit()) {
      protHoja.setDomainEdit(false);
    }

    protegidas++;
  });

  writeLog('SISTEMA', 'PROTEGER_ESTRUCTURA', protegidas + ' hojas protegidas | editor: ' + auroraEmail);
  ui.alert('Estructura protegida en ' + protegidas + ' hojas.\nAurora (' + auroraEmail + ') puede editar datos pero no cabeceras ni estructura.');
}

// ============================================================
// AUTENTICACION — PRIMITIVAS (v1.2)
// ============================================================
//
// Bloque de primitivas criptograficas para la auth real (Fase 1 del plan
// .planning/security-auth-plan-v1.2.md). SOLO helpers: NO se modifican
// doGet/doPost/validateApiKey ni ningun handler. La integracion en el gate
// y los handlers ocurre en la Fase 3.
//
// Modelo de amenaza cubierto (resumen): identidad y rol viajan firmados con
// HMAC-SHA256 en un token de sesion, de modo que el backend deriva la
// identidad del token (no del body/query). Las comparaciones de firma y de
// hash de password se hacen en tiempo constante para no filtrar informacion
// por timing. exp del token en SEGUNDOS Unix (unidad unica, red-team #9).

// Algoritmos reutilizables (evita repetir las enums largas de Utilities).
const DIGEST_SHA_256 = Utilities.DigestAlgorithm.SHA_256;

// TTL maximo aceptable de un token, en segundos. validateToken_ rechaza
// cualquier token cuyo exp supere now + MAX_TTL_SEG: corta tokens forjados
// con expiraciones absurdamente lejanas aunque la firma fuese valida.
const MAX_TTL_SEG = 24 * 60 * 60; // 24 horas

// Prefijo de dominio que se antepone al payload antes de firmar/verificar.
// Evita colisiones de firma entre contextos distintos (separacion de dominio).
const TOKEN_SIGN_PREFIX = 'novattend.v1.';

// Valor placeholder de SESSION_SECRET: si la propiedad aun contiene esto,
// se considera NO configurada (signToken_ lanza, setSessionSecret regenera).
const SESSION_SECRET_PLACEHOLDER = 'REEMPLAZAR';

// Numero UNICO de iteraciones PBKDF2 compartido por TODA la auth: la migracion
// (migrarPasswordsProfesores) genera los hashes con este valor y el login
// (Fase 3) debe verificar con EXACTAMENTE el mismo. Si divergen, ningun
// password migrado validaria jamas. Ajustable midiendo latencia real en deploy
// (Fase 0): el mayor N que mantenga el login por debajo de ~2-3s. Cambiar este
// valor obliga a re-migrar todos los hashes existentes.
const PBKDF2_ITER = 10000;

/**
 * Comparacion en tiempo constante de dos valores (string o Byte[]).
 *
 * No hace early-return por longitud: hashea AMBOS lados con SHA-256 y compara
 * los dos digests (siempre 32 bytes, longitud fija) byte a byte acumulando las
 * diferencias en un OR. El tiempo de ejecucion no depende de en que byte
 * difieren ni de la longitud de las entradas, asi que no filtra informacion
 * util a un atacante que mida latencias.
 *
 * NOTA: dos entradas distintas con el mismo SHA-256 darian igual, pero eso
 * exigiria una colision de SHA-256 (no factible), asi que es seguro.
 *
 * @param {string|Byte[]} a - Primer valor a comparar.
 * @param {string|Byte[]} b - Segundo valor a comparar.
 * @returns {boolean} true si los digests SHA-256 coinciden, false en otro caso.
 */
function constantEq_(a, b) {
  const ha = Utilities.computeDigest(DIGEST_SHA_256, a);
  const hb = Utilities.computeDigest(DIGEST_SHA_256, b);
  let r = 0;
  // Ambos digests miden 32 bytes; el bucle recorre longitud fija.
  for (let i = 0; i < ha.length; i++) {
    r |= ha[i] ^ hb[i];
  }
  return r === 0;
}

/**
 * Derivacion de clave PBKDF2 manual (N iteraciones de HMAC-SHA256).
 *
 * No existe PBKDF2 nativo en Apps Script, asi que se encadena
 * Utilities.computeHmacSha256Signature N veces usando el salt como clave HMAC.
 * El numero de iteraciones (iter) se fija midiendo latencia real en deploy
 * (Fase 0 del plan): el mayor N que mantenga el login por debajo de ~2-3s.
 *
 * @param {string} pwd  - Password en claro a derivar.
 * @param {string} salt - Salt por usuario (string; se usa como clave HMAC).
 * @param {number} iter - Numero de iteraciones (>= 1).
 * @returns {string} Hash derivado en base64 estandar.
 */
function pbkdf2_(pwd, salt, iter) {
  const saltBytes = Utilities.newBlob(salt).getBytes();
  // Semilla: HMAC del material (salt+pwd) en la primera vuelta y despues se
  // realimenta el resultado anterior, siempre con el salt como clave.
  let b = Utilities.newBlob(salt + pwd).getBytes();
  for (let i = 0; i < iter; i++) {
    b = Utilities.computeHmacSha256Signature(b, saltBytes);
  }
  return Utilities.base64Encode(b);
}

/**
 * Verifica un password en claro contra el hash almacenado.
 *
 * Rechaza explicitamente si faltan salt o hash (red-team deploy #6): una fila
 * sin credenciales no debe poder autenticarse jamas. La comparacion final usa
 * constantEq_ (tiempo constante) para no filtrar por timing si el prefijo del
 * hash coincide.
 *
 * @param {string} plain      - Password en claro recibido en el login.
 * @param {string} salt       - Salt almacenado para ese usuario.
 * @param {string} storedHash - Hash PBKDF2 almacenado (base64).
 * @param {number} iter       - Iteraciones usadas al generar storedHash.
 * @returns {boolean} true si el password es correcto, false en otro caso.
 */
function verifyPassword_(plain, salt, storedHash, iter) {
  if (!salt || !storedHash) return false; // sin credenciales: rechazo explicito
  return constantEq_(pbkdf2_(plain, salt, iter), storedHash);
}

/**
 * Firma un payload y devuelve el token de sesion.
 *
 * Exige SESSION_SECRET en ScriptProperties: lanza si falta o sigue siendo el
 * placeholder, para no emitir nunca tokens firmados con un secreto trivial.
 * Formato del token: `payloadB64.sigB64`, ambos en base64 WebSafe. La firma es
 * HMAC-SHA256 sobre (TOKEN_SIGN_PREFIX + payloadB64), no sobre el payload
 * crudo (separacion de dominio).
 *
 * @param {Object} payload - Objeto a firmar (ej. {v,profesor_id,rol,exp,ver}).
 * @returns {string} Token de sesion `payloadB64.sigB64`.
 * @throws {Error} Si SESSION_SECRET no esta configurado.
 */
function signToken_(payload) {
  const sec = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET');
  if (!sec || sec === SESSION_SECRET_PLACEHOLDER) {
    throw new Error('SESSION_SECRET no configurado');
  }
  const p = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  const sig = Utilities.computeHmacSha256Signature(TOKEN_SIGN_PREFIX + p, sec);
  return p + '.' + Utilities.base64EncodeWebSafe(sig);
}

/**
 * Valida un token de sesion y devuelve la identidad si es legitimo.
 *
 * Orden de validacion (critico): primero VERIFICA LA FIRMA y solo despues
 * parsea el payload. Asi un payload manipulado (ej. forjar alg=none o inyectar
 * campos arbitrarios, red-team cripto #1) nunca llega al JSON.parse con firma
 * invalida. Tras parsear se aplican TIPOS ESTRICTOS:
 *   - v === 1 (version de esquema esperada),
 *   - profesor_id: string que matchea /^prof-[a-z0-9._-]+$/,
 *   - rol en {'teacher','ceo'},
 *   - exp: number en SEGUNDOS con now < exp <= now + MAX_TTL_SEG.
 *
 * @param {string} token - Token `payloadB64.sigB64`.
 * @returns {{profesor_id: string, rol: string, ver: *}|null} Identidad o null.
 */
function validateToken_(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const sec = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET');
  if (!sec || sec === SESSION_SECRET_PLACEHOLDER) return null;

  // 1) Verificar firma ANTES de parsear nada del payload.
  const sig = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(TOKEN_SIGN_PREFIX + parts[0], sec)
  );
  if (!constantEq_(sig, parts[1])) return null;

  // 2) Solo con firma valida se decodifica y parsea el payload.
  let pl;
  try {
    pl = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  } catch (e) {
    return null;
  }
  if (!pl || typeof pl !== 'object') return null;

  // 3) Validacion estricta de tipos y rangos.
  if (pl.v !== 1) return null;
  if (typeof pl.profesor_id !== 'string' || !/^prof-[a-z0-9._-]+$/.test(pl.profesor_id)) return null;
  if (pl.rol !== 'teacher' && pl.rol !== 'ceo') return null;
  const now = Math.floor(Date.now() / 1000); // SEGUNDOS Unix
  if (typeof pl.exp !== 'number' || pl.exp <= now || pl.exp > now + MAX_TTL_SEG) return null;

  return { profesor_id: pl.profesor_id, rol: pl.rol, ver: pl.ver };
}

/**
 * Configura SESSION_SECRET en ScriptProperties (idempotente).
 *
 * Ejecutar UNA VEZ desde el editor de Apps Script (NO via web). Es IDEMPOTENTE:
 * si ya existe un secreto valido (distinto del placeholder), NO lo regenera,
 * para no invalidar las sesiones activas (red-team deploy #5). Solo genera uno
 * nuevo si falta o sigue siendo el placeholder.
 *
 * El secreto son 256 bits de entropia (dos UUID v4 concatenados, ~256 bits)
 * codificados en base64. Suficiente para una clave HMAC-SHA256.
 */
function setSessionSecret() {
  const props = PropertiesService.getScriptProperties();
  const current = props.getProperty('SESSION_SECRET');
  if (current && current !== SESSION_SECRET_PLACEHOLDER) {
    Logger.log('SESSION_SECRET ya configurado: no se regenera (idempotente)');
    return;
  }
  // 2x UUID v4 (32 hex utiles c/u) => ~256 bits de entropia.
  const raw = Utilities.getUuid() + Utilities.getUuid();
  const secret = Utilities.base64Encode(Utilities.newBlob(raw).getBytes());
  props.setProperty('SESSION_SECRET', secret);
  Logger.log('SESSION_SECRET generado y guardado (256 bits)');
}

// --- SELF-TEST MANUAL (NO ejecutar en deploy; solo referencia de uso) --------
//
// Para validar ida y vuelta desde el editor de Apps Script, tras correr
// setSessionSecret() una vez, ejecutar manualmente algo como:
//
//   function _selfTestAuth() {
//     const now = Math.floor(Date.now() / 1000);
//     const tok = signToken_({ v: 1, profesor_id: 'prof-x', rol: 'teacher', exp: now + 3600, ver: 1 });
//     Logger.log(validateToken_(tok));                 // => {profesor_id:'prof-x', rol:'teacher', ver:1}
//     Logger.log(validateToken_(tok + 'x'));           // => null (firma alterada)
//     const expirado = signToken_({ v: 1, profesor_id: 'prof-x', rol: 'teacher', exp: now - 1, ver: 1 });
//     Logger.log(validateToken_(expirado));            // => null (exp pasado)
//     const rolMalo = signToken_({ v: 1, profesor_id: 'prof-x', rol: 'admin', exp: now + 3600, ver: 1 });
//     Logger.log(validateToken_(rolMalo));             // => null (rol no permitido)
//   }
//
// Se deja COMENTADO a proposito: la Fase 1 no ejecuta nada, solo anade helpers.
// -----------------------------------------------------------------------------

// ============================================================
// AUTENTICACION — MIGRACION DE CREDENCIALES (Fase 2)
// ============================================================
//
// migrarPasswordsProfesores hashea las contrasenas iniciales de los profesores
// y crea la fila del CEO. Se ejecuta UNA SOLA VEZ y de forma MANUAL desde el
// editor de Apps Script (NUNCA via web): no esta cableada a doGet/doPost.
//
// SEGURIDAD: el codigo COMMITEADO no contiene NINGUNA contrasena real. Las
// contrasenas temporales viven solo en el documento de credenciales del
// Escritorio y se pasan como parametro en el momento de ejecutar. Esta funcion
// NUNCA loguea contrasenas en claro: solo conteos.

/**
 * Migra las credenciales de los profesores a la hoja PROFESORES (Fase 2).
 *
 * Ejecutar MANUALMENTE desde el editor, una sola vez, en el deploy coordinado
 * (Fase 8). Requisitos previos (los hace el owner a mano, red-team deploy #6):
 *   - La hoja PROFESORES debe tener ya las cabeceras E..I
 *     (password_hash, salt, rol, must_change_password, token_version). El ALTER
 *     se hace a mano para no disparar el alert UI de setupSheets.
 *
 * Para cada usuario del objeto tempPasswords:
 *   - id  = (usuario === 'admin') ? 'prof-admin' : 'prof-' + usuario
 *   - rol = (usuario === 'admin') ? 'ceo'        : 'teacher'
 *   - salt = UUID nuevo, hash = pbkdf2_(passwordEnClaro, salt, PBKDF2_ITER)
 *   - must_change_password = true, token_version = 1
 * Si la fila del id existe se actualizan sus columnas E..I; si no existe (caso
 * tipico de prof-admin) se hace append de una fila nueva con el numero de
 * columnas correcto. La escritura es en batch por fila (setValues), no celda a
 * celda. Al final se valida la integridad: ninguna fila activa puede quedar con
 * salt o password_hash vacios.
 *
 * @param {Object<string,string>} tempPasswords - Mapa { usuario: passwordEnClaro }.
 *        Pegar el objeto TEMP_PASSWORDS del documento de credenciales del
 *        Escritorio. NO existe valor por defecto: si falta, la funcion aborta.
 * @returns {{migrados: number, creados: number, errores: string[]}} Resumen.
 * @throws {Error} Si tempPasswords falta/esta vacio o si faltan las columnas E..I.
 */
function migrarPasswordsProfesores(tempPasswords) {
  // 1) El codigo no trae contrasenas: exigir el parametro explicitamente.
  if (!tempPasswords || typeof tempPasswords !== 'object' || Object.keys(tempPasswords).length === 0) {
    throw new Error(
      'Faltan las contrasenas. Pega el objeto TEMP_PASSWORDS del documento de ' +
      'credenciales del Escritorio como argumento y vuelve a ejecutar ' +
      'migrarPasswordsProfesores(TEMP_PASSWORDS).'
    );
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PROFESORES);
  if (!sheet) {
    throw new Error('No existe la hoja PROFESORES.');
  }

  // 2) Leer todo de una vez y resolver indices de columna POR CABECERA
  //    (no por posicion fija), para no romperse si el orden cambiara.
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());

  const colId = headers.indexOf('id');
  const colNombre = headers.indexOf('nombre');
  const colActivo = headers.indexOf('activo');
  const colHash = headers.indexOf('password_hash');
  const colSalt = headers.indexOf('salt');
  const colRol = headers.indexOf('rol');
  const colMustChange = headers.indexOf('must_change_password');
  const colTokenVer = headers.indexOf('token_version');

  // 3) Abortar si faltan las columnas nuevas: el ALTER lo hace el owner a mano.
  const faltantes = [];
  if (colHash === -1) faltantes.push('password_hash');
  if (colSalt === -1) faltantes.push('salt');
  if (colRol === -1) faltantes.push('rol');
  if (colMustChange === -1) faltantes.push('must_change_password');
  if (colTokenVer === -1) faltantes.push('token_version');
  if (faltantes.length > 0) {
    throw new Error(
      'Faltan columnas en PROFESORES: ' + faltantes.join(', ') + '. Anade primero ' +
      'las cabeceras E..I en la hoja PROFESORES (ALTER manual del owner) y reintenta.'
    );
  }

  const numCols = headers.length;
  let migrados = 0;
  let creados = 0;
  const errores = [];

  // 4) Procesar cada usuario del mapa de contrasenas temporales.
  Object.keys(tempPasswords).forEach(usuario => {
    const passwordEnClaro = tempPasswords[usuario];
    if (!passwordEnClaro || typeof passwordEnClaro !== 'string') {
      // No logueamos la contrasena; solo el usuario afectado.
      errores.push('Usuario "' + usuario + '": contrasena vacia o invalida, omitido.');
      return;
    }

    const esAdmin = (usuario === 'admin');
    const id = esAdmin ? 'prof-admin' : 'prof-' + usuario;
    const rol = esAdmin ? 'ceo' : 'teacher';
    const salt = Utilities.getUuid();
    const hash = pbkdf2_(passwordEnClaro, salt, PBKDF2_ITER);

    // Buscar la fila por id (data incluye la cabecera en el indice 0).
    let filaIdx = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colId]).trim() === id) {
        filaIdx = i;
        break;
      }
    }

    if (filaIdx !== -1) {
      // Fila existente: actualizar SOLO las columnas de credenciales. En la
      // migracion inicial token_version=1.
      data[filaIdx][colHash] = hash;
      data[filaIdx][colSalt] = salt;
      data[filaIdx][colRol] = rol;
      data[filaIdx][colMustChange] = true;
      data[filaIdx][colTokenVer] = 1;

      // Escribir la fila completa de una vez (un solo setValues por fila, no
      // celda a celda). Reescribir toda la fila preserva los valores existentes
      // (id, nombre, email, activo) ya cargados en data y no asume contiguidad
      // de las columnas nuevas, asi que es robusto si el ALTER manual las
      // colocara en otro orden.
      sheet.getRange(filaIdx + 1, 1, 1, numCols).setValues([data[filaIdx]]);
      migrados++;
    } else {
      // Fila inexistente (caso prof-admin): append de una fila completa con el
      // numero de columnas correcto. Solo el CEO se crea aqui; un teacher sin
      // fila se reporta como error (deberia existir desde el alta).
      if (!esAdmin) {
        errores.push('Usuario "' + usuario + '" (id ' + id + '): sin fila en PROFESORES, no migrado.');
        return;
      }
      const fila = new Array(numCols).fill('');
      fila[colId] = id;
      if (colNombre !== -1) fila[colNombre] = 'Rafa';
      if (colActivo !== -1) fila[colActivo] = true;
      fila[colHash] = hash;
      fila[colSalt] = salt;
      fila[colRol] = rol;
      fila[colMustChange] = true;
      fila[colTokenVer] = 1;
      sheet.appendRow(fila);
      // Reflejar la fila nueva en data para el check de integridad posterior.
      data.push(fila);
      creados++;
    }
  });

  // 5) Check de integridad: ninguna fila activa puede quedar sin credenciales.
  //    NO se loguea ninguna contrasena, solo el id de la fila incompleta.
  for (let i = 1; i < data.length; i++) {
    const activa = (colActivo !== -1) ? isTruthy(data[i][colActivo]) : false;
    if (!activa) continue;
    const sinSalt = !String(data[i][colSalt] || '').trim();
    const sinHash = !String(data[i][colHash] || '').trim();
    if (sinSalt || sinHash) {
      errores.push('Integridad: fila activa "' + String(data[i][colId]).trim() + '" sin salt/password_hash.');
    }
  }

  // 6) Log y resumen: SOLO conteos, jamas contrasenas en claro.
  const resumen = { migrados: migrados, creados: creados, errores: errores };
  writeLog(
    'SISTEMA',
    'MIGRAR_PASSWORDS',
    migrados + ' profesores migrados, ' + creados + ' creados, ' + errores.length + ' errores'
  );
  if (errores.length > 0) {
    Logger.log('migrarPasswordsProfesores: %s errores -> %s', errores.length, errores.join(' | '));
  }
  Logger.log('migrarPasswordsProfesores OK: %s migrados, %s creados', migrados, creados);
  return resumen;
}

// ============================================================
// API KEY — Ejecutar manualmente para configurar
// ============================================================

/**
 * Configura el API key en Script Properties.
 * Ejecutar UNA VEZ desde el editor de Apps Script.
 * Reemplazar el UUID con uno real generado via crypto.randomUUID().
 */
function setApiKey() {
  const key = 'REEMPLAZAR-CON-UUID-V4-REAL'
  PropertiesService.getScriptProperties().setProperty('API_KEY', key)
  Logger.log('API_KEY configurada correctamente')
}

/**
 * Verifica que el API key esta configurado en Script Properties.
 * Ejecutar para diagnostico.
 */
function checkApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('API_KEY')
  Logger.log('API_KEY presente: ' + Boolean(key))
  Logger.log('API_KEY longitud: ' + (key ? key.length : 0))
}
