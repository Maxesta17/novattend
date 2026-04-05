/**
 * NovAttend - Gestion de Convocatorias y Alumnos
 *
 * Scripts para gestionar convocatorias con hojas separadoras de color,
 * hojas de grupo por profesor, y sincronizacion automatica de alumnos.
 *
 * Aurora solo escribe nombres de alumnos en las hojas de grupo.
 * Todo lo demas (IDs, hoja ALUMNOS) se gestiona automaticamente.
 */

// ============================================================
// CONFIGURACION
// ============================================================

/** Colores disponibles para separadores de convocatoria */
const COLORES_CONVOCATORIA = {
  rojo: '#C62828',
  azul: '#1565C0',
  verde: '#2E7D32',
  naranja: '#E65100',
  morado: '#6A1B9A',
  teal: '#00838F',
  rosa: '#AD1457',
  ambar: '#FF8F00'
};

/** Color de las hojas de grupo (gris claro para distinguirlas del separador) */
const COLOR_HOJA_GRUPO = '#E8E8E8';

// ============================================================
// HELPER — CREAR HOJA DE GRUPO
// ============================================================

/**
 * Crea (o reutiliza) una hoja de grupo con formato estandar.
 * Aplica merge de cabecera, colores, anchos de columna, proteccion y freeze.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - Spreadsheet activo
 * @param {string} hojaNombre - Nombre de la hoja (ej: "ABR26 - Samuel - G1")
 * @param {string} colorHex - Color hex para tab y cabecera
 * @param {string} nombreProfesor - Nombre del profesor
 * @param {string} grupo - Grupo (ej: "G1")
 * @param {number} posicion - Indice donde insertar la hoja
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} La hoja creada o reutilizada
 */
function crearHojaGrupo(ss, hojaNombre, colorHex, nombreProfesor, grupo, posicion) {
  let hoja = ss.getSheetByName(hojaNombre);

  if (!hoja) {
    hoja = ss.insertSheet(hojaNombre, posicion);
  }

  hoja.setTabColor(colorHex);

  // Cabecera con columnas de estadisticas
  hoja.getRange('A1:D1').merge();
  hoja.getRange('A1').setValue(nombreProfesor + ' - ' + grupo);
  hoja.getRange('A1')
    .setFontSize(12).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(colorHex);

  hoja.getRange('A2').setValue('Nombre del Alumno');
  hoja.getRange('B2').setValue('Asistencia %');
  hoja.getRange('C2').setValue('Ultima clase');
  hoja.getRange('D2').setValue('Total clases');
  hoja.getRange('A2:D2')
    .setFontWeight('bold').setBackground('#f3f3f3').setHorizontalAlignment('center');
  hoja.getRange('A2').setHorizontalAlignment('left');

  // Anchos de columna
  hoja.setColumnWidth(1, 280);
  hoja.setColumnWidth(2, 100);
  hoja.setColumnWidth(3, 110);
  hoja.setColumnWidth(4, 100);

  // Proteger columnas B, C, D (solo lectura, se rellenan por script)
  const protCols = hoja.getRange('B3:D1000').protect()
    .setDescription('Datos automaticos - no editar');
  protCols.setWarningOnly(true);

  // Congelar fila de cabecera
  hoja.setFrozenRows(2);

  return hoja;
}

// ============================================================
// CREAR CONVOCATORIA
// ============================================================

/**
 * Crea una convocatoria nueva con su separador de color y 28 hojas de grupo.
 *
 * Ejecutar desde el menu personalizado o manualmente desde el editor.
 * Pide al usuario: nombre, prefijo, color, fecha inicio y fin.
 */
function crearConvocatoria() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // --- Pedir datos al usuario ---
    const nombre = pedirDato(ui, 'Nombre de la convocatoria', 'Ej: abril 2026');
    if (!nombre) return;

    const prefijo = pedirDato(ui, 'Prefijo corto (para nombres de hojas)', 'Ej: ABR26');
    if (!prefijo) return;

    const coloresDisponibles = Object.keys(COLORES_CONVOCATORIA).join(', ');
    const colorNombre = pedirDato(ui, 'Color del separador (' + coloresDisponibles + ')', 'Ej: azul');
    if (!colorNombre) return;
    const colorHex = COLORES_CONVOCATORIA[colorNombre.toLowerCase().trim()] || '#1565C0';

    const fechaInicio = pedirDato(ui, 'Fecha de inicio (dd/mm/yyyy)', 'Ej: 01/04/2026');
    if (!fechaInicio) return;

    const fechaFin = pedirDato(ui, 'Fecha de fin (dd/mm/yyyy)', 'Ej: 30/11/2026');
    if (!fechaFin) return;

    // Convertir fechas a formato ISO para la hoja CONVOCATORIAS
    const partesInicio = fechaInicio.split('/');
    const partesFin = fechaFin.split('/');
    const isoInicio = partesInicio[2] + '-' + partesInicio[1] + '-' + partesInicio[0];
    const isoFin = partesFin[2] + '-' + partesFin[1] + '-' + partesFin[0];

    // Generar ID de convocatoria
    const convId = 'conv-' + prefijo.toLowerCase().replace(/[^a-z0-9]/g, '');

    // --- Leer profesores ---
    const profSheet = ss.getSheetByName('PROFESORES');
    const profData = profSheet.getDataRange().getValues();
    const profesores = [];
    for (let i = 1; i < profData.length; i++) {
      if (profData[i][0] && profData[i][3] === true) {
        profesores.push({ id: profData[i][0], nombre: profData[i][1] });
      }
    }

    if (profesores.length === 0) {
      ui.alert('No hay profesores activos en la hoja PROFESORES.');
      return;
    }

    // --- Registrar en CONVOCATORIAS ---
    const convSheet = ss.getSheetByName('CONVOCATORIAS');
    convSheet.appendRow([convId, nombre, isoInicio, isoFin, true]);

    // --- Crear hoja separadora ---
    const separadorNombre = '[ ' + prefijo.toUpperCase() + ' ]';
    let separador = ss.getSheetByName(separadorNombre);
    if (!separador) {
      separador = ss.insertSheet(separadorNombre);
    }
    separador.setTabColor(colorHex);

    // Contenido del separador
    separador.getRange('A1').setValue(nombre.toUpperCase());
    separador.getRange('A2').setValue('Convocatoria: ' + convId);
    separador.getRange('A3').setValue('Periodo: ' + fechaInicio + ' - ' + fechaFin);
    separador.getRange('A4').setValue('Profesores: ' + profesores.length);
    separador.getRange('A5').setValue('Grupos: G1, G2, G3, G4');
    separador.getRange('A1:A1')
      .setFontSize(16).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(colorHex);
    separador.getRange('A2:A5')
      .setFontSize(11).setFontColor('#333333');
    separador.setColumnWidth(1, 400);

    // Proteger separador (solo info, no editable por Aurora)
    const proteccion = separador.protect().setDescription('Separador de convocatoria');
    proteccion.setWarningOnly(true);

    // --- Crear 28 hojas de grupo ---
    const grupos = ['G1', 'G2', 'G3', 'G4'];
    let posicion = ss.getSheetByName(separadorNombre).getIndex();

    profesores.forEach(prof => {
      grupos.forEach(grupo => {
        const hojaNombre = prefijo.toUpperCase() + ' - ' + prof.nombre + ' - ' + grupo;
        crearHojaGrupo(ss, hojaNombre, colorHex, prof.nombre, grupo, posicion);
        posicion++;
      });
    });

    // --- Log ---
    const logSheet = ss.getSheetByName('LOG');
    if (logSheet) {
      logSheet.appendRow([
        new Date(), 'SISTEMA', 'CREAR_CONVOCATORIA',
        convId + ' | ' + nombre + ' | ' + profesores.length + ' profesores | ' + (profesores.length * 4) + ' hojas'
      ]);
    }

    ui.alert(
      'Convocatoria creada!\n\n' +
      'ID: ' + convId + '\n' +
      'Nombre: ' + nombre + '\n' +
      'Hojas creadas: ' + (profesores.length * 4) + '\n' +
      'Color: ' + colorNombre + '\n\n' +
      'Aurora ya puede rellenar nombres de alumnos en las hojas de grupo.'
    );
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
}

