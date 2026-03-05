/**
 * Importar alumnos desde las 28 hojas de profesores a la hoja ALUMNOS.
 *
 * Lee hojas con formato "NombreProfesor - G1", "NombreProfesor - G2", etc.
 * Mapea el nombre del profesor a su ID de la hoja PROFESORES.
 * Genera IDs unicos para cada alumno.
 *
 * EJECUTAR UNA SOLA VEZ desde el editor de Apps Script.
 */
function importarAlumnos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();

  // Hojas del sistema que NO son de profesores
  const hojasExcluidas = ['CONVOCATORIAS', 'PROFESORES', 'ALUMNOS', 'ASISTENCIA', 'LOG', 'RESUMEN'];

  // Leer profesores para mapear nombre -> id
  const profSheet = ss.getSheetByName('PROFESORES');
  const profData = profSheet.getDataRange().getValues();
  const profMap = {}; // { "samuel": "prof-samuel", "maria wolf": "prof-maria", ... }
  for (let i = 1; i < profData.length; i++) {
    if (profData[i][0]) {
      profMap[profData[i][1].toString().trim().toLowerCase()] = profData[i][0].toString().trim();
    }
  }

  // Leer convocatoria activa (la primera activa por fecha)
  const convSheet = ss.getSheetByName('CONVOCATORIAS');
  const convData = convSheet.getDataRange().getValues();
  const tz = Session.getScriptTimeZone();
  const hoy = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  let convocatoriaId = null;

  for (let i = 1; i < convData.length; i++) {
    const inicio = convData[i][2] instanceof Date
      ? Utilities.formatDate(convData[i][2], tz, 'yyyy-MM-dd')
      : convData[i][2];
    const fin = convData[i][3] instanceof Date
      ? Utilities.formatDate(convData[i][3], tz, 'yyyy-MM-dd')
      : convData[i][3];
    if (inicio <= hoy && hoy <= fin) {
      convocatoriaId = convData[i][0];
      break;
    }
  }

  if (!convocatoriaId) {
    SpreadsheetApp.getUi().alert('No se encontro ninguna convocatoria activa. Crea una primero.');
    return;
  }

  // Patron: "NombreProfesor - G1", "NombreProfesor - G2", etc.
  const patronHoja = /^(.+)\s*-\s*G(\d+)$/i;

  const alumnos = [];
  let contador = 0;

  allSheets.forEach(sheet => {
    const nombre = sheet.getName();

    // Saltar hojas del sistema
    if (hojasExcluidas.includes(nombre.toUpperCase())) return;

    const match = nombre.match(patronHoja);
    if (!match) return; // No es hoja de profesor

    const nombreProfesor = match[1].trim();
    const grupo = 'G' + match[2];

    // Buscar ID del profesor
    const profesorId = profMap[nombreProfesor.toLowerCase()];
    if (!profesorId) {
      Logger.log('AVISO: No se encontro profesor para hoja "' + nombre + '" (buscando: "' + nombreProfesor + '")');
      return;
    }

    // Leer alumnos de la hoja (nombres en columna A, desde fila 3)
    const data = sheet.getDataRange().getValues();
    for (let i = 2; i < data.length; i++) { // fila 3 = indice 2
      const nombreAlumno = data[i][0] ? data[i][0].toString().trim() : '';
      if (!nombreAlumno) continue;

      contador++;
      const id = 'alu-' + String(contador).padStart(4, '0');

      alumnos.push([
        id,                // id
        nombreAlumno,      // nombre
        convocatoriaId,    // convocatoria_id
        profesorId,        // profesor_id
        grupo,             // grupo
        '',                // email
        '',                // telefono
        true               // activo
      ]);
    }
  });

  if (alumnos.length === 0) {
    SpreadsheetApp.getUi().alert('No se encontraron alumnos en las hojas de profesores.');
    return;
  }

  // Escribir en hoja ALUMNOS (limpiar datos previos, mantener cabecera)
  const alumnosSheet = ss.getSheetByName('ALUMNOS');
  const lastRow = alumnosSheet.getLastRow();
  if (lastRow > 1) {
    alumnosSheet.getRange(2, 1, lastRow - 1, 8).clearContent();
  }

  alumnosSheet.getRange(2, 1, alumnos.length, 8).setValues(alumnos);

  // Aplicar checkbox en columna "activo" (H)
  const rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  alumnosSheet.getRange(2, 8, alumnos.length, 1).setDataValidation(rule);

  // Log
  const logSheet = ss.getSheetByName('LOG');
  if (logSheet) {
    logSheet.appendRow([new Date(), 'SISTEMA', 'IMPORTAR_ALUMNOS', alumnos.length + ' alumnos importados para ' + convocatoriaId]);
  }

  SpreadsheetApp.getUi().alert(
    'Importacion completada!\n\n' +
    'Alumnos importados: ' + alumnos.length + '\n' +
    'Convocatoria: ' + convocatoriaId
  );
}
