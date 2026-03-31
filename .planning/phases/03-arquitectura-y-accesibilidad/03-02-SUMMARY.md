---
phase: 03-arquitectura-y-accesibilidad
plan: 02
subsystem: ui
tags: [react, hooks, accessibility, aria, focus-trap, modal, keyboard-navigation]

# Dependency graph
requires:
  - phase: 03-00
    provides: stubs de tests useFocusTrap y Modal ARIA creados con describe.skip
provides:
  - Hook custom useFocusTrap con Tab/Shift+Tab ciclico, Escape cierra, foco inicial y restauracion
  - Modal accesible con role=dialog, aria-modal, aria-label, y focus trap integrado
  - AlertList y StudentDetailPopup con ariaLabel descriptivo

affects: [03-03, cualquier plan que modifique Modal o agregue nuevos modales]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useFocusTrap: hook custom con useEffect + keydown listener + querySelectorAll para focus trap accesible"
    - "Modal ARIA: role=dialog + aria-modal=true + aria-label via prop + tabIndex=-1 en contenedor"
    - "Test de hook con componente auxiliar TrapContainer para adjuntar ref al DOM real"

key-files:
  created:
    - src/hooks/useFocusTrap.js
  modified:
    - src/components/ui/Modal.jsx
    - src/components/features/AlertList.jsx
    - src/components/features/StudentDetailPopup.jsx
    - src/tests/useFocusTrap.test.jsx

key-decisions:
  - "Hook custom useFocusTrap sin dependencias externas (D-04) — evita bugs de iOS VoiceOver de focus-trap-react"
  - "Re-query del DOM en cada keydown (focusableNow) — captura contenido dinamico de StudentDetailPopup"
  - "tabIndex={-1} en contenedor del Modal — garantiza foco programatico si no hay elementos focusables"
  - "Restauracion del foco al elemento previo al cerrar — mejora experiencia de teclado (3 lineas extra sobre D-05)"
  - "Test de hook via TrapContainer auxiliar — renderHook solo no puede adjuntar ref al DOM real"

patterns-established:
  - "useFocusTrap: useEffect con isOpen/onClose como deps, listener en document (no en contenedor), cleanup restaura foco"
  - "ARIA modal: role=dialog + aria-modal=true + aria-label en el contenedor interno (no en el overlay)"

requirements-completed: [ARCH-02]

# Metrics
duration: 15min
completed: 2026-03-31
---

# Phase 03 Plan 02: Focus Trap Modal Summary

**Hook custom useFocusTrap con Tab/Shift+Tab ciclico y Escape, integrado en Modal via ARIA role=dialog + aria-modal + aria-label**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-31T16:43:00Z
- **Completed:** 2026-03-31T16:58:36Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Hook `useFocusTrap.js` custom sin dependencias externas: Tab/Shift+Tab ciclicos, Escape cierra, foco inicial al primer elemento, restaura foco al cerrar
- Modal.jsx actualizado con `role="dialog"`, `aria-modal="true"`, `aria-label` via prop, `tabIndex={-1}`, y `ref={containerRef}`
- AlertList y StudentDetailPopup pasan `ariaLabel` descriptivo al Modal (D-08)
- Tests useFocusTrap (2) y Modal ARIA (5) habilitados y en verde — 199 tests totales pasando

## Task Commits

Cada tarea fue commiteada atomicamente:

1. **Task 1: Crear hook useFocusTrap.js** - `2773ed6` (feat)
2. **Task 2: Actualizar Modal con useFocusTrap + ARIA y consumidores** - `63889ab` (feat)

## Files Created/Modified

- `src/hooks/useFocusTrap.js` - Hook custom focus trap con Tab/Escape/restauracion (74 lineas)
- `src/components/ui/Modal.jsx` - Modal accesible con focus trap y ARIA (41 lineas)
- `src/components/features/AlertList.jsx` - Agrega ariaLabel="Lista de alumnos en alerta"
- `src/components/features/StudentDetailPopup.jsx` - Agrega ariaLabel="Detalle de asistencia del alumno"
- `src/tests/useFocusTrap.test.jsx` - Tests habilitados con componente TrapContainer auxiliar

## Decisions Made

- **D-04 cumplido:** Implementacion custom sin `focus-trap-react` — evita issue documentado con VoiceOver en iOS Safari
- **Restauracion de foco:** Implementada aunque D-05 no la exigia explicitamente — 3 lineas extra, mejora accesibilidad real
- **Re-query dinamico:** `focusableNow` se recalcula en cada keydown para capturar cambios en contenido de StudentDetailPopup (carga faltas async)
- **Test via TrapContainer:** `renderHook` solo no puede adjuntar `ref` al DOM real; se creo componente auxiliar `TrapContainer` para que el efecto se active correctamente

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test useFocusTrap original era incompatible con arquitectura del hook**
- **Found during:** Task 1 (verificacion post-creacion)
- **Issue:** El stub original usaba `renderHook` para un hook que requiere `ref` adjunto al DOM — la condicion `!containerRef.current` causaba que el useEffect no registrara el listener, haciendo el test del Escape fallar
- **Fix:** Se reemplazo el patron `renderHook` por un componente auxiliar `TrapContainer` que renderiza con el ref adjunto al DOM real. Ademas se elimino el import `useEffect` no usado que generaba error de lint
- **Files modified:** src/tests/useFocusTrap.test.jsx
- **Verification:** `npm test -- useFocusTrap` pasa 2/2, lint sin errores
- **Committed in:** `63889ab` (incluido en commit de Task 2 al limpiar lint)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug en test stub)
**Impact on plan:** Fix necesario para que los tests fueran ejecutables. Sin scope creep.

## Issues Encountered

- El test stub `useFocusTrap.test.jsx` de 03-00 usaba `renderHook` sin adjuntar el ref — comportamiento correcto del hook (guardia `!containerRef.current`) causaba que no se registrara el listener. Resuelto con componente auxiliar TrapContainer.

## User Setup Required

Ninguno — no se requiere configuracion externa.

## Next Phase Readiness

- ARCH-02 completado: Modal tiene focus trap operativo y ARIA correcto
- 199 tests en verde, build exitoso
- Listo para 03-03 (soporte de teclado en TeacherCard expandible) o cualquier plan restante de la fase

---
*Phase: 03-arquitectura-y-accesibilidad*
*Completed: 2026-03-31*