/** Helper para pedir datos con dialogo */
function pedirDato(ui, titulo, placeholder) {
  const resp = ui.prompt(titulo, placeholder, ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return null;
  const valor = resp.getResponseText().trim();
  if (!valor) {
    ui.alert('El campo "' + titulo + '" no puede estar vacio.');
    return null;
  }
  return valor;
}

// ============================================================
// HELPERS DE SELECCION
// ============================================================

/**
 * Muestra una lista numerada y pide al usuario que elija por numero.
 * @param {GoogleAppsScript.Base.Ui} ui
 * @param {string} titulo
 * @param {string[]} opciones
 * @returns {{ index: number, valor: string } | null}
 */
function elegirDeLista(ui, titulo, opciones) {
  if (opciones.length === 0) {
    ui.alert('No hay opciones disponibles para "' + titulo + '".');
    return null;
  }

  const lista = opciones.map(function(op, i) { return (i + 1) + '. ' + op; }).join('\n');
  const resp = ui.prompt(titulo, lista + '\n\nEscribe el numero:', ui.ButtonSet.OK_CANCEL);

  if (resp.getSelectedButton() !== ui.Button.OK) return null;

  const num = parseInt(resp.getResponseText().trim(), 10);
  if (isNaN(num) || num < 1 || num > opciones.length) {
    ui.alert('Numero invalido. Debe ser entre 1 y ' + opciones.length + '.');
    return null;
  }

  return { index: num - 1, valor: opciones[num - 1] };
}

/**
 * Normaliza un texto para usarlo como parte de un ID.
 * Quita acentos, espacios y caracteres especiales.
 */
function normalizarParaId(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

// ============================================================
// SINCRONIZAR ALUMNOS (manual o automatico)
// ============================================================

/**
 * Lee TODAS las hojas de grupo de TODAS las convocatorias y sincroniza
 * la hoja ALUMNOS completa. Genera IDs para alumnos nuevos y mantiene
 * los existentes.
 *
 * Se puede ejecutar manualmente o se dispara automaticamente via onEdit.
 */
function sincronizarAlumnos() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Hojas del sistema
    const hojasExcluidas = ['CONVOCATORIAS', 'PROFESORES', 'ALUMNOS', 'ASISTENCIA', 'LOG', 'RESUMEN'];

    // Leer profesores: nombre -> id
    const profSheet = ss.getSheetByName('PROFESORES');
    const profData = profSheet.getDataRange().getValues();
    const profMap = {};
    for (let i = 1; i < profData.length; i++) {
      if (profData[i][0]) {
        profMap[profData[i][1].toString().trim().toLowerCase()] = profData[i][0].toString().trim();
      }
    }

    // Leer convocatorias: prefijo -> convocatoria_id
    // El prefijo se extrae del nombre de hoja: "ABR26 - Samuel - G1" -> "ABR26"
    const convSheet = ss.getSheetByName('CONVOCATORIAS');
    const convData = convSheet.getDataRange().getValues();
    const convMap = {}; // { "abr26": "conv-abr26", ... }
    for (let i = 1; i < convData.length; i++) {
      if (convData[i][0]) {
        // Extraer prefijo del ID: "conv-abr26" -> "abr26"
        const prefijo = convData[i][0].toString().replace('conv-', '').toLowerCase();
        convMap[prefijo] = convData[i][0].toString();
      }
    }

    // Leer alumnos existentes para mantener IDs y datos
    const alumnosSheet = ss.getSheetByName('ALUMNOS');
    const alumnosData = alumnosSheet.getDataRange().getValues();
    const alumnosExistentes = {}; // { clave_exacta: { id, email, telefono, activo } }
    const alumnosPorConv = {};   // { "conv|nombre": { id, email, telefono, activo } } — fallback para alumnos movidos
    let maxId = 0;

    for (let i = 1; i < alumnosData.length; i++) {
      if (alumnosData[i][0]) {
        const nombreLower = alumnosData[i][1].toString().trim().toLowerCase();
        const datos = {
          id: alumnosData[i][0].toString(),
          email: alumnosData[i][5] || '',
          telefono: alumnosData[i][6] || '',
          activo: alumnosData[i][7] === false ? false : true
        };

        const clave = [
          alumnosData[i][2], alumnosData[i][3], alumnosData[i][4], nombreLower
        ].join('|');
        alumnosExistentes[clave] = datos;

        // Fallback: buscar por convocatoria + nombre (sin profesor/grupo)
        const claveConv = alumnosData[i][2] + '|' + nombreLower;
        alumnosPorConv[claveConv] = datos;

        // Rastrear ID mas alto
        const numPart = parseInt(alumnosData[i][0].toString().replace('alu-', ''), 10);
        if (numPart > maxId) maxId = numPart;
      }
    }

    // Patron de hoja de grupo: "PREFIJO - Profesor - GX"
    const patronHoja = /^([A-Z0-9]+)\s*-\s*(.+)\s*-\s*(G\d+)$/i;
    const allSheets = ss.getSheets();
    const nuevosAlumnos = [];

    allSheets.forEach(sheet => {
      const nombre = sheet.getName();

      // Saltar hojas del sistema y separadores
      if (hojasExcluidas.includes(nombre.toUpperCase())) return;
      if (nombre.startsWith('[') && nombre.endsWith(']')) return;

      const match = nombre.match(patronHoja);
      if (!match) return;

      const prefijo = match[1].trim().toLowerCase();
      const nombreProfesor = match[2].trim();
      const grupo = match[3].toUpperCase();

      // Buscar convocatoria_id
      const convocatoriaId = convMap[prefijo];
      if (!convocatoriaId) return;

      // Buscar profesor_id
      const profesorId = profMap[nombreProfesor.toLowerCase()];
      if (!profesorId) {
        Logger.log('AVISO: Profesor no encontrado: "' + nombreProfesor + '" en hoja "' + nombre + '"');
        return;
      }

      // Leer nombres de alumnos (columna A, desde fila 3)
      const data = sheet.getDataRange().getValues();
      for (let i = 2; i < data.length; i++) {
        const nombreAlumno = data[i][0] ? data[i][0].toString().trim() : '';
        if (!nombreAlumno) continue;

        const clave = [convocatoriaId, profesorId, grupo, nombreAlumno.toLowerCase()].join('|');

        // Buscar: primero exacto (mismo prof+grupo), luego por convocatoria (alumno movido)
        const existente = alumnosExistentes[clave]
          || alumnosPorConv[convocatoriaId + '|' + nombreAlumno.toLowerCase()]
          || null;

        let id = existente ? existente.id : null;
        if (!id) {
          maxId++;
          id = 'alu-' + String(maxId).padStart(4, '0');
        }

        nuevosAlumnos.push([
          id,
          nombreAlumno,
          convocatoriaId,
          profesorId,
          grupo,
          existente ? existente.email : '',
          existente ? existente.telefono : '',
          existente ? existente.activo : true
        ]);
      }
    });

    // Escribir en ALUMNOS (reemplazar todo excepto cabecera)
    const lastRow = alumnosSheet.getLastRow();
    if (lastRow > 1) {
      alumnosSheet.getRange(2, 1, lastRow - 1, 8).clearContent();
      alumnosSheet.getRange(2, 1, lastRow - 1, 8).clearDataValidations();
    }

    if (nuevosAlumnos.length > 0) {
      alumnosSheet.getRange(2, 1, nuevosAlumnos.length, 8).setValues(nuevosAlumnos);

      // Checkbox en columna activo
      const rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
      alumnosSheet.getRange(2, 8, nuevosAlumnos.length, 1).setDataValidation(rule);
    }

    ui.alert('Sincronizacion completada: ' + nuevosAlumnos.length + ' alumnos.');
    return nuevosAlumnos.length;
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
}

// ============================================================
// ACTUALIZAR ESTADISTICAS EN HOJAS DE GRUPO
// ============================================================

/**
 * Recorre todas las hojas de grupo y actualiza las columnas B, C, D
 * con datos calculados desde la hoja ASISTENCIA.
 *
 * B = Asistencia % | C = Ultima clase | D = Total clases
 *
 * Se puede ejecutar manualmente desde el menu o automaticamente.
 */
function actualizarEstadisticas() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Leer toda la hoja ASISTENCIA de una vez (rendimiento)
    const asistSheet = ss.getSheetByName('ASISTENCIA');
    const asistData = asistSheet.getDataRange().getValues();
    // Cabeceras: fecha, alumno_id, convocatoria_id, profesor_id, grupo, presente, hora_registro

    // Leer ALUMNOS para mapear nombre -> alumno_id
    const alumnosSheet = ss.getSheetByName('ALUMNOS');
    const alumnosData = alumnosSheet.getDataRange().getValues();
    // Clave: "convocatoria_id|profesor_id|grupo|nombre_lower" -> alumno_id
    const nombreToId = {};
    for (let i = 1; i < alumnosData.length; i++) {
      if (alumnosData[i][0]) {
        const clave = [
          alumnosData[i][2], // convocatoria_id
          alumnosData[i][3], // profesor_id
          alumnosData[i][4], // grupo
          alumnosData[i][1].toString().trim().toLowerCase()
        ].join('|');
        nombreToId[clave] = alumnosData[i][0].toString();
      }
    }

    // Indexar asistencia por alumno_id: { "alu-0001": { total: 5, presentes: 3, ultimaFecha: "2026-03-05" } }
    const stats = {};
    const tz = Session.getScriptTimeZone();
    for (let i = 1; i < asistData.length; i++) {
      const alumnoId = asistData[i][1] ? asistData[i][1].toString() : '';
      if (!alumnoId) continue;

      if (!stats[alumnoId]) {
        stats[alumnoId] = { total: 0, presentes: 0, ultimaFecha: '' };
      }

      stats[alumnoId].total++;
      if (asistData[i][5] === true) stats[alumnoId].presentes++;

      // Fecha de la clase
      let fecha = asistData[i][0];
      if (fecha instanceof Date) {
        fecha = Utilities.formatDate(fecha, tz, 'yyyy-MM-dd');
      }
      if (fecha && fecha > stats[alumnoId].ultimaFecha) {
        stats[alumnoId].ultimaFecha = fecha;
      }
    }

    // Leer convocatorias: prefijo -> convocatoria_id
    const convSheet = ss.getSheetByName('CONVOCATORIAS');
    const convData = convSheet.getDataRange().getValues();
    const convMap = {};
    for (let i = 1; i < convData.length; i++) {
      if (convData[i][0]) {
        const prefijo = convData[i][0].toString().replace('conv-', '').toLowerCase();
        convMap[prefijo] = convData[i][0].toString();
      }
    }

    // Leer profesores: nombre -> id
    const profSheet = ss.getSheetByName('PROFESORES');
    const profData = profSheet.getDataRange().getValues();
    const profMap = {};
    for (let i = 1; i < profData.length; i++) {
      if (profData[i][0]) {
        profMap[profData[i][1].toString().trim().toLowerCase()] = profData[i][0].toString().trim();
      }
    }

    // Recorrer hojas de grupo
    const patronHoja = /^([A-Z0-9]+)\s*-\s*(.+)\s*-\s*(G\d+)$/i;
    const allSheets = ss.getSheets();

    allSheets.forEach(sheet => {
      const nombre = sheet.getName();
      const match = nombre.match(patronHoja);
      if (!match) return;

      const prefijo = match[1].trim().toLowerCase();
      const nombreProfesor = match[2].trim();
      const grupo = match[3].toUpperCase();

      const convocatoriaId = convMap[prefijo];
      const profesorId = profMap[nombreProfesor.toLowerCase()];
      if (!convocatoriaId || !profesorId) return;

      // Leer nombres de la hoja
      const data = sheet.getDataRange().getValues();
      if (data.length < 3) return; // Sin alumnos

      const filasB = []; // Asistencia %
      const filasC = []; // Ultima clase
      const filasD = []; // Total clases

      for (let i = 2; i < data.length; i++) {
        const nombreAlumno = data[i][0] ? data[i][0].toString().trim() : '';
        if (!nombreAlumno) {
          filasB.push(['']);
          filasC.push(['']);
          filasD.push(['']);
          continue;
        }

        const clave = [convocatoriaId, profesorId, grupo, nombreAlumno.toLowerCase()].join('|');
        const alumnoId = nombreToId[clave];
        const s = alumnoId ? stats[alumnoId] : null;

        if (s && s.total > 0) {
          const pct = Math.round((s.presentes / s.total) * 100);
          // Formatear ultima fecha: yyyy-MM-dd -> dd/MM
          let ultimaCorta = '';
          if (s.ultimaFecha) {
            const partes = s.ultimaFecha.split('-');
            ultimaCorta = partes[2] + '/' + partes[1];
          }
          filasB.push([pct + '%']);
          filasC.push([ultimaCorta]);
          filasD.push([s.total]);
        } else {
          filasB.push(['0%']);
          filasC.push(['']);
          filasD.push([0]);
        }
      }

      // Escribir columnas B, C, D de una vez
      const numFilas = filasB.length;
      if (numFilas > 0) {
        sheet.getRange(3, 2, numFilas, 1).setValues(filasB);
        sheet.getRange(3, 3, numFilas, 1).setValues(filasC);
        sheet.getRange(3, 4, numFilas, 1).setValues(filasD);

        // Centrar columnas B, C, D
        sheet.getRange(3, 2, numFilas, 3).setHorizontalAlignment('center');
      }
    });

    ui.alert('Estadisticas actualizadas.');
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
}

