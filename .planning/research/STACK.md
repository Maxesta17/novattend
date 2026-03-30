# Technology Stack — NovAttend Optimization Milestone

**Project:** NovAttend (Olas 1-3 — rendimiento, estabilidad, accesibilidad)
**Researched:** 2026-03-30
**Scope:** Optimizaciones sobre stack existente. No hay cambio de framework.

---

## Stack Actual (No Cambiar)

| Technology | Version Instalada | Role |
|------------|-------------------|------|
| React | ^19.2.0 | UI framework |
| Vite | ^7.3.1 | Build tool |
| react-router-dom | ^7.13.0 | SPA routing |
| @vitejs/plugin-react | ^5.1.1 | React transforms + HMR |
| vite-plugin-pwa | ^1.2.0 | PWA / Workbox |
| Tailwind CSS | ^3.4.19 | Styling |
| Vitest | ^4.0.18 | Tests |

Ningun paquete de este conjunto debe cambiarse de version en este milestone. Las adiciones son quirurgicas.

---

## Adiciones Recomendadas

### 1. focus-trap-react

| Campo | Valor |
|-------|-------|
| Paquete | `focus-trap-react` |
| Version | `^12.0.0` |
| Peer dep | `focus-trap` (instalado automaticamente) |
| Proposito | Focus trap accesible en Modal.jsx (Ola 3) |
| Instalacion | `npm install focus-trap-react` |

**Por que:** Es la libreria estandar del ecosistema para focus trapping en React. Version 12 es compatible con React 19 (elimino `propTypes`/`defaultProps` que React 19 depreco). La alternativa nativa (`tabIndex` + `onKeyDown` manual) requiere manejar casos borde de DOM que la libreria ya resuelve: restaurar foco al elemento que abrio el modal, ciclar con Tab/Shift+Tab, bloquear scroll del fondo.

**Por que no Radix UI o Headless UI:** El proyecto tiene un `Modal.jsx` existente con diseno propio. Envolver con `<FocusTrap>` anade accesibilidad sin reescribir el componente visual. Radix/Headless forzarian una reescritura completa del modal.

**Confianza:** HIGH — npm confirma v12.0.0 publicada hace menos de un mes, compatible con React 19.

---

### 2. use-debounce

| Campo | Valor |
|-------|-------|
| Paquete | `use-debounce` |
| Version | `^10.1.1` |
| Proposito | Debounce del `searchQuery` en DashboardPage |
| Instalacion | `npm install use-debounce` |

**Por que:** Paquete sin dependencias, TypeScript nativo, dos hooks bien diferenciados: `useDebounce` (debouncea un valor) y `useDebouncedCallback` (debouncea una funcion). Para DashboardPage, `useDebounce(searchQuery, 300)` es la forma correcta: el valor de busqueda se actualiza con retraso, reduciendo renders durante la escritura.

**Por que no implementacion custom:** Un `useEffect` + `setTimeout` casero funciona pero no maneja correctamente el flush manual ni la cancelacion. `use-debounce` incluye `.flush()` y `.cancel()` en el callback variant, lo que facilita testing.

**Por que no lodash.debounce:** Lodash suma ~70KB. `use-debounce` no tiene dependencias.

**Confianza:** HIGH — version 10.1.1 confirmada en npm, mantenimiento activo.

---

## Cambios de Configuracion (Sin Nuevos Paquetes)

### 3. Code-splitting con React.lazy() + Suspense

**Patron recomendado para App.jsx:**

```jsx
// Antes (imports estaticos — todo en un chunk)
import ConvocatoriaPage from './pages/ConvocatoriaPage'
import AttendancePage from './pages/AttendancePage'
import SavedPage from './pages/SavedPage'
import DashboardPage from './pages/DashboardPage'

// Despues (lazy — cada pagina es su propio chunk)
const ConvocatoriaPage = React.lazy(() => import('./pages/ConvocatoriaPage'))
const AttendancePage   = React.lazy(() => import('./pages/AttendancePage'))
const SavedPage        = React.lazy(() => import('./pages/SavedPage'))
const DashboardPage    = React.lazy(() => import('./pages/DashboardPage'))
```

**Boundary recomendado:** Un solo `<Suspense fallback={<LoadingSpinner />}>` envolviendo todas las `<Routes>`. No poner Suspense dentro de cada ruta — con mobile-first y transiciones rapidas, un boundary central es suficiente y mas simple.

**Que NO lazy-loadear:** `LoginPage` permanece estatica (es la primera vista, no tiene sentido diferir su carga). `ProtectedRoute` y `MobileContainer` tampoco — son wrappers del shell.

