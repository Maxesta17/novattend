---
phase: quick-260630-epo
plan: 01
subsystem: apps-script
tags: [fix, backend, nan-guard, lock-service, race-condition, stability]
dependency_graph:
  requires: []
  provides: [AUDIT-HIST-NAN, AUDIT-TRANSF-LOCK]
  affects: [apps-script/Código.js, apps-script/Gestion convocatorias.js]
tech_stack:
  added: []
  patterns: [LockService exclusion mutua, NaN guard fecha malformada]
key_files:
  modified:
    - apps-script/Código.js
    - apps-script/Gestion convocatorias.js
decisions:
  - "guarda isNaN antes de mondayOf_/fmt en lugar de try/catch local para no enmascarar errores reales"
  - "ui.alert en fallo de lock (no return silencioso) porque transferirHistorial es funcion de UI interactiva"
  - "timeout de 15s en waitLock (vs 10s de sincronizarHoja) porque transferirHistorial hace mas trabajo"
metrics:
  duration: "8 min"
  completed: "2026-06-30"
  tasks: 2
  files_modified: 2
---

# Quick 260630-epo Plan 01: Fix historico_semanas NaN-guard y transferirHistorial LockService

**One-liner:** Guarda NaN en porSemana de computeResumen para evitar HTTP 500 por fecha malformada + LockService en transferirHistorial para exclusion mutua con guardado de asistencia.

## Tasks Completed

| # | Tarea | Commit | Archivo |
|---|-------|--------|---------|
| 1 | Guarda NaN/fecha-invalida en el histograma semanal de computeResumen | `19575ff` | apps-script/Código.js |
| 2 | transferirHistorial protegida con LockService | `3706495` | apps-script/Gestion convocatorias.js |

## Changes Made

### Tarea 1 — Código.js: guarda NaN en bucle porSemana

Dentro del callback `regsOrdenados.forEach` en `computeResumen`, antes de llamar a `mondayOf_(dt)` y `fmt(lun)`, se anadieron las siguientes guardas en orden:

1. `if (typeof r.fecha !== 'string') return;`
2. `if (partes.length !== 3) return;`
3. Extraccion de `yr`, `mo`, `dy` como `Number(partes[N])` con guarda `isNaN || === 0`
4. `if (isNaN(dt.getTime())) return;`

Resultado: una celda de fecha editada a mano por Aurora (formato `dd/mm/yyyy`, numero, vacia) ya no lanza excepcion en `Utilities.formatDate` ni produce HTTP 500. La fila invalida se salta solo del agrupado semanal; `registros`, `ultimas_8`, `pct` y ventanas por fecha siguen intactos.

### Tarea 2 — Gestion convocatorias.js: LockService en transferirHistorial

Se anado exclusion mutua siguiendo el patron de `sincronizarHoja`:

```
const lock = LockService.getScriptLock();
try {
  lock.waitLock(15000);
} catch (e) {
  ui.alert('Servidor ocupado, reintenta en unos segundos');
  return;
}
try {
  ...cuerpo original completo...
} catch (err) {
  ui.alert('Error: ' + err.message);
} finally {
  lock.releaseLock();
}
```

`releaseLock()` queda en `finally`: se ejecuta siempre, incluyendo el `return` temprano cuando `registrosCorregidos === 0`. Sin cambios en la logica de negocio (lectura de ALUMNOS/ASISTENCIA, correccion en memoria, setValues, actualizarEstadisticas, log).

## Deviations from Plan

None — plan ejecutado exactamente como escrito.

## Verification

- `node --check apps-script/Código.js` — PASA
- `node --check apps-script/Gestion convocatorias.js` — PASA
- grep `isNaN(dt.getTime())` y `partes.length !== 3` presentes en Código.js (lineas 591, 585)
- grep `LockService.getScriptLock`, `lock.waitLock(15000)`, `lock.releaseLock()`, `Servidor ocupado` presentes en Gestion convocatorias.js (lineas 1336, 1338, 1415, 1340)
- Dos commits atomicos `fix:` en branch `fix/cache-invalidacion-y-activo-robusto`, cada uno tocando un solo archivo

## Self-Check: PASSED

- `19575ff` — fix: historico_semanas tolera fechas malformadas (no tumbar getResumen)
- `3706495` — fix: transferirHistorial usa LockService (evita perder asistencia guardada en paralelo)
- Ambos archivos modificados verificados con `node --check`
- Ningun otro archivo tocado