// ============================================================
// ACTUALIZAR ESTADISTICAS — UN SOLO GRUPO
// ============================================================

/**
 * Actualiza columnas B, C, D de UNA sola hoja de grupo.
 * Se llama automaticamente desde handleGuardarAsistencia en Code.gs.
 *
 * @param {string} convocatoriaId - Ej: "conv-mar26"
 * @param {string} profesorId - Ej: "prof-samuel"
 * @param {string} grupo - Ej: "G1"
 */
function actualizarEstadisticasGrupo(convocatoriaId, profesorId, grupo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Obtener prefijo de la convocatoria: "conv-mar26" -> "mar26" -> "MAR26"
  const prefijo = convocatoriaId.replace('conv-', '').toUpperCase();

  // Obtener nombre del profesor
  const profSheet = ss.getSheetByName('PROFESORES');
  const profData = profSheet.getDataRange().getValues();
  let nombreProfesor = '';
  for (let i = 1; i < profData.length; i++) {
    if (profData[i][0] && profData[i][0].toString().trim() === profesorId) {
      nombreProfesor = profData[i][1].toString().trim();
      break;
    }
  }

  if (!nombreProfesor) {
    Logger.log('actualizarEstadisticasGrupo: profesor no encontrado: ' + profesorId);
    return;
  }

  // Construir nombre de hoja: "MAR26 - Samuel - G1"
  const hojaNombre = prefijo + ' - ' + nombreProfesor + ' - ' + grupo;
  const sheet = ss.getSheetByName(hojaNombre);
  if (!sheet) {
    Logger.log('actualizarEstadisticasGrupo: hoja no encontrada: ' + hojaNombre);
    return;
  }

  // Leer alumnos de la hoja ALUMNOS para mapear nombre -> alumno_id
  const alumnosSheet = ss.getSheetByName('ALUMNOS');
  const alumnosData = alumnosSheet.getDataRange().getValues();
  const nombreToId = {};
  for (let i = 1; i < alumnosData.length; i++) {
    if (alumnosData[i][0] &&
        alumnosData[i][2] === convocatoriaId &&
        alumnosData[i][3] === profesorId &&
        alumnosData[i][4] === grupo) {
      nombreToId[alumnosData[i][1].toString().trim().toLowerCase()] = alumnosData[i][0].toString();
    }
  }

  // Leer asistencia filtrada para este grupo
  const asistSheet = ss.getSheetByName('ASISTENCIA');
  const asistData = asistSheet.getDataRange().getValues();
  const tz = Session.getScriptTimeZone();
  const stats = {};

  for (let i = 1; i < asistData.length; i++) {
    if (asistData[i][2] !== convocatoriaId ||
        asistData[i][3] !== profesorId ||
        asistData[i][4] !== grupo) continue;

    const alumnoId = asistData[i][1] ? asistData[i][1].toString() : '';
    if (!alumnoId) continue;

    if (!stats[alumnoId]) {
      stats[alumnoId] = { total: 0, presentes: 0, ultimaFecha: '' };
    }

    stats[alumnoId].total++;
    if (asistData[i][5] === true) stats[alumnoId].presentes++;

    let fecha = asistData[i][0];
    if (fecha instanceof Date) {
      fecha = Utilities.formatDate(fecha, tz, 'yyyy-MM-dd');
    }
    if (fecha && fecha > stats[alumnoId].ultimaFecha) {
      stats[alumnoId].ultimaFecha = fecha;
    }
  }

  // Leer nombres de la hoja de grupo y calcular columnas B/C/D
  const data = sheet.getDataRange().getValues();
  if (data.length < 3) return;

  const filasB = [];
  const filasC = [];
  const filasD = [];

  for (let i = 2; i < data.length; i++) {
    const nombreAlumno = data[i][0] ? data[i][0].toString().trim() : '';
    if (!nombreAlumno) {
      filasB.push(['']);
      filasC.push(['']);
      filasD.push(['']);
      continue;
    }

    const alumnoId = nombreToId[nombreAlumno.toLowerCase()];
    const s = alumnoId ? stats[alumnoId] : null;

    if (s && s.total > 0) {
      const pct = Math.round((s.presentes / s.total) * 100);
      let ultimaCorta = '';
      if (s.ultimaFecha) {
        const partes = s.ultimaFecha.split('-');
        ultimaCorta = partes[2] + '/' + partes[1];
      }
      filasB.push([pct + '%']);
      filasC.push([ultimaCorta]);
      filasD.push([s.total]);
    } else {
      filasB.push(['0%']);
      filasC.push(['']);
      filasD.push([0]);
    }
  }

  // Escribir columnas B, C, D
  const numFilas = filasB.length;
  if (numFilas > 0) {
    sheet.getRange(3, 2, numFilas, 1).setValues(filasB);
    sheet.getRange(3, 3, numFilas, 1).setValues(filasC);
    sheet.getRange(3, 4, numFilas, 1).setValues(filasD);
    sheet.getRange(3, 2, numFilas, 3).setHorizontalAlignment('center');
  }
}

