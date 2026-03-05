/**
 * NovAttend - Script de Migracion
 *
 * Convierte los datos del Google Sheet viejo (28 hojas por profesor-grupo)
 * al formato nuevo (5 hojas normalizadas).
 *
 * USO:
 * 1. Abre el Google Sheet NUEVO (el que tiene las 5 hojas creadas con setupSheets).
 * 2. Ve a Extensiones > Apps Script.
 * 3. Crea un nuevo archivo: Migracion.gs
 * 4. Pega este codigo.
 * 5. Configura SHEET_VIEJO_ID con el ID del Google Sheet original.
 * 6. Ejecuta la funcion migrarDatos().
 * 7. Una vez completada la migracion, puedes borrar este archivo.
 */

// ============================================================
// CONFIGURACION - CAMBIAR ESTE VALOR
// ============================================================

/**
 * ID del Google Sheet original (el de 28 hojas).
 * Lo encuentras en la URL del Sheet:
 * https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
 */
const SHEET_VIEJO_ID = '1cKrnqRQ-h6vxeVBCfBo9lsNT_4dgEynxIoV1gJQk8KM';

/**
 * ID de la convocatoria a la que pertenecen estos datos.
 * Debe coincidir con un registro en la hoja CONVOCATORIAS.
 */
const CONVOCATORIA_ID = 'conv-2026-02';

// ============================================================
// MAPEO DE PROFESORES
// ============================================================

/**
 * Mapea el nombre del profesor tal como aparece en las hojas del Sheet viejo
 * al id del profesor en el Sheet nuevo.
 */
const PROFESOR_MAP = {
  'Samuel': 'prof-samuel',
  'Maria Wolf': 'prof-maria',
  'Nadine': 'prof-nadine',
  'Marta Battistella': 'prof-marta',
  'Elisabeth Shick': 'prof-elisabeth',
  'Myriam Marcia': 'prof-myriam',
  'Sonja': 'prof-sonja'
};

// ============================================================
// FUNCION PRINCIPAL
// ============================================================

