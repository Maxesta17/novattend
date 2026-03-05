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
      let hoja = ss.getSheetByName(hojaNombre);

      if (!hoja) {
        hoja = ss.insertSheet(hojaNombre, posicion);
        posicion++;
      }

      hoja.setTabColor(colorHex);

      // Cabecera con columnas de estadisticas
      hoja.getRange('A1:D1').merge();
      hoja.getRange('A1').setValue(prof.nombre + ' - ' + grupo);
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

  // Leer alumnos existentes para mantener IDs
  const alumnosSheet = ss.getSheetByName('ALUMNOS');
  const alumnosData = alumnosSheet.getDataRange().getValues();
  const alumnosExistentes = {}; // { "conv-abr26|prof-samuel|G1|rosa cruz ruiz": "alu-0001" }
  let maxId = 0;

  for (let i = 1; i < alumnosData.length; i++) {
    if (alumnosData[i][0]) {
      const clave = [
        alumnosData[i][2], // convocatoria_id
        alumnosData[i][3], // profesor_id
        alumnosData[i][4], // grupo
        alumnosData[i][1].toString().trim().toLowerCase() // nombre
      ].join('|');
      alumnosExistentes[clave] = alumnosData[i][0].toString();

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

      // Reutilizar ID existente o generar nuevo
      let id = alumnosExistentes[clave];
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
        '',    // email
        '',    // telefono
        true   // activo
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

  return nuevosAlumnos.length;
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
}

// ============================================================
// TRIGGER AUTOMATICO — onEdit
// ============================================================

/**
 * Se dispara automaticamente cuando alguien edita cualquier celda.
 * Si la edicion es en una hoja de grupo (columna A, fila >= 3),
 * sincroniza la hoja ALUMNOS.
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

  // Sincronizar (con pequeno delay para evitar conflictos en ediciones rapidas)
  sincronizarAlumnos();
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
    .addSeparator()
    .addItem('Sincronizar alumnos (manual)', 'sincronizarAlumnos')
    .addItem('Actualizar estadisticas', 'actualizarEstadisticas')
    .addToUi();
}