**Regla de splitting:** Solo split a nivel de ruta. Las paginas teacher (Convocatoria, Attendance, Saved) tienen uso mutuamente excluyente con Dashboard (CEO). El beneficio real es separar el chunk de Dashboard del de Attendance.

**Confianza:** HIGH — patron documentado en react.dev, sin cambios en React 19.

---

### 4. Vite manualChunks — Vendor Splitting

**Configuracion recomendada para vite.config.js:**

```js
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'router-vendor': ['react-router-dom'],
      }
    }
  }
}
```

**Justificacion del split minimo:**

El bundle actual es 271KB monolitico. El proyecto tiene pocas dependencias de produccion (solo react, react-dom, react-router-dom). La estrategia correcta es separar el vendor de React/React-DOM en un chunk estable que el navegador puede cachear entre deploys, sin fragmentar en exceso.

`react-router-dom` en su propio chunk es opcional pero recomendado porque es mas probable que se actualice independientemente de React core.

**Que NO hacer:** No crear un chunk por cada libreria ni usar `vite-plugin-chunk-split`. Con solo 3 dependencias de produccion, la complejidad no esta justificada. `splitVendorChunkPlugin` esta deprecado en Vite 5+ — no usarlo.

**Confianza:** HIGH — confirmado en documentacion oficial de Vite y articulos de 2025.

---

### 5. React.memo — Donde Aplicarlo

**Contexto critico:** React 19 incluye el React Compiler (v1.0 liberado Oct 2025), que automatiza la memoizacion. Sin embargo, el React Compiler es opt-in: requiere instalar `babel-plugin-react-compiler` y `@rolldown/plugin-babel`. Para este milestone, el overhead de instalar y configurar el compiler no esta justificado — el proyecto usa `@vitejs/plugin-react` v5 que aun incluye Babel, pero el compiler es una herramienta adicional separada.

**Decision: memo manual selectivo, sin el compiler.**

**Donde aplicar `React.memo`:**

| Componente | Justificacion |
|------------|---------------|
| `StudentRow` | Se renderiza N veces (uno por alumno). La lista puede tener 20-30 items. Memoizar evita re-renders cuando solo cambia otro alumno. |
| `StatCard` | Componente puro, recibe props primitivos. Sin memo, se re-renderiza cada vez que DashboardPage actualiza estado. |
| `TeacherCard` | Lista de profesores en Dashboard. Mismo patron que StudentRow. |

**Donde NO aplicar `React.memo`:**

- Componentes que siempre reciben props nuevas en cada render del padre (memo no ayuda).
- Componentes del shell (MobileContainer, ProtectedRoute) — renderizan una sola vez por navegacion.
- `Badge`, `Button` — componentes tan simples que el overhead de memo supera el beneficio.

**`useMemo` y `useCallback`:**

Usar solo en casos concretos:
- `useMemo`: calculos derivados costosos sobre arrays grandes (ej: filtrar/ordenar lista de profesores en Dashboard).
- `useCallback`: callbacks pasados como props a componentes memorizados con `React.memo` (necesario para que memo funcione; si la funcion cambia referencia en cada render, memo no sirve).

**No usar memoizacion defensiva.** Si el Compiler no esta activo, la heuristica es: "si el profiler muestra un problema, entonces memo". No antes.

**Confianza:** MEDIUM — las recomendaciones generales son HIGH, pero la decision de no activar el Compiler (por complejidad de setup) es una eleccion de arquitectura, no un hecho tecnico.

---

### 6. Workbox — Correccion del Cache de API

**Problema identificado en auditoria:** El regex actual en `vite.config.js` matchea `script.google.com` pero las respuestas de Google Apps Script se sirven desde `script.googleusercontent.com` (el dominio que Google usa para las respuestas del Web App desplegado).

**Configuracion actual (buggy):**
```js
urlPattern: /^https:\/\/script\.google\.com\/.*/i,
```

**Configuracion corregida:**
```js
{
  urlPattern: /^https:\/\/(script\.google\.com|script\.googleusercontent\.com)\/.*/i,
  handler: 'NetworkFirst',
  options: {
    cacheName: 'apps-script-api',
    expiration: {
      maxEntries: 50,
      maxAgeSeconds: 60 * 60 * 24  // 24h
    },
    networkTimeoutSeconds: 10,
    cacheableResponse: {
      statuses: [0, 200]
    }
  }
}
```

**Por que `cacheableResponse: { statuses: [0, 200] }` es necesario:** Las respuestas cross-origin sin CORS son "opaque responses" con status 0. Sin incluir `0` en statuses, Workbox no las cachea y el fallback offline no funciona.

