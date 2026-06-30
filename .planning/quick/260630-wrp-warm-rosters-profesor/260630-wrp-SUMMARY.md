---
status: complete
task: warm-rosters-profesor
date: 2026-06-30
commit: f50e1a8
branch: perf/warm-rosters-profesor
---

# Quick Task 260630-wrp — warmCache calienta rosters per-profesor

## Objetivo
Eliminar el frío del primer `getAlumnos` de cada profesor. `warmCache` solo
calentaba el resumen global del CEO (`res_<conv>__`); el roster que pide el
teacher (`alu_<conv>_<prof>_<grupo>`) pagaba frío (~2s) y se re-enfriaba cada
120s (CACHE_TTL).

## Hecho
1. **`warmAlumnosRosters_`** (helper nuevo): deriva los rosters per-profesor/grupo
   del array `alumnos` ya leído por `warmCache` → **cero lecturas extra de hoja**.
   Clave y filtrado byte-idénticos a `handleGetAlumnos`. Calienta G1-G4 (incl.
   vacíos) de cada profesor presente en la convocatoria.
2. **Índice persistente `_warm_keys`** (TTL = `WARM_TTL` 6h): `cacheInvalidate`
   purga los rosters calentados aunque `_keys` (6 min) expire. Evita el bug de
   clave huérfana stale 6h (mismo patrón ya resuelto para `res_`).

## Fixes de correctitud (revisión adversarial — Workflow, 5 lentes)
- **kp-1 (importante):** `crearAlumno` ahora invalida `res_`/`asist_` además de
  `alu_`. Crear un alumno cambia el resumen del CEO (`computeResumen` itera el
  roster), que quedaba stale hasta 6h por el warm de `res_`. Bug **pre-existente**
  amplificado ×180 por el warming.
- **kp-2 (importante):** `warmCache` toma el `LockService` global (igual que los
  escritores) para serializar contra `cacheInvalidate`; si el lock está ocupado,
  omite el calentado (degradación segura: cache frío > datos stale). Cierra la
  carrera warm/invalidación que dejaba huérfanos stale 6h (aplica a `alu_` y `res_`).

## Verificación
- `node --check` OK.
- Simulación Node (independiente): paridad clave+contenido warm vs `handleGetAlumnos`
  (8 claves) PASS; `crearAlumno`/`actualizarAlumno`/`guardarAsistencia` invalidan
  correcto y no tocan convocatorias hermanas; `_warm_keys` peor caso 82 claves = 3KB.
- Workflow adversarial: 19 hallazgos crudos → 6 confirmados (0 falsos positivos
  actuados). Refutó: paridad, aislamiento IDOR, cap 6-min, atomicidad de invalidación.

## Deuda menor documentada (no bloqueante)
- Re-enfriamiento a 120s tras un `actualizarAlumno` (la re-lectura live usa
  CACHE_TTL, no WARM_TTL). Aceptable: editar alumno es raro.
- Profesor sin alumnos activos en la convocatoria no se precalienta (el universo
  sale de los alumnos activos, no de la hoja PROFESORES).
- Colisión de prefijo si dos ids de convocatoria **manuales** son prefijo uno de
  otro (over-invalidation benigna; el fix de separador rompería la purga
  determinista de `res_`, requiere tarea propia).
- Clave fantasma en `_warm_keys` si un roster supera 100KB (teórico a esta escala).

## Pendiente
- Deploy: `clasp push` + `clasp version` + `clasp redeploy` a prod (afecta al web
  app por `cacheInvalidate`/`crearAlumno`; `warmCache` corre como trigger head).
- Configurar/confirmar trigger time-driven `warmCache` 6-7am (ya existía).