// ============================================================
// CERRAR / REABRIR CONVOCATORIA
// ============================================================

/**
 * Cierra una convocatoria activa (marca activa=false).
 * Aurora puede cerrar antes de la fecha fin.
 */
function cerrarConvocatoria() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('CONVOCATORIAS');
    const data = sheet.getDataRange().getValues();

    const opciones = [];
    const filas = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][4] === true) {
        opciones.push(data[i][0] + ' — ' + data[i][1]);
        filas.push(i + 1);
      }
    }

    const elegida = elegirDeLista(ui, 'Cerrar convocatoria', opciones);
    if (!elegida) return;

    sheet.getRange(filas[elegida.index], 5).setValue(false);

    const convId = data[filas[elegida.index] - 1][0];
    const logSheet = ss.getSheetByName('LOG');
    if (logSheet) {
      logSheet.appendRow([new Date(), 'AURORA', 'CERRAR_CONVOCATORIA', convId]);
    }

    ui.alert('Convocatoria cerrada: ' + convId);
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
}

/**
 * Reabre una convocatoria cerrada (marca activa=true).
 */
function reabrirConvocatoria() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('CONVOCATORIAS');
    const data = sheet.getDataRange().getValues();

    const opciones = [];
    const filas = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][4] !== true && data[i][0]) {
        opciones.push(data[i][0] + ' — ' + data[i][1]);
        filas.push(i + 1);
      }
    }

    const elegida = elegirDeLista(ui, 'Reabrir convocatoria', opciones);
    if (!elegida) return;

    sheet.getRange(filas[elegida.index], 5).setValue(true);

    const convId = data[filas[elegida.index] - 1][0];
    const logSheet = ss.getSheetByName('LOG');
    if (logSheet) {
      logSheet.appendRow([new Date(), 'AURORA', 'REABRIR_CONVOCATORIA', convId]);
    }

    ui.alert('Convocatoria reabierta: ' + convId);
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
}

