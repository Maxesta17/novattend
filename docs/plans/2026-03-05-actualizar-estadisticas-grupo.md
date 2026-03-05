# actualizarEstadisticasGrupo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Actualizar automaticamente las columnas B/C/D de la hoja de grupo afectada cada vez que un profesor guarda asistencia.

**Architecture:** Nueva funcion `actualizarEstadisticasGrupo(convId, profId, grupo)` en gestionConvocatorias.gs que actualiza solo 1 hoja. Se invoca al final de `handleGuardarAsistencia` en Code.gs.

**Tech Stack:** Google Apps Script (server-side)

---

### Task 1: Crear actualizarEstadisticasGrupo en gestionConvocatorias.gs

**Files:**
- Modify: `docs/apps-script/gestionConvocatorias.gs` (anadir funcion al final, antes del bloque MENU)

**Step 1: Escribir la funcion actualizarEstadisticasGrupo**

Anadir justo antes del bloque `// MENU PERSONALIZADO` (linea 506):

```javascript
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
  const stats = {}; // { "alu-0001": { total, presentes, ultimaFecha } }

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
```

**Step 2: Verificar que no hay errores de sintaxis**

Revisar visualmente que la funcion esta bien cerrada y no rompe el resto del archivo.

**Step 3: Commit**

```bash
git add docs/apps-script/gestionConvocatorias.gs
git commit -m "feat: actualizarEstadisticasGrupo — actualiza stats de 1 hoja"
```

---

### Task 2: Llamar actualizarEstadisticasGrupo desde handleGuardarAsistencia

**Files:**
- Modify: `docs/apps-script/Code.gs:500-501` (anadir llamada despues de cacheInvalidate)

**Step 1: Anadir llamada a actualizarEstadisticasGrupo**

En `handleGuardarAsistencia`, despues de la linea `cacheInvalidate(['res_' + convocatoria_id]);` (linea 501) y antes del bloque de Log, anadir:

```javascript
  // Actualizar estadisticas de la hoja de grupo afectada
  try {
    actualizarEstadisticasGrupo(convocatoria_id, profesor_id, grupo);
  } catch (err) {
    Logger.log('Error actualizando estadisticas: ' + err.message);
  }
```

El try/catch es critico: si falla la actualizacion de stats, la asistencia YA esta guardada. No queremos que un error en stats haga fallar todo el POST.

**Step 2: Verificar que la linea queda en la posicion correcta**

El orden final en handleGuardarAsistencia debe ser:
1. Eliminar registros previos
2. Insertar nuevos registros
3. Invalidar cache
4. **Actualizar estadisticas del grupo** (nuevo)
5. Log
6. Return respuesta

**Step 3: Commit**

```bash
git add docs/apps-script/Code.gs
git commit -m "feat: llamar actualizarEstadisticasGrupo tras guardar asistencia"
```

---

### Task 3: Actualizar progress.md y cerrar deuda tecnica

**Files:**
- Modify: `docs/progress.md`

**Step 1: Mover item de deuda tecnica a resuelta**

- Mover "Validar que actualizarEstadisticas() se ejecuta correctamente tras guardar asistencia" de Pendiente a Resuelta
- Eliminar items "Considerar migracion a TypeScript" y "Configurar API key de 21st.dev" (descartados/resueltos)
- Actualizar seccion de Siguiente Paso

**Step 2: Commit**

```bash
git add docs/progress.md
git commit -m "docs: cerrar deuda tecnica — actualizarEstadisticasGrupo"
```

---

## Nota para Aurora/Deploy

Despues de implementar en los archivos locales, hay que:
1. Copiar el contenido actualizado de `gestionConvocatorias.gs` al editor de Apps Script
2. Copiar el contenido actualizado de `Code.gs` al editor de Apps Script
3. Hacer nuevo deploy de la Web App (Deploy > New deployment)
