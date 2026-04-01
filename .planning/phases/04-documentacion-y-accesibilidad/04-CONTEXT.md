# Phase 4: Documentacion y Accesibilidad - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Todos los componentes, hooks, pages y utils tienen JSDoc completo y todos los elementos interactivos cumplen WCAG 2.1 Nivel A (teclado, ARIA, focus-visible). Se instalan eslint-plugin-jsdoc y eslint-plugin-jsx-a11y para enforcement automatico.

</domain>

<decisions>
## Implementation Decisions

### Teclado en TeacherCard (A11Y-01)
- **D-01:** La cabecera entera de TeacherCard es un **solo tab stop** con `role="button"`. Enter/Space expande/colapsa, Escape colapsa.
- **D-02:** El contenido expandido (grupos, alumnos, stats) **NO es navegable por teclado** — es informacion visual del CEO, no elementos interactivos.
- **D-03:** El SVG chevron lleva `aria-hidden="true"` (decorativo). La cabecera lleva `aria-expanded="true/false"` para indicar estado al screen reader.

### Patron ARIA en GroupTabs (A11Y-02)
- **D-04:** Implementar **WAI-ARIA Tabs completo**: contenedor con `role="tablist"` + `aria-label="Grupos"`, cada boton con `role="tab"` + `aria-selected`.
- **D-05:** Navegacion por teclado: Arrow Left/Right mueve entre tabs, Tab sale del grupo de tabs. Solo el tab activo esta en el tab order (`tabIndex={0}`), los demas tienen `tabIndex={-1}`.
- **D-06:** El contenedor de alumnos lleva `role="tabpanel"` con `aria-labelledby` apuntando al tab activo.

### Focus ring global (A11Y-03)
- **D-07:** Ring global **burgundy** definido en `src/index.css` con `@layer base`: `outline: 2px solid #800000; outline-offset: 2px` en `:focus-visible`.
- **D-08:** **Eliminar** las clases `focus-visible:outline-*` custom de ToggleSwitch — todos los componentes usan el ring global. Cero duplicacion.

### ESLint plugins (DOCS-02, A11Y)
- **D-09:** `eslint-plugin-jsx-a11y` en modo **recommended** (preset por defecto). Suficiente para WCAG 2.1 Nivel A sin falsos positivos excesivos.
- **D-10:** `eslint-plugin-jsdoc` con solo la regla **require-jsdoc** (warn) en funciones exportadas. No validar formato interno de @param types. Cubre DOCS-01 sin ser ruidoso.

### Claude's Discretion
- ARIA mecanico en ProgressBar (`role="progressbar"`, `aria-valuenow/min/max`), AlertList (divs clickables a `<button>`), StatCard (`role="button"` condicional cuando tiene onClick), y SVGs decorativos (`aria-hidden="true"`) — implementacion obvia, Claude ejecuta sin consultar.
- JSDoc faltante en 4 pages (AttendancePage, DashboardPage, LoginPage, SavedPage) — Claude escribe las cabeceras siguiendo el patron existente del codebase.
- Orden de ejecucion de tareas dentro de la fase — Claude organiza segun dependencias naturales.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Informes de auditoria
- `docs/auditoria/06-score-calidad.md` — Desglose de accesibilidad (5.0/10), lista de gaps ARIA/keyboard
- `docs/auditoria/01-errores-codigo.md` — Errores de codigo que pueden afectar A11Y

### Codebase maps
- `.planning/codebase/CONVENTIONS.md` — Patron JSDoc existente, variant pattern, component patterns
- `.planning/codebase/STRUCTURE.md` — Ubicacion de todos los archivos a modificar
- `.planning/codebase/CONCERNS.md` — Tech debt que puede interactuar con cambios A11Y

### Phase contexts previos
- `.planning/phases/03-arquitectura-y-accesibilidad/03-CONTEXT.md` — Modal ya tiene focus trap + Escape + ARIA completo (D-04..D-08). useFocusTrap ya existe en `src/hooks/`.

### Archivos directamente afectados
- `src/components/features/TeacherCard.jsx` — Agregar keyboard handlers, role="button", aria-expanded, aria-hidden en SVG
- `src/components/features/GroupTabs.jsx` — Implementar WAI-ARIA Tabs (tablist/tab/tabpanel, arrow keys)
- `src/components/features/AlertList.jsx` — Cambiar divs clickables a `<button>`
- `src/components/ui/ProgressBar.jsx` — Agregar role="progressbar" + aria-value*
- `src/components/ui/StatCard.jsx` — role="button" condicional cuando onClick presente
- `src/components/ui/SearchInput.jsx` — aria-label en el input de busqueda
- `src/components/ui/ToggleSwitch.jsx` — Eliminar focus-visible custom (usar global)
- `src/index.css` — Agregar focus-visible ring global
- `eslint.config.js` — Agregar eslint-plugin-jsx-a11y (recommended) + eslint-plugin-jsdoc (require-jsdoc)
- `src/pages/AttendancePage.jsx` — Agregar cabecera JSDoc
- `src/pages/DashboardPage.jsx` — Agregar cabecera JSDoc
- `src/pages/LoginPage.jsx` — Agregar cabecera JSDoc
- `src/pages/SavedPage.jsx` — Agregar cabecera JSDoc
- SVGs decorativos en: Button.jsx, SearchInput.jsx, PageHeader.jsx, LoginPage.jsx — agregar aria-hidden="true"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useFocusTrap.js` — Hook de focus trap ya implementado en Phase 3. No se necesita para TeacherCard (no es modal), pero es referencia de patron keyboard.
- `src/components/ui/Modal.jsx` — Ya tiene ARIA completo (`role="dialog"`, `aria-modal`, `aria-label`). Patron de referencia para agregar ARIA a otros componentes.
- `src/components/ui/LoadingSpinner.jsx` — Ya tiene `aria-hidden="true"` en SVG. Patron a replicar en otros SVGs decorativos.
- `src/components/ui/ToggleSwitch.jsx` — Unico componente con focus-visible custom (a eliminar). Referencia del estilo visual que se globaliza.

### Established Patterns
- JSDoc con `@param {object} props` + sub-params — usado consistentemente en todos los ui/ y features/
- Componentes ui/ son puros: props in, JSX out — ARIA se agrega como atributos, sin logica extra
- Event handlers prefijados con `handle` — keyboard handlers seguiran `handleKeyDown`
- `aria-controls` omitido (decision Phase 3) — con renderizado condicional `&&`, `aria-expanded` solo es suficiente

### Integration Points
- `eslint.config.js` — Agregar 2 plugins nuevos al flat config existente
- `src/index.css` — Agregar `@layer base` con `:focus-visible` despues de los directives de Tailwind
- `package.json` — Agregar devDependencies: eslint-plugin-jsx-a11y, eslint-plugin-jsdoc

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for mechanical ARIA attributes, JSDoc content, and ESLint plugin configuration.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-documentacion-y-accesibilidad*
*Context gathered: 2026-04-01*