// ============================================================
// GESTION DE PROFESORES
// ============================================================

/**
 * Agrega un profesor nuevo a la hoja PROFESORES.
 * Genera ID automatico: prof-{nombre normalizado}.
 */
function agregarProfesor() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const nombre = pedirDato(ui, 'Nombre del profesor', 'Ej: Maria Lopez');
    if (!nombre) return;

    const email = pedirDato(ui, 'Email del profesor', 'Ej: maria@escuela.com');
    if (!email) return;

    const profId = 'prof-' + normalizarParaId(nombre);

    // Verificar que no exista
    const sheet = ss.getSheetByName('PROFESORES');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === profId) {
        ui.alert('Ya existe un profesor con ID: ' + profId);
        return;
      }
    }

    sheet.appendRow([profId, nombre, email, true]);

    // Checkbox en la celda de activo
    const lastRow = sheet.getLastRow();
    const rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet.getRange(lastRow, 4).setDataValidation(rule);

    const logSheet = ss.getSheetByName('LOG');
    if (logSheet) {
      logSheet.appendRow([new Date(), 'AURORA', 'AGREGAR_PROFESOR', profId + ' | ' + nombre]);
    }

    ui.alert('Profesor agregado:\n\nID: ' + profId + '\nNombre: ' + nombre + '\nEmail: ' + email);
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
}

/**
 * Desactiva un profesor (marca activo=false).
 * Avisa si tiene convocatorias activas.
 */
function desactivarProfesor() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('PROFESORES');
    const data = sheet.getDataRange().getValues();

    const opciones = [];
    const filas = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][3] === true && data[i][0]) {
        opciones.push(data[i][0] + ' — ' + data[i][1]);
        filas.push(i + 1);
      }
    }

    const elegida = elegirDeLista(ui, 'Desactivar profesor', opciones);
    if (!elegida) return;

    const profId = data[filas[elegida.index] - 1][0];
    const profNombre = data[filas[elegida.index] - 1][1];

    // Verificar si tiene hojas en convocatorias activas
    const convSheet = ss.getSheetByName('CONVOCATORIAS');
    const convData = convSheet.getDataRange().getValues();
    const convsActivas = [];
    for (let i = 1; i < convData.length; i++) {
      if (convData[i][4] === true) {
        const prefijo = convData[i][0].toString().replace('conv-', '').toUpperCase();
        const hojaTest = prefijo + ' - ' + profNombre + ' - G1';
        if (ss.getSheetByName(hojaTest)) {
          convsActivas.push(convData[i][1]);
        }
      }
    }

    if (convsActivas.length > 0) {
      const confirmar = ui.alert(
        'Atencion',
        profNombre + ' tiene hojas en convocatorias activas:\n' +
        convsActivas.join(', ') + '\n\n' +
        'Sus hojas de grupo seguiran existiendo pero no aparecera en nuevas convocatorias.\n' +
        '¿Continuar?',
        ui.ButtonSet.OK_CANCEL
      );
      if (confirmar !== ui.Button.OK) return;
    }

    sheet.getRange(filas[elegida.index], 4).setValue(false);

    const logSheet = ss.getSheetByName('LOG');
    if (logSheet) {
      logSheet.appendRow([new Date(), 'AURORA', 'DESACTIVAR_PROFESOR', profId + ' | ' + profNombre]);
    }

    ui.alert('Profesor desactivado: ' + profNombre);
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
}

/**
 * Reactiva un profesor desactivado (marca activo=true).
 * Simetrica a desactivarProfesor.
 */
