# Phase 3: Arquitectura y Accesibilidad - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactorizar DashboardPage extrayendo toda la logica a un hook useDashboard (cumplir CLAUDE.md y el Success Criteria de logica separada), y hacer el Modal accesible con focus trap + Escape + ARIA minimo. No se tocan otros componentes, no se agrega accesibilidad a TeacherCard (A11Y-01 diferido), no se toca backend.

</domain>

<decisions>
## Implementation Decisions

### Refactor DashboardPage (ARCH-01)
- **D-01:** Extraer **todo** el estado, fetching, callbacks de UI y datos derivados a un hook `useDashboard.js` en `src/hooks/`. Incluye: los 8 useState, loadConvData, handleConvChange, el useEffect de carga reactiva, los 5 useMemo (totalStudents, globalAttendance, allStudents, alertStudents, searchResults), y los 5 useCallback (handleAlertClick, handleAlertClose, handleStudentClose, handleClear, handleTeacherToggle).
- **D-02:** DashboardPage queda como **puro JSX orquestador** (~100 lineas). Solo importa useDashboard, destructura lo que necesita, y renderiza. Cero logica de negocio en la page.
- **D-03:** **No se extraen subcomponentes** del JSX de DashboardPage. Solo el hook. El JSX restante (~100 lineas) esta bien bajo el limite de 250.

### Focus Trap Modal (ARCH-02)
- **D-04:** Implementacion via **hook custom `useFocusTrap`** en `src/hooks/`. Cero dependencias externas — evita el issue documentado de focus-trap-react con VoiceOver en iOS Safari.
- **D-05:** El hook maneja: Tab/Shift+Tab atrapado entre elementos focusables, Escape cierra el modal, y **foco inicial al primer elemento focusable** (primer boton/link). Si no hay elementos focusables, el foco va al contenedor del modal.
- **D-06:** Modal consume useFocusTrap via ref. La logica de focus trap es interna al Modal — los consumidores (AlertList, StudentDetailPopup) no necesitan cambiar su implementacion del trap.

### ARIA Modal
- **D-07:** Agregar atributos ARIA minimos al Modal: `role="dialog"`, `aria-modal="true"`, y `aria-label` via nueva prop `ariaLabel` (string).
- **D-08:** Los consumidores del Modal (AlertList, StudentDetailPopup) pasan un label descriptivo — ej: `ariaLabel="Lista de alertas"`, `ariaLabel="Detalle del alumno"`.

### Claude's Discretion
- Estructura interna de useDashboard (orden de hooks, nombres de variables internas) — Claude organiza segun best practices de React hooks.
- Implementacion exacta del ciclo Tab en useFocusTrap (querySelectorAll de focusables) — Claude decide la lista de selectores.
- El eslint-disable en la linea 89 de DashboardPage se mantiene o resuelve segun criterio de Claude al mover la logica al hook.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Informes de auditoria
- `docs/auditoria/06-score-calidad.md` — Score de calidad actual, desglose de accesibilidad (5.0/10)

### Codebase maps
- `.planning/codebase/CONVENTIONS.md` — Patron de hooks custom, naming, import conventions
- `.planning/codebase/CONCERNS.md` — ESLint dependency array suppressions en DashboardPage y useStudents
- `.planning/codebase/ARCHITECTURE.md` — Capas del sistema (pages, hooks, ui, features)

### Phase contexts previos
- `.planning/phases/02-rendimiento-y-bundle/02-CONTEXT.md` — useDebounce y DashboardSkeleton ya extraidos (D-08, D-06/D-07)

### Archivos directamente afectados
- `src/pages/DashboardPage.jsx` — Archivo a refactorizar (247 lineas actuales)
- `src/components/ui/Modal.jsx` — Agregar focus trap + Escape + ARIA (33 lineas actuales)
- `src/components/features/AlertList.jsx` — Consumidor de Modal, pasar ariaLabel
- `src/components/features/StudentDetailPopup.jsx` — Consumidor de Modal, pasar ariaLabel
- `src/hooks/useConvocatorias.js` — Hook existente consumido por DashboardPage (referencia para patron)
- `src/hooks/useStudents.js` — Hook existente (referencia para patron de cache + fetching)
- `src/hooks/useDebounce.js` — Hook extraido en Phase 2 (ya importado por DashboardPage)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useConvocatorias.js` — Hook custom con patron fetch + state + reload. Referencia para la estructura de useDashboard.
- `src/hooks/useStudents.js` — Hook con cache via useRef + prefetch. Patron de retorno con loading/error/data.
- `src/hooks/useDebounce.js` — Hook simple ya importado por DashboardPage. Se mantiene como dependencia de useDashboard.
- `src/components/features/DashboardSkeleton.jsx` — Skeleton loading ya extraido en Phase 2.
- `src/utils/buildTeachersHierarchy.js` — Utilidad pura consumida por loadConvData.

### Established Patterns
- Hooks retornan objeto con datos + estado + handlers: `{ data, loading, error, reload }` (useConvocatorias)
- Cleanup con flag `cancelled` en useEffect para async (patron en useStudents, DashboardPage)
- useCallback para handlers pasados a componentes memorizados (StudentRow, TeacherCard, StatCard con React.memo)
- Componentes ui/ son puros: props in, JSX out, sin efectos

### Integration Points
- `src/pages/DashboardPage.jsx` — Reemplazar logica interna por import de useDashboard
- `src/components/ui/Modal.jsx` — Agregar useFocusTrap + ARIA props, mantener API existente compatible
- `src/components/features/AlertList.jsx` — Agregar prop ariaLabel al <Modal>
- `src/components/features/StudentDetailPopup.jsx` — Agregar prop ariaLabel al <Modal>

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for internal hook structure and focus trap implementation details.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-arquitectura-y-accesibilidad*
*Context gathered: 2026-03-31*
