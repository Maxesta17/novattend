---
phase: 02-rendimiento-y-bundle
plan: "01"
subsystem: pwa-update-flow
tags: [pwa, service-worker, update-banner, tdd, vite-plugin-pwa]
dependency_graph:
  requires: []
  provides: [pwa-prompt-mode, update-banner-ui, sw-root-integration]
  affects: [vite.config.js, src/main.jsx, src/components/ui/UpdateBanner.jsx]
tech_stack:
  added: []
  patterns: [useRegisterSW hook, Root component pattern en entry point, TDD red-green-refactor]
key_files:
  created:
    - src/components/ui/UpdateBanner.jsx
    - src/tests/UpdateBanner.test.jsx
  modified:
    - vite.config.js
    - src/main.jsx
decisions:
  - "eslint-disable react-refresh/only-export-components en main.jsx — entry point no exporta componentes, la regla no aplica a archivos de entrada"
  - "UpdateBanner se renderiza fuera de ErrorBoundary para sobrevivir errores y navegacion de rutas"
metrics:
  duration_min: 3
  completed: 2026-03-31
  tasks_completed: 2
  files_changed: 4
---

# Phase 02 Plan 01: SW Prompt Mode + UpdateBanner Summary

**One-liner:** registerType cambiado a prompt con UpdateBanner persistente integrado via useRegisterSW en Root component.

## What Was Built

Cambio critico previo al code-splitting (PERF-01/D-04): el Service Worker ahora opera en modo `prompt`, lo que evita que un deploy nuevo invalide chunks mientras un profesor tiene la app abierta. Cuando el SW detecta una nueva version disponible, aparece un banner inferior dorado persistente con un boton "Actualizar" — sin boton de cierre, el usuario elige cuando actualizar.

## Tasks Completed

| # | Nombre | Commit | Archivos |
|---|--------|--------|----------|
| 1 | Crear UpdateBanner.jsx y sus tests (TDD) | `b2c488b` | src/components/ui/UpdateBanner.jsx, src/tests/UpdateBanner.test.jsx |
| 2 | Cambiar registerType a prompt y crear Root en main.jsx | `e2f8510` | vite.config.js, src/main.jsx |

## Verification Results

- `npm test` — 61 tests pasan (9 suites), incluyendo 6 tests nuevos de UpdateBanner
- `npm run build` — build exitoso, 274KB bundle, SW generado
- `npm run lint` — 0 errores (1 warning preexistente en DashboardPage, fuera de scope)
- `grep "registerType" vite.config.js` — muestra `'prompt'`
- `grep "useRegisterSW" src/main.jsx` — confirma import del hook

## Decisions Made

1. **eslint-disable en Root:** La regla `react-refresh/only-export-components` no aplica a `main.jsx` (entry point sin exports). Se suprime con un comentario inline para no contaminan el config global de ESLint.

2. **UpdateBanner fuera de ErrorBoundary:** El banner se renderiza como hermano de `<ErrorBoundary>` dentro de `<StrictMode>`. Esto garantiza que el banner de actualizacion sobrevive a errores de render en la app y a todas las navegaciones de React Router.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint error: react-refresh/only-export-components en main.jsx**
- **Found during:** Task 2 (verificacion de lint)
- **Issue:** La regla `react-refresh/only-export-components` genera error en `main.jsx` porque `Root` es un componente definido en un archivo de entrada sin exports. Esta regla esta disenada para modulos de componentes, no para entry points.
- **Fix:** Agregado `// eslint-disable-next-line react-refresh/only-export-components` antes de `function Root()`
- **Files modified:** src/main.jsx
- **Commit:** e2f8510

## Known Stubs

Ninguno — el banner renderiza contenido real, el hook useRegisterSW provee estado real del SW.

## Self-Check: PASSED
