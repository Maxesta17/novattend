---
phase: quick-260630-dti
plan: "01"
subsystem: apps-script
tags: [cache, invalidacion, activo, isTruthy, warmCache, checkbox]
dependency_graph:
  requires: []
  provides: [cacheInvalidate-determinista, isTruthy, CHECKBOX_ROWS-400]
  affects: [cacheInvalidate, handleGetConvocatorias, handleGetProfesores, handleGetAlumnos, computeResumen, warmCache, setupSheets]
tech_stack:
  added: []
  patterns: [purga-determinista-por-prefijo, coercion-laxa-booleano-sheets]
key_files:
  created: []
  modified:
    - apps-script/Código.js
decisions:
  - "purga determinista por sufijo __ (no por regenerar _keys): minima superficie de cambio, cero riesgo de borrar claves ajenas"
  - "isTruthy con indexOf en vez de Array.includes por maxima compatibilidad con el V8 runtime de Apps Script"
  - "CHECKBOX_ROWS = 400 (no 336) para dejar margen ante alumnos nuevos sin requerir re-ejecutar setupSheets pronto"
metrics:
  duration_minutes: 12
  completed_date: "2026-06-30"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
---

# Quick 260630-dti: fix warmCache invalidacion y lectura laxa de activo — Summary

**One-liner:** Purga determinista de clave calentada `res_<conv>__` en `cacheInvalidate` + helper `isTruthy` para leer `activo`/`activa` como texto en filas sin checkbox, con `CHECKBOX_ROWS` ampliado a 400.

## Tasks Completed

| # | Nombre | Commit | Archivos |
|---|--------|--------|----------|
| 1 | fix warmCache invalidacion — purga determinista | `c026969` | `apps-script/Código.js` |
| 2 | fix lectura laxa de activo/activa | `47a52c5` | `apps-script/Código.js` |

## What Was Built

### Tarea 1 — cacheInvalidate: purga determinista de la clave calentada huerfana

**Problema:** `warmCache` guarda `res_<conv>__` con `WARM_TTL = 21600s` (6h). El indice `_keys` vive solo `CACHE_TTL*3 = 360s` (6 min). Pasados 6 min, `_keys` expira; `cacheInvalidate` encontraba `keysJson = null` y retornaba inmediatamente (early-return). La clave calentada quedaba huerfana: ni listada ni purgada. Resultado: el CEO veia resumen stale durante hasta 6h tras cada guardar/justificar.

**Solucion aplicada en `cacheInvalidate`:**
- Eliminado el early-return `if (!keysJson) return`.
- El bloque de purga via indice (`_keys`) envuelto en `if (keysJson) { ... }` — sigue intacto cuando el indice existe.
- Purga determinista añadida al final (siempre corre): para cada prefijo que empiece por `'res_'`, ejecuta `cache_.remove(p + '__')`, borrando la clave global calentada aunque `_keys` haya expirado.
- Comentario JSDoc en español explicando el desfase de TTL.

### Tarea 2 — isTruthy + filtros laxos de activo/activa + CHECKBOX_ROWS=400

**Problema:** `setupSheets` aplicaba checkbox solo a 50 filas. Las filas 51-336 de ALUMNOS podian tener `activo` como texto (`'VERDADERO'`, `'TRUE'`, `'1'`) en vez de booleano nativo. Los filtros `=== true` descartaban esos alumnos, que desaparecian de la app.

**Cambios:**
- Nuevo helper `isTruthy(v)` en sección UTILIDADES, con JSDoc en español. Acepta: `true` (booleano), `1` (numero), y strings `TRUE/VERDADERO/SI/SÍ/X/1` (trim + toUpperCase). Guarda para Apps Script V8 con `typeof v === 'string'` antes de `.trim()`.
- 5 filtros de `activo`/`activa` reemplazados por `isTruthy(...)`:
  - `handleGetConvocatorias`: `c.activa === true` → `isTruthy(c.activa)`
  - `handleGetProfesores`: `p.activo === true` → `isTruthy(p.activo)`
  - `handleGetAlumnos`: `a.activo === true` → `isTruthy(a.activo)`
  - `computeResumen`: `a.activo === true` → `isTruthy(a.activo)`
  - `warmCache`: `c.activa === true` → `isTruthy(c.activa)`
- `presente === true` y `justificada === true` **NO tocados** — siguen estrictos (T-quick-03 accepted).
- `CHECKBOX_ROWS`: 50 → 400. Cubre 336 alumnos actuales con margen.

## Verificacion de Integridad

| Check | Resultado |
|-------|-----------|
| `cache_.remove(p + '__')` presente | linea 89 |
| Early-return en cacheInvalidate eliminado | Confirmado |
| Bloque `_keys` dentro de `if (keysJson)` | Confirmado |
| `function isTruthy` en UTILIDADES | 1 definicion |
| Llamadas a `isTruthy(` | 6 (1 definicion + 5 usos) |
| `.activo === true` / `.activa === true` restantes | **0** |
| `presente === true` intacto | 2 ocurrencias |
| `justificada === true` intacto | 4 ocurrencias |
| `CHECKBOX_ROWS = 400` | linea 1162 |
| Solo `apps-script/Código.js` modificado | Confirmado (`git status`) |

## Deviations from Plan

None — plan ejecutado exactamente como estaba especificado.

## Threat Surface Scan

Sin superficie nueva. Ambos fixes son cambios de logica interna (cache y coercion de tipos). No se anadieron endpoints, rutas de auth ni accesos a disco fuera del contrato existente.

## Self-Check: PASSED

- Commits `c026969` y `47a52c5` verificados en `git log --oneline -3`.
- `apps-script/Código.js` es el unico archivo modificado (`git status` muestra solo directorios no rastreados `.claude-flow/` y `.planning/quick/`).
- Los 5 puntos de verificacion estatica del plan superados.