**Por que `NetworkFirst` y no `StaleWhileRevalidate`:** Los datos de asistencia son sensibles al tiempo. Un teacher no puede marcar asistencia con datos cacheados de hace 24h. NetworkFirst intenta red primero; si falla (offline), usa cache como fallback. Esto da la semantica correcta.

**Problema de `navigateFallback`:** El config actual usa `navigateFallback: '/offline.html'`, pero la auditoria identifica que deberia ser `/index.html` para que el SPA funcione offline. El Service Worker debe servir `index.html` para cualquier ruta de navegacion desconocida, permitiendo que React Router tome el control.

**Correccion:**
```js
navigateFallback: '/index.html',
navigateFallbackDenylist: [/^\/api/, /\.[a-z]+$/i]  // excluir archivos estaticos
```

**Confianza:** MEDIUM-HIGH — el patron NetworkFirst + statuses [0,200] es documentacion oficial de Workbox. La identificacion del bug `googleusercontent.com` proviene de inspeccion directa del config existente y conocimiento del comportamiento de Google Apps Script.

---

## Alternativas Consideradas y Descartadas

| Categoria | Recomendado | Alternativa | Por que No |
|-----------|-------------|-------------|------------|
| Focus trap | `focus-trap-react` | Radix UI Dialog | Forzaria reescribir Modal.jsx existente |
| Focus trap | `focus-trap-react` | Implementacion manual | Casos borde de DOM complejos; no justificado |
| Debounce | `use-debounce` | `lodash.debounce` | +70KB sin razon; lodash no esta en el proyecto |
| Debounce | `use-debounce` | Hook custom con useEffect | Funciona pero no tiene flush/cancel; peor para testing |
| Memoizacion | React.memo manual | React Compiler | Compiler requiere instalacion extra; overhead no justificado para 3 componentes |
| Bundle split | manualChunks minimo | vite-plugin-chunk-split | Over-engineering; solo 3 deps de produccion |
| Bundle split | manualChunks minimo | splitVendorChunkPlugin | Deprecado en Vite 5+ |

---

## Instalacion

```bash
# Produccion
npm install focus-trap-react use-debounce

# Sin cambios en devDependencies para este milestone
```

---

## Impacto Estimado en Bundle

| Cambio | Efecto Esperado |
|--------|----------------|
| React.lazy() en 4 rutas | Chunk inicial ~40-60% mas pequeno; paginas cargan on-demand |
| manualChunks vendor | react+react-dom en chunk estable, cacheable entre deploys |
| focus-trap-react | +~8KB gzipped (solo en chunk de Modal) |
| use-debounce | +~1KB gzipped (sin dependencias) |

---

## Sources

- React.lazy + Suspense: [web.dev code-splitting-suspense](https://web.dev/code-splitting-suspense/) | [react.dev/reference/react/lazy](https://react.dev/reference/react/lazy)
- Vite manualChunks: [soledadpenades.com 2025](https://soledadpenades.com/posts/2025/use-manual-chunks-with-vite-to-facilitate-dependency-caching/) | [mykolaaleksandrov.dev 2025](https://www.mykolaaleksandrov.dev/posts/2025/10/react-lazy-suspense-vite-manualchunks/) | [Vite Docs](https://v3.vitejs.dev/guide/build)
- React Compiler: [react.dev/blog/2025/10/07/react-compiler-1](https://react.dev/blog/2025/10/07/react-compiler-1) | [isitdev.com useMemo dead](https://isitdev.com/react-19-compiler-usememo-usecallback-dead-2025/)
- React.memo en React 19: [react.dev/reference/react/memo](https://react.dev/reference/react/memo) | [dev.to React 19 memoization](https://dev.to/joodi/react-19-memoization-is-usememo-usecallback-no-longer-necessary-3ifn)
- Workbox runtimeCaching: [Chrome for Developers — Runtime Caching](https://developer.chrome.com/docs/workbox/caching-resources-during-runtime/) | [vite-pwa-org generateSW](https://vite-pwa-org.netlify.app/workbox/generate-sw)
- focus-trap-react: [github.com/focus-trap/focus-trap-react](https://github.com/focus-trap/focus-trap-react) | [logrocket.com accessible modal](https://blog.logrocket.com/build-accessible-modal-focus-trap-react/)
- use-debounce: [github.com/xnimorz/use-debounce](https://github.com/xnimorz/use-debounce) | [usehooks.com/usedebounce](https://usehooks.com/usedebounce)
- @vitejs/plugin-react README: [github.com/vitejs/vite-plugin-react README](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md)