function reactivarProfesor() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('PROFESORES');
    const data = sheet.getDataRange().getValues();

    const opciones = [];
    const filas = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][3] !== true && data[i][0]) {
        opciones.push(data[i][0] + ' — ' + data[i][1]);
        filas.push(i + 1);
      }
    }

    const elegida = elegirDeLista(ui, 'Reactivar profesor', opciones);
    if (!elegida) return;

    const profId = data[filas[elegida.index] - 1][0];
    const profNombre = data[filas[elegida.index] - 1][1];

    sheet.getRange(filas[elegida.index], 4).setValue(true);

    const logSheet = ss.getSheetByName('LOG');
    if (logSheet) {
      logSheet.appendRow([new Date(), 'AURORA', 'REACTIVAR_PROFESOR', profId + ' | ' + profNombre]);
    }

    ui.alert('Profesor reactivado: ' + profNombre);
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
}

// ============================================================
// PROFESORES EN CONVOCATORIAS
// ============================================================

/**
 * Agrega un profesor a una convocatoria existente.
 * Crea 4 hojas de grupo (G1-G4) para ese profesor.
 */
function agregarProfesorAConvocatoria() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Elegir convocatoria activa
    const convSheet = ss.getSheetByName('CONVOCATORIAS');
    const convData = convSheet.getDataRange().getValues();
    const convsOpciones = [];
    const convsInfo = [];
    for (let i = 1; i < convData.length; i++) {
      if (convData[i][4] === true) {
        convsOpciones.push(convData[i][0] + ' — ' + convData[i][1]);
        convsInfo.push({ id: convData[i][0], nombre: convData[i][1] });
      }
    }

    const convElegida = elegirDeLista(ui, 'Agregar profesor a convocatoria', convsOpciones);
    if (!convElegida) return;

    const conv = convsInfo[convElegida.index];
    const prefijo = conv.id.replace('conv-', '').toUpperCase();

    // 2. Detectar profesores ya en esta convocatoria (via hojas G1 no archivadas)
    const profYaEnConv = {};
    const patronConv = new RegExp(
      '^' + prefijo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*-\\s*(.+)\\s*-\\s*G1$', 'i'
    );
    ss.getSheets().forEach(function(sheet) {
      const nombre = sheet.getName();
      if (nombre.startsWith('[')) return;
      const match = nombre.match(patronConv);
      if (match) {
        profYaEnConv[match[1].trim().toLowerCase()] = true;
      }
    });

    // 3. Listar profesores activos que NO estan en esta convocatoria
    const profSheet = ss.getSheetByName('PROFESORES');
    const profData = profSheet.getDataRange().getValues();
    const profsOpciones = [];
    const profsInfo = [];
    for (let i = 1; i < profData.length; i++) {
      if (profData[i][3] === true && profData[i][0]) {
        const nombreLower = profData[i][1].toString().trim().toLowerCase();
        if (!profYaEnConv[nombreLower]) {
          profsOpciones.push(profData[i][1]);
          profsInfo.push({ id: profData[i][0], nombre: profData[i][1] });
        }
      }
    }

    const profElegido = elegirDeLista(ui, 'Profesor a agregar a ' + conv.nombre, profsOpciones);
    if (!profElegido) return;

    const prof = profsInfo[profElegido.index];

    // 4. Crear 4 hojas de grupo con helper
    const separadorNombre = '[ ' + prefijo + ' ]';
    const separador = ss.getSheetByName(separadorNombre);
    const colorHex = (separador && separador.getTabColor()) || '#1565C0';

    const grupos = ['G1', 'G2', 'G3', 'G4'];

    // Insertar despues de la ultima hoja de esta convocatoria
    let posicion = separador ? separador.getIndex() : ss.getNumSheets();
    ss.getSheets().forEach(function(s) {
      const n = s.getName();
      if (n.startsWith(prefijo) && !n.startsWith('[')) {
        const idx = s.getIndex();
        if (idx > posicion) posicion = idx;
      }
    });

    grupos.forEach(function(grupo) {
      const hojaNombre = prefijo + ' - ' + prof.nombre + ' - ' + grupo;
      crearHojaGrupo(ss, hojaNombre, colorHex, prof.nombre, grupo, posicion);
      posicion++;
    });

    const logSheet = ss.getSheetByName('LOG');
    if (logSheet) {
      logSheet.appendRow([
        new Date(), 'AURORA', 'AGREGAR_PROF_CONV',
        prof.id + ' | ' + prof.nombre + ' → ' + conv.id + ' | 4 hojas creadas'
      ]);
    }

    ui.alert(
      'Profesor agregado a convocatoria!\n\n' +
      'Profesor: ' + prof.nombre + '\n' +
      'Convocatoria: ' + conv.nombre + '\n' +
      'Hojas creadas: 4 (G1-G4)\n\n' +
      'Aurora ya puede rellenar nombres de alumnos.'
    );
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
}

/**
 * Quita un profesor de una convocatoria.
 * Archiva sus 4 hojas de grupo y desactiva sus alumnos (batch).
 */
