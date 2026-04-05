---
phase: 05-cobertura-de-tests
plan: "02"
subsystem: tests
tags: [aria, accessibility, testing, vitest, testing-library]
dependency_graph:
  requires: []
  provides: [GroupTabs-aria-tests, TeacherCard-aria-tests]
  affects: [src/tests/GroupTabs.test.jsx, src/tests/TeacherCard.test.jsx]
tech_stack:
  added: []
  patterns: [WAI-ARIA Tabs regression tests, role=button keyboard interaction tests, userEvent.setup() pattern, toHaveAttribute ARIA string assertions, rerender for prop change verification]
key_files:
  created:
    - src/tests/GroupTabs.test.jsx
    - src/tests/TeacherCard.test.jsx
  modified: []
decisions:
  - "Groups prop son strings ('G1','G2','G3','G4') no numeros — confirmado leyendo AttendancePage.jsx y uso en componente"
  - "Cero dependencias A11Y externas — tests usan getByRole/toHaveAttribute nativos de @testing-library/react"
metrics:
  duration: "106s"
  completed: "2026-04-05T17:08:43Z"
  tasks_completed: 2
  files_created: 2
---

# Phase 05 Plan 02: Tests ARIA de GroupTabs y TeacherCard Summary

Tests ARIA manuales que protegen los contratos de accesibilidad WAI-ARIA implementados en Phase 4 para GroupTabs (tablist pattern) y TeacherCard (role=button expandible con teclado).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Tests ARIA de GroupTabs (WAI-ARIA Tabs) | 75a63eb | src/tests/GroupTabs.test.jsx (+65 lines) |
| 2 | Tests ARIA de TeacherCard (role=button expandible) | 69ba79f | src/tests/TeacherCard.test.jsx (+143 lines) |

## What Was Built

### GroupTabs.test.jsx (7 tests)

Protege el patron WAI-ARIA Tabs contra regresiones:

1. `tiene role=tablist con aria-label Grupos` — verifica `getByRole('tablist', { name: 'Grupos' })`
2. `tab activo tiene aria-selected=true y los demas false` — aserciones string `'true'`/`'false'`
3. `tab activo tiene tabIndex=0 y los demas tabIndex=-1` — aserciones string `'0'`/`'-1'`
4. `ArrowRight llama onChange con el siguiente grupo` — userEvent.keyboard
5. `ArrowRight desde el ultimo grupo hace wrap al primero (circular)` — G4 -> G1
6. `ArrowLeft llama onChange con el grupo anterior` — G3 -> G2
7. `click en un tab llama onChange con ese grupo` — click directo

### TeacherCard.test.jsx (8 tests)

Protege el contrato role=button con teclado:

1. `renderiza role=button en la cabecera del profesor` — getByRole
2. `aria-expanded=false cuando isExpanded es false` — string `'false'`
3. `aria-expanded cambia a true cuando isExpanded es true (via rerender)` — rerender pattern
4. `muestra el nombre del profesor y porcentaje de asistencia` — datos renderizados
5. `Enter en el button llama onToggle` — keyboard interaction
6. `Space en el button llama onToggle` — keyboard interaction
7. `Escape cuando isExpanded=true llama onToggle` — condicional activado
8. `Escape cuando isExpanded=false NO llama onToggle` — condicional no activado

## Verification

- `npx vitest run src/tests/GroupTabs.test.jsx` — 7/7 passed
- `npx vitest run src/tests/TeacherCard.test.jsx` — 8/8 passed
- `npm test` — 222 tests total, todos pasando (incluyendo los 15 nuevos de este plan)
- Cero dependencias A11Y externas instaladas (cumple D-02)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — los tests son aserciones directas contra la implementacion real, sin stubs ni mocks de componentes.

## Self-Check: PASSED

- `src/tests/GroupTabs.test.jsx` — FOUND
- `src/tests/TeacherCard.test.jsx` — FOUND
- Commit `75a63eb` — FOUND
- Commit `69ba79f` — FOUND
