# Project Research Summary

**Project:** NovAttend — Milestone Post-Auditoria (Olas 1-3)
**Domain:** React PWA interna — correcciones de bugs, optimizacion de rendimiento, accesibilidad
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

NovAttend es una PWA mobile-first (React 19 + Vite 7 + Tailwind 3) usada por 7 profesores y 1 CEO. La auditoria previa identified un score de 7.3/10 con 20 problemas concretos. La investigacion confirma que el approach correcto para este milestone es quirurgico: corregir bugs criticos primero (Ola 1), optimizar rendimiento a continuacion (Ola 2), y cerrar con refactorizacion de arquitectura y accesibilidad (Ola 3). No hay cambios de stack, no hay nuevas features funcionales — todo el trabajo es mejora de calidad sobre lo construido.

Los dos riesgos mas serios ya estan identificados y son corregibles en menos de una hora cada uno: el `navigateFallback` que apunta a `/offline.html` (inexistente en el build) rompe toda la PWA offline, y el regex de cache de la API no captura el dominio real de respuesta de Google Apps Script (`script.googleusercontent.com`). Ambos bugs hacen que la PWA funcione correctamente solo cuando hay conexion, invalidando su propuesta de valor central.

El riesgo arquitectonico mas importante de las Olas 2 y 3 es la combinacion de code-splitting con `registerType: 'autoUpdate'`: cuando el Service Worker activa una nueva version mientras un profesor tiene la pantalla de asistencia abierta, los chunks con hash nuevo ya no son descargables y el estado en memoria se pierde. Este pitfall debe mitigarse antes de desplegar code-splitting a produccion, ya sea persistiendo el estado de asistencia en `sessionStorage` o cambiando a `registerType: 'prompt'`.

---

## Key Findings

### Recommended Stack

El stack existente (React 19, Vite 7, Tailwind 3, react-router-dom 7, vite-plugin-pwa) no cambia en este milestone. Las unicas adiciones son dos librerias pequenas y quirurgicas: `focus-trap-react` (v12, compatible con React 19) para el focus trap del Modal en Ola 3, y `use-debounce` (v10, sin dependencias) para el debounce del campo de busqueda en DashboardPage en Ola 2. Ambas son las opciones estandar del ecosistema con alternatives peores descartadas (Radix UI forzaria reescribir Modal; lodash suman 70KB sin razon).

El React Compiler de React 19 (disponible desde oct 2025) automatizaria la memoizacion, pero activarlo requiere instalar `babel-plugin-react-compiler` — overhead no justificado para memoizar 3 componentes. Se opta por `React.memo` manual selectivo en `StudentRow`, `StatCard` y `TeacherCard`.

**Core technologies:**
- `focus-trap-react` v12: focus trap en Modal — unica libreria estandar compatible con React 19 sin reescribir el componente visual
- `use-debounce` v10: debounce de `searchQuery` — cero dependencias, API limpia con `.flush()` y `.cancel()` para testing
- `React.lazy()` + `Suspense`: code-splitting de rutas — patron nativo de React, sin dependencias extra, reduce bundle inicial ~50-60%
- `manualChunks` en Vite: vendor splitting — separa react+react-dom en chunk estable cacheable entre deploys

### Expected Features

La investigacion agrupa los 20 problemas de la auditoria en tres categorias con prioridad clara.

**Must have (table stakes — Ola 1):**
- Correccion `navigateFallback: '/index.html'` — la PWA offline esta completamente rota sin este fix
- Correccion regex API cache (`googleusercontent.com`) — sin este fix, ningun dato de API se cachea offline
- Bug `SavedPage present === 0` — redireccion incorrecta cuando hay 0 presentes con datos validos
- Guard `res.ok` en `api.js` antes de `res.json()` — previene SyntaxError críptico en errores HTTP 4xx/5xx
- Feedback de error visible en `AttendancePage` y carga de alumnos — profesor no sabe si la accion fallo
- Tokens Tailwind en lugar de 3 hex hardcodeados (Button, ToggleSwitch, MobileContainer) — compliance con regla de oro
- `html lang="es"` + metadata PWA completa — WCAG 3.1.1 (A) y instalabilidad Android
- Ruta 404 con catch-all `path="*"` — pantalla en blanco en URL invalida es comportamiento inesperado
- `npm audit fix` — 9 vulnerabilidades en devDeps resueltas sin breaking changes

