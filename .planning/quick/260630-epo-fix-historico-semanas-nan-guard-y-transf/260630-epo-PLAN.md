---
phase: quick-260630-epo
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps-script/Código.js
  - apps-script/Gestion convocatorias.js
autonomous: true
requirements: [AUDIT-HIST-NAN, AUDIT-TRANSF-LOCK]
must_haves:
  truths:
    - "Una celda de fecha malformada en ASISTENCIA ya NO tumba getResumen con HTTP 500"
    - "La fila con fecha mala se salta del histograma semanal pero sigue visible en registros/ultimas_8"
    - "transferirHistorial toma LockService antes de leer/reescribir ASISTENCIA"
    - "Si transferirHistorial no obtiene el lock, avisa con ui.alert y no escribe"
    - "releaseLock() siempre se ejecuta (finally) al terminar transferirHistorial"
  artifacts:
    - path: "apps-script/Código.js"
      provides: "Guarda NaN/fecha-invalida en el bucle porSemana de computeResumen"
      contains: "isNaN"
    - path: "apps-script/Gestion convocatorias.js"
      provides: "transferirHistorial protegida con LockService"
      contains: "LockService.getScriptLock"
  key_links:
    - from: "apps-script/Código.js:computeResumen"
      to: "porSemana / regsOrdenados.forEach"
      via: "guarda previa a new Date + fmt(lun)"
      pattern: "isNaN\\(dt\\.getTime\\(\\)\\)|partes\\.length"
    - from: "apps-script/Gestion convocatorias.js:transferirHistorial"
      to: "ASISTENCIA setValues"
      via: "lock.waitLock / finally releaseLock"
      pattern: "lock\\.releaseLock\\(\\)"
---

<objective>
Dos fixes de backend Apps Script salidos de una auditoria, independientes entre si, cada uno en su propio commit atomico.

1. **Tarea 1 (Codigo.js):** El bucle `porSemana` de `computeResumen` construye una fecha con `new Date(...)` y la formatea con `fmt(lun)` (`Utilities.formatDate`). Si una celda de `fecha` esta malformada (editada a mano por Aurora como `dd/mm/yyyy`, numero, vacia), `dt` queda `Invalid Date` y `Utilities.formatDate` LANZA. La excepcion sube por `handleGetResumen` -> `doGet` catch -> **HTTP 500**, tumbando el resumen completo de toda la convocatoria para todos. Se anade una guarda que salta esa fila del histograma sin romper el resumen.

2. **Tarea 2 (Gestion convocatorias.js):** `transferirHistorial` (item de menu que ejecuta Aurora) lee ASISTENCIA entera, la modifica en memoria y reescribe TODA la hoja con `setValues`, SIN LockService. `handleGuardarAsistencia` (en Codigo.js) SI toma `LockService.getScriptLock()`. Sin lock compartido, si un profesor guarda mientras Aurora transfiere, el snapshot viejo pisa el guardado -> **perdida silenciosa de asistencia**. Se envuelve el cuerpo en el mismo patron de lock que ya usa `sincronizarHoja`.

Purpose: Estabilidad backend — eliminar dos modos de fallo (500 silencioso por dato sucio y race condition con perdida de datos) detectados en auditoria.
Output: Dos commits `fix:` atomicos, uno por archivo. Sin cambios de logica de negocio.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md

Branch actual de trabajo: `fix/cache-invalidacion-y-activo-robusto` (NO main). Commits Conventional en espanol, prefijo `fix:`. CADA TAREA SU PROPIO COMMIT ATOMICO.
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

<interfaces>
<!-- Contratos ya presentes en el codebase. El executor los usa directamente, sin explorar. -->

