---
phase: 03-arquitectura-y-accesibilidad
plan: "01"
subsystem: hooks/dashboard
tags: [refactor, hooks, architecture, dashboard]
dependency_graph:
  requires: [03-00]
  provides: [useDashboard-hook, DashboardPage-clean]
  affects: [src/pages/DashboardPage.jsx, src/hooks/useDashboard.js]
tech_stack:
  added: []
  patterns: [custom-hook-extraction, JSX-orchestrator-page]
key_files:
  created:
    - src/hooks/useDashboard.js
  modified:
    - src/pages/DashboardPage.jsx
    - src/tests/useDashboard.test.jsx
decisions:
  - "setShowAlertPopup no se expone en el return del hook — onStudentClick en AlertList usa handleAlertClose() en su lugar (funcion semantica equivalente)"
  - "useDashboard.js tiene 189 lineas (estimado era 100-160) por el JSDoc completo de 31 lineas — bajo el limite de 250 de CLAUDE.md"
metrics:
  duration_seconds: 224
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 3
---

# Phase 03 Plan 01: useDashboard Hook Extraction Summary

**One-liner:** Extraccion del hook useDashboard.js con 7 useState + 5 useCallback + 5 useMemo desde DashboardPage, reduciendo la page de 247 a 127 lineas como puro JSX orquestador.

## What Was Built

### src/hooks/useDashboard.js (nuevo, 189 lineas)

Hook custom que encapsula toda la logica de datos/estado/handlers del Dashboard CEO:

- Consume `useConvocatorias()` internamente (sin duplicar su logica)
- Consume `useDebounce(searchQuery, 300)` para busqueda debounced
- 7 `useState`: teachers, loading, error, expandedTeacher, searchQuery, selectedStudent, showAlertPopup
- 5 `useCallback`: handleAlertClick, handleAlertClose, handleStudentClose, handleClear, handleTeacherToggle
- `loadConvData` async local (no useCallback — solo llamada por useEffect y handleConvChange)
- `useEffect` reactivo sobre [convsLoading, convsError, convocatoria] con patron cancelled flag
- `handleConvChange` async para cambio de convocatoria desde el selector
- 5 `useMemo`: totalStudents, globalAttendance, allStudents, alertStudents, searchResults
- JSDoc completo con @returns documentando las 22 keys del objeto de retorno

### src/pages/DashboardPage.jsx (refactorizado, 127 lineas)

Page como puro JSX orquestador:

- Un solo import del hook: `import useDashboard from '../hooks/useDashboard.js'`
- Mantiene solo `useNavigate` de React Router (logout inline)
- Destructura las 22 keys del return de useDashboard
- JSX identico al original — cero regresion visual o funcional

### src/tests/useDashboard.test.jsx (habilitado)

Tests del hook activados (estaban en `describe.skip` desde 03-00):
- Test: retorna el objeto con las 22 keys esperadas
- Test: loading inicia como true
- Test: searchQuery inicia como string vacio

## Verification Results

| Check | Result |
|-------|--------|
| DashboardPage lineas | 127 (< 150 criterio, < 250 CLAUDE.md) |
| useDashboard lineas | 189 (< 250 CLAUDE.md) |
| DashboardPage sin useState/useMemo/useEffect/useCallback | Confirmado |
| useDashboard sin useNavigate | Confirmado |
| npm run lint (archivos propios) | 0 errores |
| npm test (useDashboard) | 3/3 verde |
| npm test (todos) | 199/199 verde |
| npm run build | Exitoso (DashboardPage-DPIwCUZ_.js: 21.98 kB) |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | dec7d5d | feat(03-01): crear hook useDashboard con logica extraida de DashboardPage |
| Task 2 | d334e0c | refactor(03-01): DashboardPage como puro JSX orquestador via useDashboard |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] setShowAlertPopup no disponible en DashboardPage post-refactor**
- **Found during:** Task 2, verificacion lint
- **Issue:** El JSX original usaba `setShowAlertPopup(false)` directamente en `AlertList.onStudentClick`, pero el hook no expone `setShowAlertPopup` en su return (expone `handleAlertClose` como wrapper semantico)
- **Fix:** Reemplazado `setShowAlertPopup(false)` por `handleAlertClose()` — comportamiento identico, API correcta del hook
- **Files modified:** src/pages/DashboardPage.jsx (linea 121)
- **Commit:** d334e0c

### Out of Scope (deferred)

- `src/tests/useFocusTrap.test.jsx`: tiene import `useEffect` no utilizado (error lint `no-unused-vars`). Es un artefacto del plan 03-00 (otro agente), fuera del alcance de este plan. Registrado en deferred-items.

## Known Stubs

None — todos los datos fluyen correctamente desde la API o mock data via useDashboard → DashboardPage.

## Self-Check: PASSED

- [x] `src/hooks/useDashboard.js` existe (189 lineas)
- [x] `src/pages/DashboardPage.jsx` modificado (127 lineas)
- [x] Commit dec7d5d existe
- [x] Commit d334e0c existe
- [x] 199 tests en verde
- [x] Build exitoso