**Should have (differentiators — Ola 2):**
- Code-splitting con `React.lazy()` en 4 rutas — bundle de 271KB a ~195KB percibido en first load
- `React.memo` en `StudentRow`, `StatCard`, `TeacherCard` con `useCallback` para handlers — elimina re-renders en cascada
- Debounce en `searchQuery` del Dashboard — fluidez perceptible al escribir
- `manualChunks` para vendor split — chunks de react+react-dom cacheables entre deploys
- Paralelizacion de llamadas API en Dashboard con `Promise.all` — ahorro de ~400ms en primer render

**Defer (Ola 3 + v2+):**
- `DashboardPage` refactor a hooks + subcomponentes — compliance con regla 250 lineas, facilita testing
- Focus trap en `Modal.jsx` con `focus-trap-react` — WCAG 2.1 SC 2.1.2
- Soporte de teclado en `TeacherCard` (`tabIndex` + `onKeyDown`) — WCAG 2.1 SC 2.1.1
- JSDoc en 11 componentes faltantes — onboarding y mantenibilidad
- ARIA labels en componentes interactivos criticos — accesibilidad score 5.0 → 7.0
- Cola offline con Background Sync API — diferir a Ola 4+
- Autenticacion server-side — diferir a Ola 4+

### Architecture Approach

El patron central de Ola 3 es Hook-First Decomposition para `DashboardPage.jsx` (actualmente 272 lineas, viola la regla de 250). Toda la logica (state, efectos, memos, handlers) se extrae a `useDashboard.js` en `src/hooks/`. El JSX se distribuye en tres subcomponentes puros en `src/components/features/` (`DashboardHeader`, `DashboardSearch`, `TeacherList`). `DashboardPage.jsx` queda como orquestador delgado de ~65 lineas. El flujo de datos es unidireccional: hook → pagina → subcomponentes via props, sin Context (un nivel de prop drilling es correcto a esta escala).

Para code-splitting (Ola 2), `App.jsx` convierte 4 rutas a `React.lazy()` con un unico `<Suspense>` boundary envolviendo `<Routes>`. `LoginPage` permanece estatica (es la ruta de cold start). El fallback del Suspense usa un div de color solido (no spinner) para evitar layout shift en PWA precacheada.

**Major components:**
1. `useDashboard.js` (nuevo hook en `src/hooks/`) — toda la logica de DashboardPage: state, API calls, memos, handlers
2. `DashboardHeader.jsx` (nuevo en `features/`) — cabecera con StatCards, ConvocatoriaSelector, badge de alertas
3. `DashboardSearch.jsx` (nuevo en `features/`) — SearchInput + lista de resultados filtrados
4. `TeacherList.jsx` (nuevo en `features/`) — lista de TeacherCards con heading de seccion
5. `App.jsx` (refactorizado) — lazy imports de 4 rutas + Suspense boundary central

### Critical Pitfalls

1. **navigateFallback apunta a archivo no precacheado** — cambiar a `'/index.html'` antes de cualquier otro cambio; verificar en DevTools offline mode
2. **autoUpdate + code-splitting = perdida de datos mid-session** — antes de desplegar Ola 2, persistir estado de asistencia en `sessionStorage` o cambiar a `registerType: 'prompt'`
3. **React.memo sin useCallback en handlers = memo inutil** — envolver siempre `onToggle`, `onStudentClick` en `useCallback` antes de aplicar `memo` a los hijos
4. **loadConvData en useEffect sin useCallback = loop infinito de fetch** — al extraer a `useDashboard`, estabilizar con `useCallback([convocatoria])` y eliminar el `eslint-disable` comment
5. **manualChunks con modulos internos = dependencias circulares en chunks** — aplicar `manualChunks` exclusivamente a `node_modules`, dejar que Rollup maneje el splitting interno

---

## Implications for Roadmap

Basado en la investigacion, la estructura de 3 olas es la correcta. El orden esta determinado por dependencias tecnicas y perfil de riesgo.

### Fase 1 (Ola 1): Estabilidad Critica

**Razon:** Los bugs de PWA y API hacen que la app sea no-confiable en produccion. Son cambios de bajo riesgo con maximo impacto. Deben ir primero para que Ola 2 construya sobre una base solida.

**Entrega:** App funcional offline + feedback de error visible al usuario + compliance con CLAUDE.md + manifest PWA completo.

**Features de FEATURES.md:** navigateFallback fix, regex API cache, bug SavedPage, res.ok guard, feedback error AttendancePage, hex → tokens, html lang, ruta 404, npm audit fix.

**Evita:** Pitfall 1 (navigateFallback), Pitfall 2 (API regex), Pitfall 3 (res.ok).

