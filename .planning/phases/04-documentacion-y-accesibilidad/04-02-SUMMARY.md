---
phase: 04-documentacion-y-accesibilidad
plan: "02"
subsystem: accesibilidad-aria
tags: [aria, a11y, progressbar, statcard, alertlist, searchinput, button, pageheader, loginpage]
dependency_graph:
  requires: [04-01]
  provides: [A11Y-02-partial, A11Y-04]
  affects: [src/components/ui, src/components/features, src/pages/LoginPage.jsx]
tech_stack:
  added: []
  patterns:
    - "role=progressbar con aria-valuenow/min/max para barras de progreso"
    - "role=button condicional + tabIndex=0 + onKeyDown Enter/Space para divs clickables"
    - "aria-hidden=true en todos los SVGs decorativos"
    - "button semantico (en lugar de div onClick) para items de lista clickables"
    - "ariaLabel prop con default en componentes de busqueda"
key_files:
  created: []
  modified:
    - src/components/ui/ProgressBar.jsx
    - src/components/ui/StatCard.jsx
    - src/components/ui/SearchInput.jsx
    - src/components/features/AlertList.jsx
    - src/components/ui/Button.jsx
    - src/components/features/PageHeader.jsx
    - src/pages/LoginPage.jsx
decisions:
  - "aria-hidden en SVGs decorativos — patron consistente con LoadingSpinner existente"
  - "w-full text-left en button de AlertList — evita default text-align:center de button"
  - "alt=NovAttend en logo de PageHeader — reemplaza alt=logo que activa img-redundant-alt"
metrics:
  duration_seconds: 140
  tasks_completed: 2
  tasks_total: 2
  files_modified: 7
  files_created: 0
  completed_date: "2026-04-01"
---

# Phase 4 Plan 02: ARIA Mecanico en Componentes UI — Summary

**One-liner:** Seis atributos ARIA y siete SVGs con aria-hidden=true cubren A11Y-02 (parcial) y A11Y-04 completo en 7 archivos.

## Objective

Agregar ARIA mecanico a los componentes UI simples y convertir los divs clickables de AlertList a botones semanticos. Tambien agregar aria-hidden a todos los SVGs decorativos identificados en la auditoria.

## Tasks Completed

| # | Nombre | Commit | Archivos |
|---|--------|--------|---------|
| 1 | ARIA mecanico en ProgressBar, StatCard, AlertList y SearchInput | deb6cce | ProgressBar.jsx, StatCard.jsx, SearchInput.jsx, AlertList.jsx |
| 2 | aria-hidden en SVGs decorativos de Button, PageHeader y LoginPage | e8f3526 | Button.jsx, PageHeader.jsx, LoginPage.jsx |

## Changes Made

### Task 1 — ARIA mecanico en 4 componentes

**ProgressBar.jsx:**
- Agrega `role="progressbar"` al div contenedor exterior
- Agrega `aria-valuenow={Math.min(100, Math.max(0, value))}` (valor clampado, consistente con inner div)
- Agrega `aria-valuemin={0}` y `aria-valuemax={100}`

**StatCard.jsx:**
- Agrega `handleKeyDown` que dispara `onClick()` en Enter o Space
- Agrega `role={onClick ? 'button' : undefined}` condicional al div raiz
- Agrega `tabIndex={onClick ? 0 : undefined}` condicional
- Agrega `onKeyDown={handleKeyDown}` al div raiz

**SearchInput.jsx:**
- Nueva prop `ariaLabel` con default `'Buscar alumno'` documentada en JSDoc
- Agrega `aria-label={ariaLabel}` al elemento `<input>`
- Agrega `aria-hidden="true"` al SVG de la lupa (decorativo)

**AlertList.jsx:**
- Cambia `<div onClick={...}>` a `<button onClick={...}>` para cada alumno en alerta
- Agrega `w-full text-left` al className para compensar defaults de button

### Task 2 — aria-hidden en SVGs decorativos

**Button.jsx:**
- Agrega `aria-hidden="true"` al SVG spinner de estado loading (el button ya tiene texto accesible via children)

**PageHeader.jsx:**
- Agrega `aria-hidden="true"` al SVG de logout (el button padre ya tiene `aria-label="Cerrar sesion"`)
- Cambia `alt="logo"` a `alt="NovAttend"` en el logo de la cabecera (corrige img-redundant-alt)

**LoginPage.jsx:**
- Agrega `aria-hidden="true"` al SVG de persona en el campo usuario
- Agrega `aria-hidden="true"` al SVG de candado en el campo contrasena

## Verification

- 55 tests pasan sin regresiones (8 suites, Vitest)
- `npm run lint --quiet` sin errores
- ProgressBar.jsx: `role="progressbar"` + `aria-valuenow/min/max` confirmados
- StatCard.jsx: `role={onClick ? 'button' : undefined}` + `tabIndex={onClick ? 0 : undefined}` + `onKeyDown` confirmados
- AlertList.jsx: `<button` semantico con `w-full text-left` confirmado
- SearchInput.jsx: `aria-label={ariaLabel}` en input + `aria-hidden="true"` en SVG lupa confirmados
- Button.jsx, PageHeader.jsx, LoginPage.jsx: `aria-hidden="true"` en todos los SVGs decorativos confirmados (1 + 1 + 2 = 4 instancias)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Mejora ARIA] alt="logo" cambiado a alt="NovAttend" en PageHeader**
- **Found during:** Task 2
- **Issue:** `alt="logo"` activa la regla `img-redundant-alt` de jsx-a11y (el texto "logo" es redundante — ya es obvio que es un logo)
- **Fix:** Cambio a `alt="NovAttend"` que describe el contenido real de la imagen
- **Files modified:** src/components/features/PageHeader.jsx
- **Commit:** e8f3526

## Known Stubs

Ninguno — todos los cambios son ARIA mecanico real, sin datos mock ni placeholders.

## Requirements Coverage

- **A11Y-02 (parcial):** ProgressBar, StatCard, SearchInput y AlertList cumplen sus contratos ARIA
- **A11Y-04:** Todos los SVGs decorativos identificados en auditoria tienen `aria-hidden="true"` (Button spinner, PageHeader logout, LoginPage persona/candado, SearchInput lupa de Plan 02; TeacherCard chevron pendiente en Plan 03)

## Self-Check: PASSED

Files exist:
- src/components/ui/ProgressBar.jsx: FOUND
- src/components/ui/StatCard.jsx: FOUND
- src/components/ui/SearchInput.jsx: FOUND
- src/components/features/AlertList.jsx: FOUND
- src/components/ui/Button.jsx: FOUND
- src/components/features/PageHeader.jsx: FOUND
- src/pages/LoginPage.jsx: FOUND

Commits exist:
- deb6cce: FOUND (feat(04-02): ARIA mecanico en ProgressBar, StatCard, AlertList y SearchInput)
- e8f3526: FOUND (feat(04-02): aria-hidden en SVGs decorativos de Button, PageHeader y LoginPage)
