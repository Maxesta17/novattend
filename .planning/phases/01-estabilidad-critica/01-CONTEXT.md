# Phase 1: Estabilidad Critica - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Corregir bugs de PWA, API y UX que hacen la app no-confiable en produccion. La app debe funcionar offline (PWA real), mostrar errores visibles al usuario, y cumplir con las reglas de CLAUDE.md (cero hex hardcodeados, lint limpio). No se tocan rendimiento, arquitectura ni backend.

</domain>

<decisions>
## Implementation Decisions

### Feedback de errores (ERR-02)
- **D-01:** Usar patron **banner inline** para errores. Un banner rojo (bg-error-soft, text-error) aparece dentro de la pagina, arriba del contenido o junto al boton de guardar. Desaparece al reintentar la accion.
- **D-02:** Crear componente reutilizable **ErrorBanner.jsx** en `src/components/ui/`. Recibe `message` y `onDismiss` como props. Componente puro sin logica de negocio, siguiendo el patron existente de ui/.

### Pagina 404 (ERR-04)
- **D-03:** Pagina 404 **branded minima** — fondo `bg-dark-bg`, heading "404" en `font-cinzel` + `text-gold`, mensaje "Pagina no encontrada" en `font-montserrat`, y un boton `bg-burgundy` que navega a `/` (login). Sin animaciones.

### Tokens deshabilitados (COMP-01)
- **D-04:** Crear token Tailwind `disabled` con valor `#CCCCCC` en `tailwind.config.js` bajo `extend.colors`. Reemplazar `bg-[#CCCCCC]` en Button.jsx y `bg-[#CDCDCD]` en ToggleSwitch.jsx por `bg-disabled`. Nombre semantico que indica para que se usa.

### Claude's Discretion
- Fixes mecanicos (PWA-01, PWA-02, PWA-03, ERR-01, ERR-03, COMP-02, COMP-03) tienen implementacion obvia — Claude ejecuta sin necesidad de consultar.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Informes de auditoria
- `docs/auditoria/01-errores-codigo.md` — Lista detallada de bugs y errores silenciosos en el codigo
- `docs/auditoria/04-pwa-offline.md` — Analisis de la configuracion PWA y problemas de offline
- `docs/auditoria/06-score-calidad.md` — Score de calidad actual (7.3/10) y desglose por area

### Codebase maps
- `.planning/codebase/CONCERNS.md` — Tech debt, silent error swallowing, hardcoded hex locations
- `.planning/codebase/STACK.md` — PWA config details (navigateFallback, workbox runtime caching regex)
- `.planning/codebase/CONVENTIONS.md` — Patron de componentes ui/, variant pattern, error handling patterns

### Archivos directamente afectados
- `vite.config.js` — PWA config (navigateFallback, runtimeCaching urlPattern)
- `src/services/api.js` — Funciones apiGet/apiPost donde falta res.ok check
- `src/pages/AttendancePage.jsx` — Silent catch blocks, integracion de ErrorBanner
- `src/pages/SavedPage.jsx` — Bug present===0
- `src/components/ui/Button.jsx` — Hex hardcodeado bg-[#CCCCCC]
- `src/components/ui/ToggleSwitch.jsx` — Hex hardcodeado bg-[#CDCDCD]
- `tailwind.config.js` — Agregar token 'disabled'
- `index.html` — lang="es" + metadata PWA

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/` tiene 8 componentes atomicos (Button, StatCard, Avatar, Badge, Modal, ProgressBar, ToggleSwitch, SearchInput) — ErrorBanner seguira el mismo patron
- `src/components/ErrorBoundary.jsx` ya existe como class component para errores de render — ErrorBanner es complementario para errores de API
- `src/services/api.js` tiene funciones `apiGet`/`apiPost` centralizadas — el fix de res.ok se aplica una vez y protege todos los endpoints

### Established Patterns
- Error state via `useState`: `const [error, setError] = useState(null)` — patron ya usado en hooks
- Cleanup con flag `cancelled` en useEffect — patron existente para async operations
- Variant pattern con map de clases Tailwind — aplicable a ErrorBanner si necesita variantes
- Componentes ui/ son puros: props in, JSX out, sin efectos secundarios

### Integration Points
- `src/App.jsx` — Agregar ruta catch-all `*` para NotFoundPage
- `src/pages/AttendancePage.jsx` — Integrar ErrorBanner donde actualmente hay catch vacios
- `tailwind.config.js` extend.colors — Agregar token 'disabled'

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for all mechanical fixes (PWA-01..03, ERR-01, ERR-03, COMP-02, COMP-03).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-estabilidad-critica*
*Context gathered: 2026-03-30*
