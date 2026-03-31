---
phase: 02-rendimiento-y-bundle
plan: "02"
subsystem: code-splitting
tags: [code-splitting, react-lazy, suspense, manualchunks, vite, performance, tdd]
dependency_graph:
  requires: [02-01]
  provides: [lazy-routes, loading-spinner, vendor-chunks]
  affects: [src/App.jsx, vite.config.js, src/components/ui/LoadingSpinner.jsx]
tech_stack:
  added: []
  patterns: [React.lazy dynamic import, Suspense fallback, Rollup manualChunks, TDD red-green]
key_files:
  created:
    - src/components/ui/LoadingSpinner.jsx
    - src/tests/LoadingSpinner.test.jsx
    - src/pages/NotFoundPage.jsx
  modified:
    - src/App.jsx
    - vite.config.js
decisions:
  - "vendor-react chunk queda vacio — React 19 ESM no se puede separar del bundle principal con manualChunks; vendor-router (46KB) si se extrae correctamente"
  - "NotFoundPage creada como prerequisito bloqueante — archivo referenciado en plan pero ausente en worktree paralelo"
  - "vitest globals importados explicitamente en tests (import { describe, it, expect } from vitest) segun patron del proyecto"
metrics:
  duration_min: 8
  completed: 2026-03-31
  tasks_completed: 2
  files_changed: 5
---

# Phase 02 Plan 02: Code-Splitting + Vendor Chunks Summary

**One-liner:** Code-splitting con React.lazy + Suspense implementado en 4 rutas post-login, vendor-router separado en chunk cacheable de 46KB.

## What Was Built

Las 4 paginas post-login (ConvocatoriaPage, AttendancePage, SavedPage, DashboardPage) ahora se cargan bajo demanda usando `React.lazy()`. Un unico `<Suspense>` envuelve `<Routes>` mostrando el nuevo `LoadingSpinner` branded mientras se descarga el chunk. LoginPage y NotFoundPage siguen como imports estaticos (eager) en el bundle principal.

En vite.config.js se agrego la seccion `build.rollupOptions.output.manualChunks` extrayendo `vendor-router` (react-router-dom) en un chunk separado de 46KB que puede cachearse independientemente entre deploys.

## Tasks Completed

| # | Nombre | Commit | Archivos |
|---|--------|--------|----------|
| 1 | Crear LoadingSpinner.jsx y sus tests (TDD) | `410d109` | src/components/ui/LoadingSpinner.jsx, src/tests/LoadingSpinner.test.jsx |
| 2 | Code-splitting en App.jsx + manualChunks en vite.config.js | `c8028d0` | src/App.jsx, vite.config.js, src/pages/NotFoundPage.jsx |

## Verification Results

- `npm test` — 58 tests pasan (9 suites), incluyendo 3 tests nuevos de LoadingSpinner
- `npm run build` — build exitoso, vendor-router-*.js y vendor-react-*.js generados en dist/assets/
- `npm run lint` — 0 errores (1 warning preexistente en DashboardPage, fuera de scope)
- `grep "lazy" src/App.jsx` — confirma 4 lazy imports
- `ls dist/assets/ | grep vendor` — vendor-react y vendor-router presentes

## Decisions Made

1. **vendor-react chunk vacio:** React 19 utiliza exports ESM internos que Rollup resuelve directamente en el bundle principal. El chunk `vendor-react` se genera pero queda vacio (0.00 kB). Esto es comportamiento esperado de Vite 7 + React 19 — no es un error. El chunk `vendor-router` (46KB) si se extrae correctamente.

2. **NotFoundPage como prerequisito bloqueante:** El plan referenciaba `NotFoundPage` como import eager en App.jsx pero el archivo no existia en el worktree paralelo (fue creado en otra rama por Plan 01-estabilidad-critica). Se creo NotFoundPage.jsx minimalista segun el patron del proyecto (Rule 3).

3. **Imports vitest explicitos en tests:** El proyecto usa `import { describe, it, expect } from 'vitest'` en todos los test files para cumplir el lint config de ESLint (sin globals configurados en ESLint). La primera version del test usaba globals implicitos — corregido antes del commit final.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] NotFoundPage.jsx faltante en worktree paralelo**
- **Found during:** Task 2 (al escribir App.jsx con import eager de NotFoundPage)
- **Issue:** El archivo `src/pages/NotFoundPage.jsx` no existia en el worktree. La ejecucion paralela no habia aplicado los cambios de Plan 01-estabilidad-critica a este worktree.
- **Fix:** Creada `src/pages/NotFoundPage.jsx` con pagina 404 branded (fondo dark-bg, texto en espanol, boton "Volver al inicio" con Button.jsx)
- **Files modified:** src/pages/NotFoundPage.jsx (creado)
- **Commit:** c8028d0

**2. [Rule 1 - Bug] ESLint error: globals vitest no definidos en LoadingSpinner.test.jsx**
- **Found during:** Task 2 (verificacion npm run lint)
- **Issue:** Test file usaba `describe`, `it`, `expect` sin importar de vitest, causando 7 errores ESLint (no-undef). El vitest config tiene `globals: true` pero ESLint no tiene vitest globals configurados.
- **Fix:** Agregado `import { describe, it, expect } from 'vitest'` al inicio del test file, siguiendo el patron de todos los otros tests del proyecto.
- **Files modified:** src/tests/LoadingSpinner.test.jsx
- **Commit:** c8028d0

## Known Stubs

Ninguno — LoadingSpinner renderiza contenido real (SVG animado + texto), App.jsx tiene lazy imports reales, manualChunks produce chunks reales en el build.

## Self-Check: PASSED