apps-script/Codigo.js — bucle vulnerable (lineas 576-591, computeResumen):
```javascript
    const porSemana = {};
    regsOrdenados.forEach(function(r) {
      const partes = r.fecha.split('-');
      const dt = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
      const lun = mondayOf_(dt);
      const lunStr = fmt(lun);          // <- Utilities.formatDate LANZA si dt es Invalid Date
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
```
- `fmt` (linea 457): `const fmt = d => Utilities.formatDate(d, tz, 'yyyy-MM-dd')` — LANZA con Invalid Date.
- `mondayOf_` (linea 427): recibe un Date; con Invalid Date devuelve Invalid Date, que luego revienta en `fmt`.
- Los campos `registros`, `ultimas_8`, `pct`, ventanas por fecha (`hace7Str` etc.) NO se tocan: la fila mala sigue visible.

apps-script/Gestion convocatorias.js — patron de lock modelo (sincronizarHoja, lineas 1191-1316):
```javascript
function sincronizarHoja(nombreHoja) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return; // Se reintentara en el proximo onEdit
  }
  try {
    ...cuerpo...
  } finally {
    lock.releaseLock();
  }
}
```

apps-script/Gestion convocatorias.js — funcion a proteger (transferirHistorial, lineas 1329-1402):
```javascript
function transferirHistorial() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ...lee ALUMNOS, lee ASISTENCIA, corrige en memoria...
    if (asistData.length > 1) {
      asistSheet.getRange(1, 1, asistData.length, asistData[0].length).setValues(asistData); // linea 1376
    }
    actualizarEstadisticas();
    ...log + ui.alert exito...
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
}
```
- Es funcion de UI: en fallo de lock se avisa con `ui.alert`, no con `return` silencioso.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Tarea 1: Guarda NaN/fecha-invalida en el histograma semanal de computeResumen</name>
  <files>apps-script/Código.js</files>
  <action>
En `computeResumen`, dentro del callback de `regsOrdenados.forEach` (lineas ~577-591), justo despues de calcular `partes` y `dt` y ANTES de llamar a `mondayOf_(dt)` / `fmt(lun)`, anadir una guarda que salte la fila si la fecha esta malformada. Condicion de fila invalida (cualquiera de estas): `typeof r.fecha !== 'string'`, `partes.length !== 3`, alguno de `Number(partes[0])`/`Number(partes[1])`/`Number(partes[2])` es `NaN` o `0` (anio/mes/dia 0 no son validos), o `isNaN(dt.getTime())`. Si la fila es invalida -> `return` (saltar SOLO el histograma semanal de esa fila; la fila sigue contabilizada en `registros`/`ultimas_8`/`pct`, que no se tocan).

Comentario en espanol explicando POR QUE: una celda editada a mano por Aurora (formato dd/mm/yyyy, numero o vacia) producia Invalid Date y `fmt`/`Utilities.formatDate` lanzaba, tumbando getResumen entero con HTTP 500 para toda la convocatoria; ahora la fila mala se salta del agrupado semanal sin romper el resumen.

NO cambiar nada mas: ni las ventanas por fecha (`hace7Str` etc.), ni `pct`, ni `mondayOf_`, ni `fmt`, ni `ultimas_8`, ni la racha. SOLO insertar la guarda dentro de este forEach. Identificadores en ingles, comentario en espanol (regla CLAUDE.md).

Despues del cambio, hacer commit atomico que toque SOLO este archivo:
`git add "apps-script/Código.js" && git commit -m "fix: historico_semanas tolera fechas malformadas (no tumbar getResumen)"`
  </action>
  <verify>
    <automated>node --check "apps-script/Código.js" && grep -nE "isNaN\(dt\.getTime\(\)\)|partes\.length !== 3" "apps-script/Código.js"</automated>
  </verify>
  <done>`node --check` pasa; el grep muestra la guarda dentro del forEach de porSemana; ninguna otra linea de computeResumen cambiada; commit `fix: historico_semanas...` creado tocando solo apps-script/Código.js.</done>
</task>

<task type="auto">
  <name>Tarea 2: transferirHistorial protegida con LockService (exclusion mutua con guardado de asistencia)</name>
  <files>apps-script/Gestion convocatorias.js</files>
  <action>
