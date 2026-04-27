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

// ============================================================
// CACHE
// ============================================================

const CACHE_TTL = 120; // segundos (2 minutos)
const cache_ = CacheService.getScriptCache();

/**
 * Lee del cache o ejecuta fetchFn y guarda el resultado.
 * Si el JSON supera 100KB, devuelve sin cachear.
 */
function cacheGet(key, fetchFn) {
  const cached = cache_.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const data = fetchFn();
  const json = JSON.stringify(data);

  // Limite de CacheService: 100KB por entrada
  if (json.length < 100000) {
    cache_.put(key, json, CACHE_TTL);
  }

  return data;
}

/**
 * Invalida todas las claves que coincidan con los prefijos dados.
 * CacheService no soporta iteracion, asi que mantenemos un registro
 * de claves activas en una clave especial '_keys'.
 */
function cacheInvalidate(prefixes) {
  const keysJson = cache_.get('_keys');
  if (!keysJson) return;

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
function cachedGet(key, fetchFn) {
  cacheTrackKey(key);
  return cacheGet(key, fetchFn);
}

// ============================================================
// UTILIDADES
// ============================================================

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

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Saltar filas vacias (primera columna vacia)
    if (!row[0] && row[0] !== false && row[0] !== 0) continue;

    const obj = {};
    headers.forEach((header, j) => {
      let val = row[j];
      // Convertir fechas de Google Sheets a string ISO
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
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
    return todas.filter(c => c.activa === true && c.fecha_inicio <= hoy && hoy <= c.fecha_fin);
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
    return sheetToObjects(SHEET_NAMES.PROFESORES).filter(p => p.activo === true);
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
    let alumnos = sheetToObjects(SHEET_NAMES.ALUMNOS).filter(a => a.activo === true);
    if (convocatoriaId) alumnos = alumnos.filter(a => a.convocatoria_id === convocatoriaId);
    if (profesorId) alumnos = alumnos.filter(a => a.profesor_id === profesorId);
    if (grupo) alumnos = alumnos.filter(a => a.grupo === grupo);
    return alumnos;
  });

  return jsonResponse(data);
}

/**
 * Devuelve registros de asistencia filtrados.
 */
function handleGetAsistencia(e) {
  const convocatoriaId = e.parameter.convocatoria_id;
  const profesorId = e.parameter.profesor_id;
  const grupo = e.parameter.grupo;
  const fecha = e.parameter.fecha; // formato: yyyy-MM-dd
  const alumnoId = e.parameter.alumno_id;

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

  return jsonResponse(registros);
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
function computeResumen(convocatoriaId, profesorId, grupo) {
  let alumnos = sheetToObjects(SHEET_NAMES.ALUMNOS)
    .filter(a => a.activo === true && a.convocatoria_id === convocatoriaId);

  if (profesorId) alumnos = alumnos.filter(a => a.profesor_id === profesorId);
  if (grupo) alumnos = alumnos.filter(a => a.grupo === grupo);

  let registros = sheetToObjects(SHEET_NAMES.ASISTENCIA)
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
        registros: []
      };
    }
    const stats = porAlumno[r.alumno_id];
    const fecha = r.fecha;
    const presente = r.presente === true;

    stats.total++;
    if (presente) stats.presentes++;
    stats.registros.push({ fecha: fecha, presente: presente });

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
      registros: []
    };

    // Ordenar registros del alumno por fecha ascendente (mas antiguo primero)
    const regsOrdenados = s.registros.slice().sort(function(x, y) {
      return x.fecha < y.fecha ? -1 : (x.fecha > y.fecha ? 1 : 0);
    });

    // Ultimas 8 clases (mas reciente al final, como histograma)
    const ultimas_8 = regsOrdenados.slice(-8);

    // Racha de faltas: cuantas clases consecutivas mas recientes son falta
    let racha = 0;
    for (let i = regsOrdenados.length - 1; i >= 0; i--) {
      if (regsOrdenados[i].presente === false) racha++;
      else break;
    }

    // Historico semanal: agrupar por semana lun-dom, ultimas 8 semanas
    const porSemana = {};
    regsOrdenados.forEach(function(r) {
      const partes = r.fecha.split('-');
      const dt = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
      const lun = mondayOf_(dt);
      const lunStr = fmt(lun);
      if (!porSemana[lunStr]) {
        porSemana[lunStr] = { semana_inicio: lunStr, clases: 0, faltas: 0 };
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
  const tz = Session.getScriptTimeZone();

  // Filtrar: conservar filas que NO son del mismo grupo/fecha
  const filasConservadas = [];
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
    }
  }

  // Agregar nuevos registros
  const ahora = new Date();
  const filasNuevas = alumnos.map(a => [
    fecha,
    a.alumno_id,
    convocatoria_id,
    profesor_id,
    grupo,
    a.presente === true,
    ahora
  ]);

  const todasLasFilas = filasConservadas.concat(filasNuevas);

  // Reescribir hoja completa (una sola operacion)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 7).clearContent();
  }
  if (todasLasFilas.length > 0) {
    sheet.getRange(2, 1, todasLasFilas.length, 7).setValues(todasLasFilas);
  }

  // Invalidar cache de resumen para esta convocatoria
  cacheInvalidate(['res_' + convocatoria_id]);

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

  // Invalidar cache de alumnos (puede cambiar grupo/profesor)
  cacheInvalidate(['alu_']);

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
    'PROFESORES': ['id', 'nombre', 'email', 'activo'],
    'ALUMNOS': ['id', 'nombre', 'convocatoria_id', 'profesor_id', 'grupo', 'email', 'telefono', 'activo'],
    'ASISTENCIA': ['fecha', 'alumno_id', 'convocatoria_id', 'profesor_id', 'grupo', 'presente', 'hora_registro'],
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
  // Solo aplicar a pocas filas para evitar crear datos fantasma (FALSE)
  // que confunden a getLastRow() y getDataRange()
  const CHECKBOX_ROWS = 50;
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