**Estimacion:** ~5.5h de trabajo. Sin dependencias bloqueantes entre items — pueden secuenciarse en cualquier orden dentro de la ola.

---

### Fase 2 (Ola 2): Rendimiento y Bundle

**Razon:** El code-splitting debe venir antes del refactor de Dashboard (Ola 3) porque son cambios en archivos distintos sin conflictos. Ademas, la preocupacion del autoUpdate + ChunkLoadError (Pitfall 4) debe resolverse en esta ola antes de que el splitting llegue a produccion.

**Entrega:** Bundle inicial ~50-60% mas pequeno para teachers. Vendor chunks cacheables entre deploys. Listas mas fluidas con memo + debounce. Dashboard con carga paralela de API.

**Features de FEATURES.md:** React.lazy (4 rutas), manualChunks, React.memo + useCallback, debounce searchQuery, Promise.all en Dashboard.

**Stack de STACK.md:** `use-debounce` instalado en esta ola. Configuracion `manualChunks` en vite.config.js.

**Evita:** Pitfall 4 (autoUpdate mid-session), Pitfall 5 (memo sin useCallback), Pitfall 6 (chunks no precacheados), Pitfall 7 (circular chunk deps).

**Prerequisito critico:** Pitfall 4 debe mitigarse ANTES de hacer deploy de esta ola. Opcion recomendada: persistir asistencia en sessionStorage en AttendancePage.

**Estimacion:** ~5.5h de trabajo.

---

### Fase 3 (Ola 3): Arquitectura y Accesibilidad

**Razon:** El refactor de DashboardPage es el cambio mas complejo y de mayor riesgo de regresion. Va al final para que los cambios de Ola 1 y 2 ya esten verificados en produccion. Los cambios de accesibilidad (focus trap, teclado) tambien van aqui por su interdependencia con el refactor del componente.

**Entrega:** DashboardPage bajo 250 lineas + testeable en aislamiento. Modal accesible con focus trap + cierre Escape. TeacherCard operable con teclado. JSDoc en 11 componentes. Score accesibilidad 5.0 → 7.0.

**Features de FEATURES.md:** DashboardPage refactor (useDashboard + 3 subcomponentes), focus trap Modal, teclado TeacherCard, JSDoc, ARIA.

**Stack de STACK.md:** `focus-trap-react` instalado en esta ola.

**Arquitectura de ARCHITECTURE.md:** Hook-First Decomposition — secuencia Phase A (useDashboard) → Phase B (3 subcomponentes) → Phase C (refactor DashboardPage). Phase D+E (code splitting) ya completado en Ola 2.

**Evita:** Pitfall 8 (loop infinito por loadConvData sin useCallback), Pitfall 9 (iOS Safari VoiceOver escapa modal), Pitfall 10 (tests className frágiles rompiendo con refactor).

**Advertencia:** Los tests de `StudentRow` con aserciones `className` deben corregirse ANTES del refactor, no despues.

**Estimacion:** ~8h de trabajo (la ola mas larga por complejidad del refactor).

---

### Phase Ordering Rationale

- **Ola 1 primero:** Los bugs de PWA son bloqueantes para la propuesta de valor del producto. Corregirlos antes valida la base sobre la que Ola 2 construye.
- **Ola 2 antes de Ola 3:** Code-splitting y refactor de Dashboard son independientes en archivos, pero introducir lazy loading antes del refactor evita que el refactor tenga que lidiar simultaneamente con cambios en App.jsx y DashboardPage.jsx.
- **Ola 3 al final:** El refactor de DashboardPage es el cambio de mayor superficie de codigo. Hacerlo con Olas 1 y 2 ya verificadas en produccion reduce el riesgo de regresion compuesta.
- **La dependencia critica es Pitfall 4:** El problema de autoUpdate + ChunkLoadError DEBE resolverse en Ola 2 antes del deploy, o se arriesga perdida de datos en el flujo critico del teacher.

### Research Flags

Fases que necesitan revision durante la planificacion detallada:

- **Ola 2 (code-splitting + autoUpdate):** La mitigacion del Pitfall 4 tiene dos opciones (sessionStorage vs registerType: 'prompt') con trade-offs distintos. Requiere decision arquitectonica antes de implementar.
- **Ola 3 (focus trap iOS Safari):** `focus-trap-react` tiene issues documentados con VoiceOver en iOS Safari. El parametro `initialFocus` debe apuntar al boton de cierre (no al contenedor) para evitar scroll-to-top. Requiere prueba en dispositivo real.

