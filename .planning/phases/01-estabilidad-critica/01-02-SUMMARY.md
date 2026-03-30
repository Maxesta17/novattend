---
phase: 01-estabilidad-critica
plan: 02
subsystem: error-handling
tags: [api, error-handling, ui-component, bug-fix, tdd]
dependency_graph:
  requires: []
  provides: [error-visibility, res-ok-check, ErrorBanner-component]
  affects: [src/services/api.js, src/hooks/useStudents.js, src/pages/AttendancePage.jsx, src/pages/SavedPage.jsx]
tech_stack:
  added: []
  patterns: [ErrorBanner-reusable-component, TDD-red-green]
key_files:
  created:
    - src/components/ui/ErrorBanner.jsx
    - src/tests/ErrorBanner.test.jsx
    - src/tests/SavedPage.test.jsx
  modified:
    - src/services/api.js
    - src/hooks/useStudents.js
    - src/pages/AttendancePage.jsx
    - src/pages/SavedPage.jsx
    - src/tests/api.test.jsx
decisions:
  - "ErrorBanner renderiza null cuando message es null/empty para evitar espacio vacio"
  - "loadError se limpia con setLoadError(null) al inicio de cada carga, no necesita dismiss manual"
metrics:
  duration_seconds: 333
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_modified: 8
---

# Phase 01 Plan 02: Error Handling Robusto Summary

**One-liner:** Verificacion res.ok en API + ErrorBanner reutilizable con role=alert + fix bug SavedPage present===0 falsy.

## What Was Built

Tres correcciones criticas para errores silenciosos y comportamiento inesperado:

1. **api.js res.ok check** — `apiGet` y `apiPost` ahora lanzan `Error HTTP {status}: {statusText}` cuando la respuesta HTTP no es exitosa (antes intentaban parsear HTML de error como JSON).

2. **ErrorBanner.jsx** — Componente puro en `src/components/ui/` con `role="alert"`, boton de dismiss opcional via `onDismiss`, y retorno `null` cuando `message` es falsy. Sin estilos inline, solo Tailwind tokens.

3. **SavedPage present===0 fix** — La condicion de redireccion usaba `!state.present` (falsy para 0). Corregida a `state.present === undefined` para permitir guardar sesiones con 0 presentes.

4. **useStudents loadError** — El hook ahora expone `loadError` (string|null) poblado en los bloques catch de carga inicial y cambio de grupo.

5. **AttendancePage integracion** — Importa ErrorBanner, consume `loadError` del hook, reemplaza el banner ad-hoc `bg-error/10` con `<ErrorBanner>` para errores de guardado.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix res.ok + ErrorBanner + SavedPage bug | 4c270ab | api.js, ErrorBanner.jsx, SavedPage.jsx, 3 test files |
| 2 | Integrar ErrorBanner en AttendancePage + loadError | cf49609 | useStudents.js, AttendancePage.jsx |

## Verification Results

- `grep -n "if (!res.ok)" src/services/api.js | wc -l` → 2 (uno en apiGet, uno en apiPost)
- `grep "style={{" src/components/ui/ErrorBanner.jsx` → sin resultados (OK)
- `grep 'role="alert"' src/components/ui/ErrorBanner.jsx` → presente
- `grep "state.present === undefined" src/pages/SavedPage.jsx` → presente
- `grep "ErrorBanner" src/pages/AttendancePage.jsx | wc -l` → 3 (import + 2 usos)
- `grep "bg-error/10" src/pages/AttendancePage.jsx` → sin resultados (OK)
- `npm test -- --run` → 235 tests pasando, 0 fallos

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Fix] Mocks de fetch sin propiedad `ok: true`**
- **Found during:** Task 1, RED phase
- **Issue:** Los mocks existentes en api.test.jsx no tenian la propiedad `ok`, lo que hubiera causado fallos en los tests existentes al agregar el check `res.ok`
- **Fix:** Agregado `ok: true` a todos los mocks de fetch que simulan respuestas exitosas (8 mocks actualizados)
- **Files modified:** src/tests/api.test.jsx
- **Commit:** 4c270ab

**2. [Rule 3 - Fix] Test duplicado apiPost devuelve null**
- **Found during:** Task 1, al construir el test de apiPost HTTP 403
- **Issue:** Al insertar el test de HTTP 403 junto al bloque apiPost, se creo un duplicado del test `apiPost devuelve null si API no esta habilitada`
- **Fix:** Eliminado el duplicado antes del commit
- **Files modified:** src/tests/api.test.jsx
- **Commit:** 4c270ab

## Known Stubs

None — todos los datos fluyen correctamente. ErrorBanner renderiza mensajes reales de error desde la API o del hook.

## Self-Check

```
[x] src/services/api.js existe con 2 checks if (!res.ok)
[x] src/components/ui/ErrorBanner.jsx existe con role="alert"
[x] src/pages/SavedPage.jsx contiene state.present === undefined
[x] src/hooks/useStudents.js contiene loadError en return
[x] src/pages/AttendancePage.jsx contiene 3 referencias a ErrorBanner
[x] src/tests/ErrorBanner.test.jsx existe con 6 tests
[x] src/tests/SavedPage.test.jsx existe con 3 tests
[x] Commits: 4c270ab, cf49609
```