function quitarProfesorDeConvocatoria() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Elegir convocatoria (todas, no solo activas)
    const convSheet = ss.getSheetByName('CONVOCATORIAS');
    const convData = convSheet.getDataRange().getValues();
    const convsOpciones = [];
    const convsInfo = [];
    for (let i = 1; i < convData.length; i++) {
      if (convData[i][0]) {
        convsOpciones.push(convData[i][0] + ' — ' + convData[i][1]);
        convsInfo.push({ id: convData[i][0], nombre: convData[i][1] });
      }
    }

    const convElegida = elegirDeLista(ui, 'Quitar profesor de convocatoria', convsOpciones);
    if (!convElegida) return;

    const conv = convsInfo[convElegida.index];
    const prefijo = conv.id.replace('conv-', '').toUpperCase();

    // 2. Detectar profesores en esta convocatoria (via hojas G1 no archivadas)
    const patronConv = new RegExp(
      '^' + prefijo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*-\\s*(.+)\\s*-\\s*G1$', 'i'
    );
    const profsEnConv = [];
    ss.getSheets().forEach(function(sheet) {
      const nombre = sheet.getName();
      if (nombre.startsWith('[')) return;
      const match = nombre.match(patronConv);
      if (match) {
        profsEnConv.push(match[1].trim());
      }
    });

    const profElegido = elegirDeLista(ui, 'Profesor a quitar de ' + conv.nombre, profsEnConv);
    if (!profElegido) return;

    const profNombre = profElegido.valor;

    // Confirmar
    const confirmar = ui.alert(
      'Confirmar',
      '¿Archivar las 4 hojas de ' + profNombre + ' en ' + conv.nombre + '?\n\n' +
      'Las hojas se renombraran con [ARCHIVADO] y los alumnos se desactivaran.',
      ui.ButtonSet.OK_CANCEL
    );
    if (confirmar !== ui.Button.OK) return;

    // 3. Renombrar hojas con [ARCHIVADO]
    const grupos = ['G1', 'G2', 'G3', 'G4'];
    let hojasArchivadas = 0;
    grupos.forEach(function(grupo) {
      const hojaNombre = prefijo + ' - ' + profNombre + ' - ' + grupo;
      const hoja = ss.getSheetByName(hojaNombre);
      if (hoja) {
        hoja.setName('[ARCHIVADO] ' + hojaNombre);
        hoja.setTabColor('#9E9E9E');
        hojasArchivadas++;
      }
    });

    // 4. Desactivar alumnos en ALUMNOS (batch — una sola escritura)
    const profSheet = ss.getSheetByName('PROFESORES');
    const profData = profSheet.getDataRange().getValues();
    let profesorId = '';
    for (let i = 1; i < profData.length; i++) {
      if (profData[i][1] && profData[i][1].toString().trim().toLowerCase() === profNombre.toLowerCase()) {
        profesorId = profData[i][0].toString().trim();
        break;
      }
    }

    let alumnosDesactivados = 0;
    if (profesorId) {
      const alumnosSheet = ss.getSheetByName('ALUMNOS');
      const alumnosData = alumnosSheet.getDataRange().getValues();
      const colActivo = [];

      for (let i = 1; i < alumnosData.length; i++) {
        let activo = alumnosData[i][7];
        if (alumnosData[i][2] === conv.id &&
            alumnosData[i][3] === profesorId &&
            activo === true) {
          activo = false;
          alumnosDesactivados++;
        }
        colActivo.push([activo]);
      }

      if (colActivo.length > 0) {
        alumnosSheet.getRange(2, 8, colActivo.length, 1).setValues(colActivo);
      }
    }

    const logSheet = ss.getSheetByName('LOG');
    if (logSheet) {
      logSheet.appendRow([
        new Date(), 'AURORA', 'QUITAR_PROF_CONV',
        profNombre + ' | ' + conv.id + ' | ' + hojasArchivadas + ' hojas | ' + alumnosDesactivados + ' alumnos desactivados'
      ]);
    }

    ui.alert(
      'Profesor quitado de convocatoria.\n\n' +
      'Hojas archivadas: ' + hojasArchivadas + '\n' +
      'Alumnos desactivados: ' + alumnosDesactivados
    );
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
}

// ============================================================
// SINCRONIZAR ALUMNOS — UNA SOLA HOJA (optimizado para onEdit)
// ============================================================

/**
 * Sincroniza los alumnos de UNA sola hoja de grupo con ALUMNOS.
 * Solo lee la hoja editada en vez de recorrer todas las hojas.
 * Protegida con LockService para evitar escrituras concurrentes.
 *
 * @param {string} nombreHoja - Nombre de la hoja editada
 */
function sincronizarHoja(nombreHoja) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return; // Se reintentara en el proximo onEdit
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const patronHoja = /^([A-Z0-9]+)\s*-\s*(.+)\s*-\s*(G\d+)$/i;
    const match = nombreHoja.match(patronHoja);
    if (!match) return;

    const prefijo = match[1].trim().toLowerCase();
    const nombreProfesor = match[2].trim();
    const grupo = match[3].toUpperCase();

    // Buscar convocatoria_id
    const convSheet = ss.getSheetByName('CONVOCATORIAS');
    const convData = convSheet.getDataRange().getValues();
    let convocatoriaId = '';
    for (let i = 1; i < convData.length; i++) {
      if (convData[i][0] && convData[i][0].toString().replace('conv-', '').toLowerCase() === prefijo) {
        convocatoriaId = convData[i][0].toString();
        break;
      }
    }
    if (!convocatoriaId) return;

    // Buscar profesor_id
    const profSheet = ss.getSheetByName('PROFESORES');
    const profData = profSheet.getDataRange().getValues();
    let profesorId = '';
    for (let i = 1; i < profData.length; i++) {
      if (profData[i][0] && profData[i][1].toString().trim().toLowerCase() === nombreProfesor.toLowerCase()) {
        profesorId = profData[i][0].toString().trim();
        break;
      }
    }
    if (!profesorId) return;

    // Leer ALUMNOS y separar: este grupo vs otros
    const alumnosSheet = ss.getSheetByName('ALUMNOS');
    const alumnosData = alumnosSheet.getDataRange().getValues();
    const otrosAlumnos = [];
    const alumnosDeEsteGrupo = {}; // { nombre_lower: { id, email, telefono, activo } }
    const alumnosPorConv = {};    // { nombre_lower: { id, email, telefono, activo } } — fallback para movidos
    let maxId = 0;

    for (let i = 1; i < alumnosData.length; i++) {
      if (!alumnosData[i][0]) continue;

      const numPart = parseInt(alumnosData[i][0].toString().replace('alu-', ''), 10);
      if (numPart > maxId) maxId = numPart;

      const nombreLower = alumnosData[i][1].toString().trim().toLowerCase();
      const datos = {
        id: alumnosData[i][0].toString(),
        email: alumnosData[i][5] || '',
        telefono: alumnosData[i][6] || '',
        activo: alumnosData[i][7] === false ? false : true
      };

      const esDeEsteGrupo = alumnosData[i][2] === convocatoriaId &&
                            alumnosData[i][3] === profesorId &&
                            alumnosData[i][4] === grupo;

      if (esDeEsteGrupo) {
        alumnosDeEsteGrupo[nombreLower] = datos;
      } else {
        otrosAlumnos.push(alumnosData[i]);
        // Fallback: si es de la misma convocatoria, registrar para reconocer movidos
        if (alumnosData[i][2] === convocatoriaId) {
          alumnosPorConv[nombreLower] = datos;
        }
      }
    }

    // Leer nombres de la hoja editada (columna A, desde fila 3)
    const sheet = ss.getSheetByName(nombreHoja);
    const data = sheet.getDataRange().getValues();
    const nuevosDeEsteGrupo = [];

    for (let i = 2; i < data.length; i++) {
      const nombre = data[i][0] ? data[i][0].toString().trim() : '';
      if (!nombre) continue;

      // Buscar: primero en este grupo, luego en la convocatoria (alumno movido)
      const existente = alumnosDeEsteGrupo[nombre.toLowerCase()]
        || alumnosPorConv[nombre.toLowerCase()]
        || null;

      let id = existente ? existente.id : null;
      if (!id) {
        maxId++;
        id = 'alu-' + String(maxId).padStart(4, '0');
      }

      nuevosDeEsteGrupo.push([
        id, nombre, convocatoriaId, profesorId, grupo,
        existente ? existente.email : '',
        existente ? existente.telefono : '',
        existente ? existente.activo : true
      ]);
    }

    // Reescribir ALUMNOS: otros + este grupo
    const todasLasFilas = otrosAlumnos.concat(nuevosDeEsteGrupo);
    const lastRow = alumnosSheet.getLastRow();

    if (lastRow > 1) {
      alumnosSheet.getRange(2, 1, lastRow - 1, 8).clearContent();
      alumnosSheet.getRange(2, 1, lastRow - 1, 8).clearDataValidations();
    }

    if (todasLasFilas.length > 0) {
      alumnosSheet.getRange(2, 1, todasLasFilas.length, 8).setValues(todasLasFilas);
      const rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
      alumnosSheet.getRange(2, 8, todasLasFilas.length, 1).setDataValidation(rule);
    }
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// TRANSFERIR HISTORIAL DE ALUMNOS MOVIDOS
// ============================================================

