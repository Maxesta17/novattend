# Phase 2: Rendimiento y Bundle - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Reducir el bundle inicial ~50% para teachers via code-splitting, hacer listas fluidas bajo carga con memoizacion, implementar debounce en busqueda, paralelizar API calls en Dashboard, y cambiar el Service Worker a registerType: prompt para evitar ChunkLoadError mid-session. No se toca arquitectura de componentes (Phase 3), ni backend, ni layout visual.

</domain>

<decisions>
## Implementation Decisions

### Service Worker Update (PWA-04)
- **D-01:** Cambiar `registerType` de `autoUpdate` a `prompt` en vite.config.js. Esto requiere UI que avise al usuario cuando hay una nueva version.
- **D-02:** El aviso de actualizacion es un **banner inferior persistente** — barra fija en la parte inferior de la pantalla con texto "Nueva version disponible" + boton "Actualizar". No bloquea la interaccion con la app.
- **D-03:** El banner es **persistente** — no tiene boton X, no se puede cerrar. Solo desaparece cuando el usuario pulsa "Actualizar". Garantiza que eventualmente actualice.
- **D-04:** PWA-04 debe desplegarse ANTES del code-splitting (PERF-01/PERF-04) para evitar ChunkLoadError cuando el SW se actualiza y los chunks viejos ya no existen. Orden critico.

### Suspense Fallback (PERF-01)
- **D-05:** Las 4 rutas post-login (ConvocatoriaPage, AttendancePage, SavedPage, DashboardPage) usan `React.lazy()` + `Suspense`. LoginPage se mantiene eagerly loaded (es la primera ruta, debe cargar inmediato). NotFoundPage tambien eager (es ligera).
- **D-06:** El fallback de Suspense es un **spinner branded** — circulo animado con colores burgundy/gold centrado en pantalla sobre `bg-dark-bg`, con texto "Cargando...".
- **D-07:** Crear componente **LoadingSpinner.jsx** en `src/components/ui/` — componente puro reutilizable, siguiendo el patron de ui/. Se usa en el Suspense fallback y donde se necesite.

### Debounce (PERF-03)
- **D-08:** El debounce en searchQuery del Dashboard es **silencioso** — sin indicador visual. 300ms es imperceptible; la lista se filtra directamente cuando el debounce dispara. Menos complejidad, mas limpio.

### Claude's Discretion
- Memoizacion (PERF-02): React.memo en StudentRow, TeacherCard, StatCard + useCallback en handlers. Implementacion mecanica.
- manualChunks (PERF-04): Separar vendor-react y vendor-router en Vite config. Implementacion mecanica.
- Promise.all (PERF-05): Paralelizar getConvocatorias + getProfesores en Dashboard. Implementacion mecanica.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Informes de auditoria
- `docs/auditoria/03-rendimiento.md` — Analisis de rendimiento, bundle size, oportunidades de splitting
- `docs/auditoria/04-pwa-offline.md` — Config PWA actual, registerType issue, ChunkLoadError risk

### Codebase maps
- `.planning/codebase/STACK.md` — Vite config, PWA plugin config, build pipeline
- `.planning/codebase/CONCERNS.md` — Tech debt: ESLint exhaustive-deps suppressions en DashboardPage y useStudents
- `.planning/codebase/CONVENTIONS.md` — Patron de componentes ui/, import conventions

### Phase 1 context (decisiones heredadas)
- `.planning/phases/01-estabilidad-critica/01-CONTEXT.md` — ErrorBanner pattern (D-01/D-02) que informa el banner de SW update

### Archivos directamente afectados
- `vite.config.js` — registerType change + manualChunks config
- `src/App.jsx` — React.lazy imports + Suspense wrapper
- `src/main.jsx` — SW registration con onNeedRefresh callback
- `src/pages/DashboardPage.jsx` — debounce en searchQuery + Promise.all en API calls
- `src/components/features/StudentRow.jsx` — React.memo wrapper
- `src/components/features/TeacherCard.jsx` — React.memo wrapper
- `src/components/ui/StatCard.jsx` — React.memo wrapper

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/ErrorBanner.jsx` — Patron de banner inline ya existe (Phase 1). El banner de SW update seguira un patron similar pero con estilo diferente (informativo vs error).
- `src/components/ui/` tiene 9 componentes atomicos — LoadingSpinner sera el 10mo, siguiendo el mismo patron.
- `src/hooks/useStudents.js` y `src/hooks/useConvocatorias.js` — Hooks custom existentes. El debounce podria implementarse como hook custom `useDebounce` o inline.

### Established Patterns
- Componentes ui/ son puros: props in, JSX out, sin efectos secundarios
- Error/loading state via `useState` — patron ya establecido en hooks
- Animaciones CSS custom en `src/styles/animations.css` — spinner animation podria ir ahi o en Tailwind config
- vite-plugin-pwa ya configurado con Workbox — solo cambiar registerType y agregar handler

### Integration Points
- `src/App.jsx` — Cambiar imports estaticos a React.lazy(), envolver Routes en Suspense
- `vite.config.js` — registerType: 'prompt' + build.rollupOptions.output.manualChunks
- `src/main.jsx` o nuevo hook — Manejar el callback onNeedRefresh de vite-plugin-pwa

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for mechanical implementations (PERF-02, PERF-04, PERF-05).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-rendimiento-y-bundle*
*Context gathered: 2026-03-31*