Fases con patrones estandar (sin necesidad de research adicional):

- **Ola 1:** Todos los fixes son cambios de config o logica directa. Patrones bien documentados, sin ambiguedad.
- **Ola 2 (React.memo + debounce):** Patron `useCallback` + `memo` es texto de manual. `use-debounce` tiene API trivial.
- **Ola 3 (refactor Dashboard):** La secuencia Phase A-B-C esta completamente especificada en ARCHITECTURE.md. No requiere investigacion adicional.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versiones confirmadas en npm. Alternativas descartadas con justificacion. React Compiler descartado intencionalmente (no habilitado en el proyecto). |
| Features | HIGH | Basado en auditoria local de codigo real + docs oficiales. Los 20 problemas son hallazgos directos, no inferencias. |
| Architecture | HIGH | Hook-First Decomposition verificado en react.dev, patterns.dev, Robin Wieruch 2025. Configuracion manualChunks verificada en docs Vite + articulos 2025. |
| Pitfalls | HIGH | Pitfalls 1-3 grounded en inspeccion directa del codigo existente. Pitfalls 4-7 verificados con issues reales de GitHub (vite, vite-plugin-pwa, react-modal). |

**Overall confidence:** HIGH

### Gaps to Address

- **Impacto real del code-splitting en LCP:** La estimacion de 50-60% de reduccion es basada en patrones de ecosistema. El numero exacto depende del perfil de red real de los profesores (conexion movil en clase vs WiFi de escuela). Medir con Lighthouse antes y despues.
- **React.memo con React 19 Compiler futuro:** Si en un milestone posterior se habilita el React Compiler, los `React.memo` manuales de Ola 2 se vuelven redundantes pero no daninos. Documentar como deuda tecnica conocida.
- **iOS Safari VoiceOver + focus-trap-react:** Los issues de iOS son documentados pero el comportamiento exacto depende de la version de Safari y VoiceOver. Requiere prueba en dispositivo fisico durante Ola 3.
- **Impacto de paralelizacion API:** El ahorro estimado de ~400ms en Dashboard asume que `getConvocatorias` y `getProfesores` son independientes. Confirmar que Apps Script puede manejar 2 requests concurrentes sin throttling.

---

## Sources

### Primary (HIGH confidence)
- `docs/auditoria/00-RESUMEN-EJECUTIVO.md` — auditoria local, 20 hallazgos concretos sobre el codigo real
- `docs/auditoria/04-pwa-offline.md` — analisis detallado de bugs PWA (navigateFallback, regex API)
- `docs/auditoria/03-rendimiento.md` — analisis de bundle y oportunidades de optimizacion
- react.dev/reference/react/lazy — patron React.lazy + Suspense oficial
- react.dev/reference/react/memo — patron React.memo oficial
- vite-pwa-org.netlify.app/workbox/generate-sw — configuracion workbox oficial
- developer.chrome.com/docs/workbox/caching-resources-during-runtime — NetworkFirst + statuses [0,200]
- react.dev/learn/reusing-logic-with-custom-hooks — Custom hooks, Hook-First Decomposition
- github.com/focus-trap/focus-trap-react — focus-trap-react v12, compatibilidad React 19
- github.com/xnimorz/use-debounce — use-debounce v10

### Secondary (MEDIUM confidence)
- mykolaaleksandrov.dev/posts/2025/10/react-lazy-suspense-vite-manualchunks — React.lazy + manualChunks 2025
- soledadpenades.com/posts/2025/use-manual-chunks-with-vite — manualChunks para cache de vendor
- robinwieruch.de/react-router-lazy-loading — React Router v7 + lazy loading
- tkdodo.eu/blog/the-uphill-battle-of-memoization — React.memo pitfalls
- a11y-collective.com/blog/modal-accessibility — patrones accesibles de modal
- allanchain.github.io/blog/post/pwa-skipwaiting — autoUpdate + skipWaiting pitfall

### Tertiary (issues de GitHub, confirmacion de pitfalls)
- github.com/vite-pwa/vite-plugin-pwa/issues/139 — navigateFallback allowlist
- github.com/vitejs/vite/issues/12209 — manualChunks breaking code-splitting
- github.com/vitejs/vite/issues/20202 — circular dependencies en manualChunks
- github.com/reactjs/react-modal/issues/713 — iOS Safari focus trap escape
- blog.sentry.io/fixing-memoization-breaking-re-renders-in-react — memo con inline handlers

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