function migrarDatos() {
  const ssViejo = SpreadsheetApp.openById(SHEET_VIEJO_ID);
  const ssNuevo = SpreadsheetApp.getActiveSpreadsheet();

  const hojaAlumnos = ssNuevo.getSheetByName('ALUMNOS');
  const hojaAsistencia = ssNuevo.getSheetByName('ASISTENCIA');

  if (!hojaAlumnos || !hojaAsistencia) {
    SpreadsheetApp.getUi().alert(
      'Error: Primero ejecuta setupSheets() para crear las hojas necesarias.'
    );
    return;
  }

  const hojasViejas = ssViejo.getSheets();
  let totalAlumnos = 0;
  let totalAsistencia = 0;
  const alumnosRows = [];
  const asistenciaRows = [];
  let alumnoCounter = 1;

  // Procesar cada hoja del Sheet viejo (formato: "NombreProfesor - G1")
  hojasViejas.forEach(hoja => {
    const nombre = hoja.getName();

    // Saltar hojas especiales
    if (nombre === 'RESUMEN' || nombre === 'LOG' ||
        nombre === 'CONVOCATORIAS' || nombre === 'PROFESORES' ||
        nombre === 'ALUMNOS' || nombre === 'ASISTENCIA') {
      return;
    }

    // Extraer profesor y grupo del nombre de la hoja
    const match = nombre.match(/^(.+?)\s*-\s*(G\d+)$/);
    if (!match) {
      Logger.log('Hoja ignorada (formato no reconocido): ' + nombre);
      return;
    }

    const nombreProfesor = match[1].trim();
    const grupo = match[2].trim();
    const profesorId = PROFESOR_MAP[nombreProfesor];

    if (!profesorId) {
      Logger.log('Profesor no mapeado: ' + nombreProfesor + ' (hoja: ' + nombre + ')');
      return;
    }

    const data = hoja.getDataRange().getValues();

    // La fila 0 es "Grupo X", fila 1 son cabeceras, datos desde fila 2
    for (let i = 2; i < data.length; i++) {
      const nombreAlumno = data[i][0];

      // Saltar filas vacias
      if (!nombreAlumno || nombreAlumno.toString().trim() === '') continue;

      const alumnoId = 'alu-' + String(alumnoCounter).padStart(3, '0');
      alumnoCounter++;

      // Fila para hoja ALUMNOS
      alumnosRows.push([
        alumnoId,
        nombreAlumno.toString().trim(),
        CONVOCATORIA_ID,
        profesorId,
        grupo,
        '', // email
        '', // telefono
        true // activo
      ]);
      totalAlumnos++;
    }
  });

  // Migrar datos de asistencia desde la hoja RESUMEN del Sheet viejo
  const hojaResumen = ssViejo.getSheetByName('RESUMEN');
  if (hojaResumen) {
    const resumenData = hojaResumen.getDataRange().getValues();
    // Fila 0: mes headers, Fila 1: columna headers con fechas desde columna 4
    const headers = resumenData[1];

    // Crear mapa de nombre+profesor+grupo -> alumno_id
    const alumnoMap = {};
    alumnosRows.forEach(row => {
      const key = row[1] + '|' + row[3] + '|' + row[4]; // nombre|profesor_id|grupo
      alumnoMap[key] = row[0]; // alumno_id
    });

    for (let i = 2; i < resumenData.length; i++) {
      const nombreAlumno = resumenData[i][0];
      if (!nombreAlumno || nombreAlumno.toString().trim() === '') continue;

      const nombreProfesor = resumenData[i][1];
      const grupo = resumenData[i][2];
      const profesorId = PROFESOR_MAP[nombreProfesor];
      if (!profesorId) continue;

      const key = nombreAlumno.toString().trim() + '|' + profesorId + '|' + grupo;
      const alumnoId = alumnoMap[key];
      if (!alumnoId) continue;

      // Recorrer columnas de fecha (desde columna 4 en adelante)
      for (let j = 4; j < headers.length; j++) {
        const fechaVal = headers[j];
        if (!fechaVal) continue;

        const marca = resumenData[i][j];
        if (!marca) continue; // No hay registro para esa fecha

        // Convertir fecha serial de Excel/Sheets a Date
        let fechaStr;
        if (fechaVal instanceof Date) {
          fechaStr = Utilities.formatDate(fechaVal, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        } else if (typeof fechaVal === 'number') {
          const d = new Date((fechaVal - 25569) * 86400000);
          fechaStr = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        } else {
          fechaStr = fechaVal.toString();
        }

        const presente = (marca === true || marca === '✔' || marca === 'TRUE');

        asistenciaRows.push([
          fechaStr,
          alumnoId,
          CONVOCATORIA_ID,
          profesorId,
          grupo,
          presente,
          new Date() // hora_registro (momento de migracion)
        ]);
        totalAsistencia++;
      }
    }
  }

  // Escribir alumnos en bloque
  if (alumnosRows.length > 0) {
    hojaAlumnos.getRange(
      hojaAlumnos.getLastRow() + 1, 1,
      alumnosRows.length, alumnosRows[0].length
    ).setValues(alumnosRows);
  }

  // Escribir asistencia en bloque
  if (asistenciaRows.length > 0) {
    hojaAsistencia.getRange(
      hojaAsistencia.getLastRow() + 1, 1,
      asistenciaRows.length, asistenciaRows[0].length
    ).setValues(asistenciaRows);
  }

  // Log
  const hojaLog = ssNuevo.getSheetByName('LOG');
  if (hojaLog) {
    hojaLog.appendRow([
      new Date(),
      'SISTEMA',
      'MIGRACION',
      'Importados ' + totalAlumnos + ' alumnos y ' + totalAsistencia + ' registros de asistencia desde Sheet original'
    ]);
  }

  SpreadsheetApp.getUi().alert(
    'Migracion completada:\n\n' +
    '- Alumnos importados: ' + totalAlumnos + '\n' +
    '- Registros de asistencia: ' + totalAsistencia + '\n\n' +
    'Revisa las hojas ALUMNOS y ASISTENCIA para verificar los datos.'
  );
}
