# Phase 5: Cobertura de Tests - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

La cobertura de tests llega y permanece en >= 60% con thresholds enforzados automaticamente, con tests que verifican los contratos ARIA establecidos en Phase 4. Infraestructura de cobertura V8 instalada y script dedicado en package.json.

</domain>

<decisions>
## Implementation Decisions

### Aserciones ARIA
- **D-01:** Usar **aserciones manuales** para verificar contratos ARIA de Phase 4: `getByRole`, `toHaveAttribute('aria-expanded')`, `toHaveAttribute('aria-selected')`, etc.
- **D-02:** **No instalar jest-axe** ni axe-core. Cero dependencias nuevas de testing A11Y. El codebase ya tiene el patron con Testing Library queries.

### Estrategia de prioridad
- **D-03:** Priorizar **flujos criticos** para maximizar cobertura y valor: AttendancePage, DashboardPage, useStudents, buildTeachersHierarchy, TeacherCard, GroupTabs.
- **D-04:** Componentes simples (Avatar, ProgressBar, ToggleSwitch, SearchInput) solo se testean si falta cobertura para llegar al 60% despues de cubrir los criticos.

### Mock en paginas complejas
- **D-05:** Mock a nivel de **servicio API** (`getAlumnos`, `getResumen`, `getConvocatorias`, etc.). Los hooks reales (`useStudents`, `useDashboard`, `useConvocatorias`) se ejecutan con datos mock — verifica integracion hook-to-page.
- **D-06:** Seguir el **patron existente** de LoginPage.test.jsx y api.test.jsx para mocking de modulos y fetch.

### Script de cobertura
- **D-07:** Agregar script dedicado `"test:coverage": "vitest run --coverage"` en package.json. `npm test` sigue rapido sin overhead de cobertura.
- **D-08:** Thresholds de 60% enforzados en `vite.config.js` bajo `test.coverage.thresholds` — el script falla automaticamente si baja del umbral.

### Claude's Discretion
- Orden exacto de escritura de test files dentro de la estrategia "criticos primero"
- Datos mock especificos para cada test suite (convocatorias, alumnos, asistencia)
- Cuantos tests por suite (mientras cubran los flujos relevantes)
- Si incluir componentes simples depende del % de cobertura tras cubrir criticos

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Contratos ARIA (Phase 4)
- `.planning/phases/04-documentacion-y-accesibilidad/04-CONTEXT.md` — Decisiones D-01..D-10: WAI-ARIA Tabs en GroupTabs, role="button" en TeacherCard, progressbar en ProgressBar, focus-visible global, etc.

### Infraestructura de testing
- `.planning/codebase/TESTING.md` — Patrones completos de testing: mocking, router testing, async patterns, boilerplate, gaps de cobertura actuales
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, import organization, component patterns

### Archivos a testear (prioridad alta)
- `src/pages/AttendancePage.jsx` — Pagina principal del teacher, usa useStudents hook
- `src/pages/DashboardPage.jsx` — Vista CEO, usa useDashboard + useConvocatorias
- `src/hooks/useStudents.js` — Hook con cache por grupo + prefetch
- `src/utils/buildTeachersHierarchy.js` — Transformacion plana a arbol teacher->group->students
- `src/components/features/TeacherCard.jsx` — Aserciones ARIA: role="button", aria-expanded, keyboard
- `src/components/features/GroupTabs.jsx` — Aserciones ARIA: tablist/tab/tabpanel, aria-selected, arrow keys

### Tests existentes como referencia de patron
- `src/tests/LoginPage.test.jsx` — Patron de mock de servicios API + MemoryRouter + async waitFor
- `src/tests/api.test.jsx` — Patron de mock de global.fetch para servicio API
- `src/tests/StudentRow.test.jsx` — Patron de test de feature component con ARIA assertions

### Requirements
- `.planning/REQUIREMENTS.md` — TEST-01..TEST-05: cobertura V8, thresholds 60%, tests ARIA, tests unitarios hooks

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/tests/setup.js` — Setup file con @testing-library/jest-dom, ya configurado en vite.config.js
- 16 test suites existentes con 89 tests — patron bien establecido
- `@testing-library/user-event` — Instalado, usado para simular interaccion keyboard (necesario para tests ARIA de GroupTabs y TeacherCard)

### Established Patterns
- Tests centralizados en `src/tests/{ComponentName}.test.jsx`
- Descripciones en espanol: `'renderiza correctamente'`, `'navega al hacer click'`
- Mock de react-router-dom con `vi.mock()` + `vi.importActual()` para preservar MemoryRouter
- Mock de servicios con `vi.mock('../services/api', () => ({...}))`
- `beforeEach` con `sessionStorage.clear()` y `vi.clearAllMocks()`
- `waitFor` para async assertions

### Integration Points
- `vite.config.js` — Agregar `test.coverage` con provider 'v8' y thresholds
- `package.json` — Agregar devDependency `@vitest/coverage-v8` (misma version que vitest: ^4.0.18) + script `test:coverage`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following existing codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-cobertura-de-tests*
*Context gathered: 2026-04-05*