En `transferirHistorial` (lineas ~1329-1402), envolver el cuerpo en el mismo patron de lock que usa `sincronizarHoja` (lineas 1191-1316) y los handlers POST de Codigo.js. Como es funcion de UI, en fallo de lock se avisa con `ui.alert` (no `return` silencioso).

Estructura final:
1. `const ui = SpreadsheetApp.getUi();` (ya existe, queda al principio).
2. `const lock = LockService.getScriptLock();`
3. `try { lock.waitLock(15000); } catch (e) { ui.alert('Servidor ocupado, reintenta en unos segundos'); return; }`
4. `try { ...cuerpo actual completo de la funcion (desde `const ss = ...` hasta el ui.alert de exito, incluyendo el `catch (err) { ui.alert('Error: ' + err.message); }` que ya existe)... } finally { lock.releaseLock(); }`

Garantizar que `releaseLock()` SIEMPRE corre via `finally`, incluso si el cuerpo lanza o hace `return` temprano (el `return` del caso "No hay historial pendiente" debe seguir liberando el lock — al estar dentro del try con finally, lo hace automaticamente). Mantener el `try/catch(err){ ui.alert('Error: '+err.message) }` existente DENTRO del try del lock para que siga capturando errores de negocio sin perder el releaseLock.

Comentario en espanol explicando POR QUE: `handleGuardarAsistencia` toma el script lock; sin compartirlo, un profesor guardando en paralelo a esta transferencia perdia su asistencia porque el snapshot viejo la pisaba con setValues. Ahora ambos comparten el mismo script lock -> exclusion mutua.

NO cambiar la logica de negocio (lectura de ALUMNOS/ASISTENCIA, correccion en memoria, setValues, actualizarEstadisticas, log, ui.alert de exito). SOLO anadir la exclusion mutua. Identificadores en ingles, comentarios/mensajes en espanol.

Despues del cambio, hacer commit atomico que toque SOLO este archivo:
`git add "apps-script/Gestion convocatorias.js" && git commit -m "fix: transferirHistorial usa LockService (evita perder asistencia guardada en paralelo)"`
  </action>
  <verify>
    <automated>node --check "apps-script/Gestion convocatorias.js" && grep -nE "LockService\.getScriptLock|lock\.waitLock\(15000\)|lock\.releaseLock\(\)" "apps-script/Gestion convocatorias.js" | grep -c transferir; grep -nE "Servidor ocupado" "apps-script/Gestion convocatorias.js"</automated>
  </verify>
  <done>`node --check` pasa; `transferirHistorial` contiene `LockService.getScriptLock()`, `lock.waitLock(15000)` con `ui.alert` de "Servidor ocupado" en el catch, y `lock.releaseLock()` en un `finally`; logica de negocio intacta; commit `fix: transferirHistorial...` creado tocando solo "apps-script/Gestion convocatorias.js".</done>
</task>

</tasks>

<verification>
- `node --check` pasa en ambos archivos (no se rompio la sintaxis).
- Codigo.js: la guarda esta DENTRO del forEach de `porSemana` y antes de `mondayOf_`/`fmt`; `registros`, `ultimas_8`, `pct` y ventanas por fecha intactos.
- Gestion convocatorias.js: `transferirHistorial` toma y libera el script lock (finally), avisa con `ui.alert` si no obtiene el lock; logica de negocio sin cambios.
- Dos commits separados, cada uno tocando UN solo archivo, ambos prefijo `fix:` en espanol, sobre la branch actual (no main).
</verification>

<success_criteria>
- Una fila de ASISTENCIA con fecha malformada ya no genera HTTP 500 en getResumen; se salta del histograma semanal y el resto del resumen se devuelve normal.
- `transferirHistorial` no puede correr en paralelo con un guardado de asistencia: comparten script lock, eliminando la perdida silenciosa de datos.
- Cero cambios de logica de negocio. Dos commits atomicos `fix:`.
</success_criteria>

<output>
Crear `.planning/quick/260630-epo-fix-historico-semanas-nan-guard-y-transf/260630-epo-SUMMARY.md` al terminar.
</output>
