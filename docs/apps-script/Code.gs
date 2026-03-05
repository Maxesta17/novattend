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
// GET — Lectura de datos
// ============================================================

function doGet(e) {
  try {
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
    return jsonError(err.message, 500);
  }
}

/**
 * Devuelve convocatorias. Por defecto solo las activas por fecha.
 * Una convocatoria esta activa si: fecha_inicio <= hoy <= fecha_fin.
 * Parametro ?todas=true devuelve todas sin filtrar.
 */
function handleGetConvocatorias(e) {
  const todas = sheetToObjects(SHEET_NAMES.CONVOCATORIAS);

  if (e.parameter.todas === 'true') {
    return jsonResponse(todas);
  }

  const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const activas = todas.filter(c => c.fecha_inicio <= hoy && hoy <= c.fecha_fin);

  return jsonResponse(activas);
}

/**
 * Devuelve profesores activos.
 */
function handleGetProfesores(e) {
  const todos = sheetToObjects(SHEET_NAMES.PROFESORES);
  const soloActivos = e.parameter.todos === 'true'
    ? todos
    : todos.filter(p => p.activo === true);

  return jsonResponse(soloActivos);
}

/**
 * Devuelve alumnos filtrados por convocatoria y/o profesor.
 */
function handleGetAlumnos(e) {
  const convocatoriaId = e.parameter.convocatoria_id;
  const profesorId = e.parameter.profesor_id;
  const grupo = e.parameter.grupo;

  let alumnos = sheetToObjects(SHEET_NAMES.ALUMNOS);

  // Solo activos por defecto
  if (e.parameter.todos !== 'true') {
    alumnos = alumnos.filter(a => a.activo === true);
  }

  if (convocatoriaId) {
    alumnos = alumnos.filter(a => a.convocatoria_id === convocatoriaId);
  }
  if (profesorId) {
    alumnos = alumnos.filter(a => a.profesor_id === profesorId);
  }
  if (grupo) {
    alumnos = alumnos.filter(a => a.grupo === grupo);
  }

  return jsonResponse(alumnos);
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
 * Calcula y devuelve resumen de asistencia con porcentajes por periodo.
 * Periodos: semanal (7 dias), quincenal (15 dias), mensual (30 dias).
 */
function handleGetResumen(e) {
  const convocatoriaId = e.parameter.convocatoria_id;
  const profesorId = e.parameter.profesor_id;
  const grupo = e.parameter.grupo;

  if (!convocatoriaId) {
    return jsonError('convocatoria_id es obligatorio para getResumen', 400);
  }

  // Obtener alumnos filtrados
  let alumnos = sheetToObjects(SHEET_NAMES.ALUMNOS)
    .filter(a => a.activo === true && a.convocatoria_id === convocatoriaId);

  if (profesorId) {
    alumnos = alumnos.filter(a => a.profesor_id === profesorId);
  }
  if (grupo) {
    alumnos = alumnos.filter(a => a.grupo === grupo);
  }

  // Obtener registros de asistencia de la convocatoria
  let registros = sheetToObjects(SHEET_NAMES.ASISTENCIA)
    .filter(r => r.convocatoria_id === convocatoriaId);

  if (profesorId) {
    registros = registros.filter(r => r.profesor_id === profesorId);
  }
  if (grupo) {
    registros = registros.filter(r => r.grupo === grupo);
  }

  // Calcular limites de fecha para cada periodo
  const tz = Session.getScriptTimeZone();
  const hoy = new Date();
  const fmt = d => Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  const hoyStr = fmt(hoy);

  const hace7 = new Date(hoy);
  hace7.setDate(hoy.getDate() - 7);
  const hace7Str = fmt(hace7);

  const hace15 = new Date(hoy);
  hace15.setDate(hoy.getDate() - 15);
  const hace15Str = fmt(hace15);

  const hace30 = new Date(hoy);
  hace30.setDate(hoy.getDate() - 30);
  const hace30Str = fmt(hace30);

  // Agrupar registros por alumno_id con desglose por periodo
  const porAlumno = {};
  registros.forEach(r => {
    if (!porAlumno[r.alumno_id]) {
      porAlumno[r.alumno_id] = {
        total: 0, presentes: 0,
        sem_total: 0, sem_presentes: 0,
        quin_total: 0, quin_presentes: 0,
        mens_total: 0, mens_presentes: 0
      };
    }
    const stats = porAlumno[r.alumno_id];
    const fecha = r.fecha;
    const presente = r.presente === true;

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
  });

  // Helper para calcular porcentaje
  const pct = (presentes, total) => total > 0 ? Math.round((presentes / total) * 100) : 0;

  // Construir resumen
  const resumen = alumnos.map(a => {
    const s = porAlumno[a.id] || {
      total: 0, presentes: 0,
      sem_total: 0, sem_presentes: 0,
      quin_total: 0, quin_presentes: 0,
      mens_total: 0, mens_presentes: 0
    };

    return {
      alumno_id: a.id,
      nombre: a.nombre,
      profesor_id: a.profesor_id,
      grupo: a.grupo,
      semanal: pct(s.sem_presentes, s.sem_total),
      quincenal: pct(s.quin_presentes, s.quin_total),
      mensual: pct(s.mens_presentes, s.mens_total),
      clases_total: s.total,
      clases_presentes: s.presentes
    };
  });

  return jsonResponse(resumen);
}

// ============================================================
// POST — Escritura de datos
// ============================================================

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
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

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ASISTENCIA);

  if (!sheet) {
    return jsonError('No se encontro la hoja ASISTENCIA', 500);
  }

  // Eliminar registros previos de la misma fecha/grupo/profesor/convocatoria
  // (permite re-guardar si el profesor corrige)
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const fechaCol = headers.indexOf('fecha');
  const convCol = headers.indexOf('convocatoria_id');
  const profCol = headers.indexOf('profesor_id');
  const grupoCol = headers.indexOf('grupo');

  // Recorrer de abajo a arriba para borrar sin desplazar indices
  for (let i = data.length - 1; i >= 1; i--) {
    const rowFecha = data[i][fechaCol];
    const rowFechaStr = rowFecha instanceof Date
      ? Utilities.formatDate(rowFecha, Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : rowFecha;

    if (rowFechaStr === fecha &&
        data[i][convCol] === convocatoria_id &&
        data[i][profCol] === profesor_id &&
        data[i][grupoCol] === grupo) {
      sheet.deleteRow(i + 1);
    }
  }

  // Insertar nuevos registros
  const ahora = new Date();
  const filas = alumnos.map(a => [
    fecha,
    a.alumno_id,
    convocatoria_id,
    profesor_id,
    grupo,
    a.presente === true,
    ahora
  ]);

  if (filas.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, filas.length, 7).setValues(filas);
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
    registros: filas.length,
    presentes: presentes
  });
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

  writeLog(body.usuario || 'admin', 'CREAR_ALUMNO', nombre + ' | ' + grupo + ' | ' + convocatoria_id);

  return jsonResponse({ id: id, message: 'Alumno creado correctamente' });
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

  writeLog(
    body.usuario || 'admin',
    'ACTUALIZAR_ALUMNO',
    alumno_id + ' | ' + camposActualizados.join(', ')
  );

  return jsonResponse({ message: 'Alumno actualizado', campos: camposActualizados });
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
  const checkboxSheets = ['CONVOCATORIAS', 'PROFESORES', 'ALUMNOS'];
  checkboxSheets.forEach(nombre => {
    const sheet = ss.getSheetByName(nombre);
    const headers = hojas[nombre];
    const activoCol = headers.indexOf('activa') !== -1
      ? headers.indexOf('activa')
      : headers.indexOf('activo');
    if (activoCol !== -1) {
      // Aplicar validacion checkbox a columna (filas 2-1000)
      const rule = SpreadsheetApp.newDataValidation()
        .requireCheckbox()
        .build();
      sheet.getRange(2, activoCol + 1, 999, 1).setDataValidation(rule);
    }
  });

  // Checkbox para 'presente' en ASISTENCIA
  const asistSheet = ss.getSheetByName('ASISTENCIA');
  const presenteCol = hojas['ASISTENCIA'].indexOf('presente');
  if (presenteCol !== -1) {
    const rule = SpreadsheetApp.newDataValidation()
      .requireCheckbox()
      .build();
    asistSheet.getRange(2, presenteCol + 1, 999, 1).setDataValidation(rule);
  }

  writeLog('SISTEMA', 'SETUP', 'Hojas creadas/verificadas correctamente');
  SpreadsheetApp.getUi().alert('Setup completado. Las 5 hojas estan listas.');
}
