---
phase: 04-documentacion-y-accesibilidad
plan: 01
subsystem: accesibilidad + documentacion
tags: [a11y, jsdoc, eslint, focus-ring, css]
dependency_graph:
  requires: []
  provides: [focus-ring-global, eslint-jsx-a11y, eslint-jsdoc, jsdoc-pages]
  affects: [Plan 02 (ARIA mecanico), Plan 03 (TeacherCard keyboard)]
tech_stack:
  added: [eslint-plugin-jsx-a11y@6.10.2, eslint-plugin-jsdoc@62.9.0]
  patterns: [CSS @layer base :focus-visible, JSDoc @returns]
key_files:
  created: []
  modified:
    - src/index.css
    - src/components/ui/ToggleSwitch.jsx
    - eslint.config.js
    - package.json
    - src/pages/AttendancePage.jsx
    - src/pages/DashboardPage.jsx
    - src/pages/LoginPage.jsx
    - src/pages/SavedPage.jsx
decisions:
  - "#800000 en CSS puro (@layer base) es aceptable por CLAUDE.md — no es un token Tailwind ad-hoc sino CSS base estandar (per D-07)"
  - "publicOnly:true en jsdoc/require-jsdoc exime helpers privados como GroupSection, LoginInput, ChevronIcon"
  - "ArrowFunctionExpression:false evita warnings en arrow exports de utilities"
  - "Errores jsx-a11y en TeacherCard/Modal/StatCard/DashboardPage son esperados y se resuelven en Plan 02 y 03"
metrics:
  duration: "3m 8s"
  completed: "2026-04-01"
  tasks_completed: 3
  files_modified: 8
requirements_covered: [A11Y-03, DOCS-01, DOCS-02]
---

# Phase 04 Plan 01: Infraestructura Base A11Y y Documentacion

Focus ring burgundy global via CSS :focus-visible + eslint-plugin-jsx-a11y/jsdoc configurados + JSDoc en las 4 pages faltantes.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Focus ring global + limpiar ToggleSwitch | 71e480a | src/index.css, src/components/ui/ToggleSwitch.jsx |
| 2 | Instalar ESLint plugins + configurar eslint.config.js | 8349880 | eslint.config.js, package.json, package-lock.json |
| 3 | JSDoc en las 4 pages restantes | 9bdba70 | src/pages/AttendancePage.jsx, DashboardPage.jsx, LoginPage.jsx, SavedPage.jsx |

## What Was Built

### Task 1: Focus Ring Global

Agrega `@layer base { :focus-visible { outline: 2px solid #800000; outline-offset: 2px; } }` en `src/index.css`. Aplica a todos los elementos interactivos de la app sin necesidad de clases individuales. Elimina las clases `focus-visible:outline-*` custom de `ToggleSwitch.jsx` que eran redundantes — el ring global produce output visual identico.

### Task 2: ESLint Plugins

Instala `eslint-plugin-jsx-a11y@6.10.2` y `eslint-plugin-jsdoc@62.9.0`. Reconfigura `eslint.config.js` con:
- `jsxA11y.flatConfigs.recommended` en el array `extends` (flat config ESLint 9 correcto)
- Plugin `jsdoc` con regla `jsdoc/require-jsdoc` (warn, publicOnly:true, FunctionDeclaration:true)

El lint reporta 38 errores jsx-a11y en archivos existentes (TeacherCard, Modal, StatCard, DashboardPage) que se resolveran en Planes 02 y 03 — esto es comportamiento esperado documentado en el plan.

### Task 3: JSDoc en las 4 Pages

Agrega cabecera JSDoc con descripcion en espanol y `@returns {JSX.Element}` antes de `export default function` en AttendancePage, DashboardPage, LoginPage y SavedPage. DOCS-01 queda 100% cubierto: las 5 pages + 7 componentes ui/features ya documentados + hooks useStudents/useConvocatorias + utils buildTeachersHierarchy.

## Success Criteria Verification

- [x] Focus ring burgundy visible al navegar con Tab en todos los elementos interactivos
- [x] eslint-plugin-jsx-a11y y eslint-plugin-jsdoc instalados y configurados
- [x] jsdoc/require-jsdoc con publicOnly:true y FunctionDeclaration:true
- [x] Las 4 pages sin JSDoc ahora tienen cabecera completa
- [x] npm test pasa: 144 tests, 24 suites, 0 failures
- [x] DOCS-01 completamente cubierto

## Deviations from Plan

None — plan ejecutado exactamente como estaba escrito.

## Known Stubs

None — no hay valores hardcoded que fluyan a UI ni placeholders.

## Self-Check: PASSED

- src/index.css: contiene `outline: 2px solid #800000;` - FOUND
- src/index.css: contiene `outline-offset: 2px;` - FOUND
- src/index.css: contiene `@layer base` - FOUND
- src/components/ui/ToggleSwitch.jsx: NO contiene `focus-visible:outline` - CONFIRMED
- eslint.config.js: contiene `jsxA11y.flatConfigs.recommended` - FOUND
- eslint.config.js: contiene `jsdoc/require-jsdoc` - FOUND
- 4 pages: contienen `@returns {JSX.Element}` - ALL FOUND (4/4)
- git log: commits 71e480a, 8349880, 9bdba70 - ALL FOUND
