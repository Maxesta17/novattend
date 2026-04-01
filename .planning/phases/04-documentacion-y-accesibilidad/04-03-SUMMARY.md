---
phase: 04-documentacion-y-accesibilidad
plan: "03"
subsystem: accesibilidad
tags: [a11y, aria, keyboard-navigation, wai-aria-tabs, wcag]
dependency_graph:
  requires: [04-01]
  provides: [WAI-ARIA Tabs en GroupTabs, tabpanel en AttendancePage, keyboard handler en TeacherCard]
  affects: [src/components/features/GroupTabs.jsx, src/pages/AttendancePage.jsx, src/components/features/TeacherCard.jsx]
tech_stack:
  added: []
  patterns: [WAI-ARIA Tabs pattern, role=button pattern, keyboard event delegation]
key_files:
  created: []
  modified:
    - src/components/features/GroupTabs.jsx
    - src/pages/AttendancePage.jsx
    - src/components/features/TeacherCard.jsx
decisions:
  - "eslint-disable omitido: jsx-a11y no instalado en este worktree — los divs clickables en GroupSection no generan errores en la config actual. Documentado con comentario D-02 como referencia de decision."
metrics:
  duration: "~10 min"
  completed: "2026-04-01T12:45:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 4 Plan 03: Accesibilidad por Teclado (WAI-ARIA Tabs + TeacherCard) Summary

WAI-ARIA Tabs completo en GroupTabs con navegacion por flechas, tabpanel en AttendancePage, y keyboard handler Enter/Space/Escape en TeacherCard header.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | WAI-ARIA Tabs en GroupTabs + tabpanel en AttendancePage | 191f02a | GroupTabs.jsx, AttendancePage.jsx |
| 2 | Keyboard handler en TeacherCard + aria-hidden en ChevronIcon | 94cf175 | TeacherCard.jsx |

## What Was Built

### Task 1: WAI-ARIA Tabs en GroupTabs

Reescritura completa de `GroupTabs.jsx` con el patron WAI-ARIA Tabs:

- `role="tablist"` en el contenedor con `aria-label="Grupos"`
- `role="tab"` en cada boton con `aria-selected={selected === g}`
- `tabIndex`: solo el tab activo tiene `0`, los demas `-1` (Tab sale del grupo sin recorrer todos)
- `id="tab-grupo-{g}"` en cada tab para vincular con el tabpanel
- `handleKeyDown` con `useCallback`: ArrowRight/ArrowLeft con wrap circular + `tabRefs.current[nextGroup]?.focus()` para mover foco inmediato
- `e.preventDefault()` en arrow keys para evitar scroll horizontal

`AttendancePage.jsx`: el contenedor de la lista de alumnos ahora tiene `role="tabpanel"` y `aria-labelledby={\`tab-grupo-${selectedGroup}\`}` vinculado al tab activo.

### Task 2: Keyboard Handler en TeacherCard

El header div del profesor tiene ahora:
- `role="button"` — identifica el elemento como boton interactivo
- `tabIndex={0}` — navegable por Tab
- `aria-expanded={isExpanded}` — estado de expansion anunciado a lectores de pantalla
- `onKeyDown={handleKeyDown}` — Enter/Space activan toggle, Escape colapsa si esta expandido

`ChevronIcon` SVG tiene `aria-hidden="true"` — icono decorativo oculto a tecnologias asistivas.

Los divs clickables dentro de `GroupSection` (grupo y alumno) tienen un comentario `D-02` documentando la decision de no hacerlos navegables por teclado (contenido informativo del CEO).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] eslint-disable-next-line jsx-a11y causan errores en lugar de suprimirlos**
- **Found during:** Task 2 verification (npm run lint)
- **Issue:** El plugin `eslint-plugin-jsx-a11y` no esta instalado en este worktree/proyecto. Las directivas `eslint-disable-next-line jsx-a11y/...` generan errores "Definition for rule was not found" en lugar de suprimir warnings.
- **Fix:** Reemplazados los eslint-disable por comentarios de codigo normales que documentan la decision D-02. Para el div del grupo: comentario JSX `{/* D-02: ... */}`. Para el div del estudiante (dentro de .map()): comentario JS `// D-02: ...` antes del return.
- **Files modified:** `src/components/features/TeacherCard.jsx`
- **Commit:** 94cf175

## Acceptance Criteria Verification

- [x] GroupTabs.jsx contiene `role="tablist"`
- [x] GroupTabs.jsx contiene `aria-label="Grupos"`
- [x] GroupTabs.jsx contiene `role="tab"`
- [x] GroupTabs.jsx contiene `aria-selected={selected === g}`
- [x] GroupTabs.jsx contiene `tabIndex={selected === g ? 0 : -1}`
- [x] GroupTabs.jsx contiene `id={\`tab-grupo-${g}\`}`
- [x] GroupTabs.jsx contiene `import { useRef, useCallback } from 'react'`
- [x] GroupTabs.jsx contiene `ArrowRight` y `ArrowLeft` en el handler
- [x] GroupTabs.jsx contiene `.focus()` para mover foco al tab activo
- [x] AttendancePage.jsx contiene `role="tabpanel"`
- [x] AttendancePage.jsx contiene `aria-labelledby={\`tab-grupo-${selectedGroup}\`}`
- [x] TeacherCard.jsx contiene `role="button"` en el div de la cabecera
- [x] TeacherCard.jsx contiene `tabIndex={0}` en el div de la cabecera
- [x] TeacherCard.jsx contiene `aria-expanded={isExpanded}` en el div de la cabecera
- [x] TeacherCard.jsx contiene `onKeyDown={handleKeyDown}` en el div de la cabecera
- [x] TeacherCard.jsx contiene `const handleKeyDown = (e) =>` con Enter, Space y Escape
- [x] TeacherCard.jsx contiene `e.key === 'Escape' && isExpanded`
- [x] ChevronIcon SVG contiene `aria-hidden="true"`
- [x] npm test pasa: 55/55 tests, 8 suites, 0 failures
- [x] npm run lint pasa: 0 errores (1 warning pre-existente en DashboardPage.jsx no relacionado)

## Known Stubs

None — todos los cambios son funcionales con datos reales.
