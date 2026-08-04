---
phase: quick-260804-eyg
plan: 01
subsystem: docs
tags: [documentacion, incidente, convocatorias]
dependency-graph:
  requires: []
  provides: [registro-incidente-convocatoria-abril-2026-08-04]
  affects: [docs/progress.md]
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - docs/progress.md
decisions:
  - "Documentar el incidente como fix de DATO, no de codigo — evita que un futuro agente busque la causa en el repositorio"
  - "Registrar explicitamente el limite de verificacion (getConvocatorias no es curl-able) para que no se repita el intento en incidentes futuros"
metrics:
  duration: "~10 min"
  completed: 2026-08-04
---

# Quick Task 260804-eyg: Registrar incidente de convocatoria caducada en docs/progress.md Summary

Documentacion pura del incidente del 2026-08-04 (convocatoria "abril 2026" caducada por dato, 6 profesores afectados) en `docs/progress.md`, sin tocar codigo.

## What Was Built

Dos ediciones sobre `docs/progress.md`:

1. **`## Ultimo Hito`** actualizado: fecha 2026-08-04, resumen del incidente (causa de dato, fix aplicado, siguiente paso pendiente con Aurora).
2. **Entrada nueva `### 2026-08-04 — Incidente: convocatoria de abril caducada dejo a 6 profesores sin alumnos (fix de dato, sin codigo)`** insertada como primera entrada del fichero (encima de la de 2026-07-28), cubriendo: sintoma, causa raiz con referencia a `apps-script/Código.js:1038`, alcance real (6 de 7 profesores), fix aplicado (celdas exactas `CONVOCATORIAS!D2` y `D3`, serial RAW 46326), verificacion y sus limites (getConvocatorias no verificable por curl, exige token HMAC), gotcha de cache de 120s (`Código.js:31` y `1035`), asuncion pendiente sobre la fecha_fin de LING. ACDMY, y deuda detectada de paso (Marta sin alumnos, Joaquin/Sven).

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `docs/progress.md` es el unico fichero de producto modificado (`git diff --name-only -- src apps-script CLAUDE.md` vacio).
- La entrada `### 2026-08-04` es la primera cabecera `###` del fichero; la de 2026-07-28 sigue intacta debajo.
- Todos los identificadores requeridos presentes: `conv-abr26`, `CACHE_TTL`, `alu-0056`, `prof-marta`, `46326`, `**Fecha:** 2026-08-04`.
- Diff puramente aditivo salvo las 2 lineas reemplazadas de `## Ultimo Hito` — ninguna entrada historica borrada ni reordenada.
- Cero secretos en el texto anadido (sin passwords, tokens, URLs `/exec`, emails personales ni spreadsheet ID).

## Commits

- `d1cd227` — `docs: registrar incidente 2026-08-04 de convocatoria de abril caducada`

## Self-Check: PASSED

- FOUND: docs/progress.md (entrada `### 2026-08-04` presente, verificada por grep)
- FOUND: d1cd227 (commit verificado en `git log`)