/**
 * Actualiza el historial de asistencia de alumnos que Aurora ha movido
 * manualmente entre hojas de grupo (copiar/pegar nombres).
 *
 * Lee la ubicacion actual de cada alumno en ALUMNOS y corrige los registros
 * de ASISTENCIA que aun apuntan al profesor/grupo anterior.
 */
function transferirHistorial() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Leer ALUMNOS: alumno_id -> { profesor_id, grupo }
    const alumnosSheet = ss.getSheetByName('ALUMNOS');
    const alumnosData = alumnosSheet.getDataRange().getValues();
    const ubicacionActual = {}; // { alumno_id: { profesorId, grupo } }

    for (let i = 1; i < alumnosData.length; i++) {
      if (!alumnosData[i][0]) continue;
      ubicacionActual[alumnosData[i][0].toString()] = {
        profesorId: alumnosData[i][3],
        grupo: alumnosData[i][4]
      };
    }

    // Leer ASISTENCIA y corregir profesor_id/grupo donde no coincida
    const asistSheet = ss.getSheetByName('ASISTENCIA');
    const asistData = asistSheet.getDataRange().getValues();
    let registrosCorregidos = 0;
    let alumnosAfectados = {};

    for (let i = 1; i < asistData.length; i++) {
      const alumnoId = asistData[i][1] ? asistData[i][1].toString() : '';
      if (!alumnoId || !ubicacionActual[alumnoId]) continue;

      const actual = ubicacionActual[alumnoId];
      const profAsist = asistData[i][3];
      const grupoAsist = asistData[i][4];

      if (profAsist !== actual.profesorId || grupoAsist !== actual.grupo) {
        asistData[i][3] = actual.profesorId;
        asistData[i][4] = actual.grupo;
        registrosCorregidos++;
        alumnosAfectados[alumnoId] = true;
      }
    }

    if (registrosCorregidos === 0) {
      ui.alert('No hay historial pendiente de transferir.\n\nTodos los registros de asistencia ya coinciden con la ubicacion actual de los alumnos.');
      return;
    }

    // Escribir ASISTENCIA completa de una vez (batch)
    if (asistData.length > 1) {
      asistSheet.getRange(1, 1, asistData.length, asistData[0].length).setValues(asistData);
    }

    // Recalcular estadisticas de todas las hojas de grupo
    actualizarEstadisticas();

    const numAlumnos = Object.keys(alumnosAfectados).length;

    // Log
    const logSheet = ss.getSheetByName('LOG');
    if (logSheet) {
      logSheet.appendRow([
        new Date(), 'AURORA', 'TRANSFERIR_HISTORIAL',
        registrosCorregidos + ' registros | ' + numAlumnos + ' alumnos'
      ]);
    }

    ui.alert(
      'Historial transferido.\n\n' +
      'Alumnos actualizados: ' + numAlumnos + '\n' +
      'Registros de asistencia corregidos: ' + registrosCorregidos + '\n\n' +
      'Las estadisticas de los grupos ya estan actualizadas.'
    );
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
}

// ============================================================
// TRIGGER AUTOMATICO — onEdit
// ============================================================

/**
 * Se dispara automaticamente cuando alguien edita cualquier celda.
 * Si la edicion es en una hoja de grupo (columna A, fila >= 3),
 * sincroniza solo esa hoja con ALUMNOS (no todas).
 */
function onEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  const nombre = sheet.getName();

  // Solo actuar en hojas de grupo (patron: PREFIJO - Profesor - GX)
  const patronHoja = /^[A-Z0-9]+\s*-\s*.+\s*-\s*G\d+$/i;
  if (!patronHoja.test(nombre)) return;

  // Solo si editan columna A (nombres), fila 3+
  if (e.range.getColumn() !== 1 || e.range.getRow() < 3) return;

  // Sincronizar solo la hoja editada (no todas)
  sincronizarHoja(nombre);
}

// ============================================================
// MENU PERSONALIZADO
// ============================================================

/**
 * Agrega un menu "NovAttend" en la barra de menus del spreadsheet.
 * Se carga automaticamente al abrir el documento.
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('NovAttend')
    .addItem('Crear nueva convocatoria', 'crearConvocatoria')
    .addItem('Cerrar convocatoria', 'cerrarConvocatoria')
    .addItem('Reabrir convocatoria', 'reabrirConvocatoria')
    .addSeparator()
    .addItem('Agregar profesor', 'agregarProfesor')
    .addItem('Desactivar profesor', 'desactivarProfesor')
    .addItem('Reactivar profesor', 'reactivarProfesor')
    .addSeparator()
    .addItem('Agregar profesor a convocatoria', 'agregarProfesorAConvocatoria')
    .addItem('Quitar profesor de convocatoria', 'quitarProfesorDeConvocatoria')
    .addSeparator()
    .addItem('Transferir historial de alumnos movidos', 'transferirHistorial')
    .addItem('Sincronizar alumnos (manual)', 'sincronizarAlumnos')
    .addItem('Actualizar estadisticas', 'actualizarEstadisticas')
    .addToUi();
}
