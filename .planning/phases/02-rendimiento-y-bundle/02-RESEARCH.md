# Phase 2: Rendimiento y Bundle - Research

**Researched:** 2026-03-31
**Domain:** Vite code-splitting, React.memo, vite-plugin-pwa prompt mode, debounce, Promise.all parallelization
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Service Worker Update (PWA-04)**
- D-01: Cambiar `registerType` de `autoUpdate` a `prompt` en vite.config.js. Requiere UI que avise al usuario cuando hay nueva version.
- D-02: El aviso es un **banner inferior persistente** — barra fija en la parte inferior con texto "Nueva version disponible" + boton "Actualizar". No bloquea la interaccion con la app.
- D-03: El banner es **persistente** — sin boton X, no se puede cerrar. Solo desaparece cuando el usuario pulsa "Actualizar".
- D-04: PWA-04 debe desplegarse ANTES del code-splitting (PERF-01/PERF-04) para evitar ChunkLoadError. **Orden critico.**

**Suspense Fallback (PERF-01)**
- D-05: Las 4 rutas post-login (ConvocatoriaPage, AttendancePage, SavedPage, DashboardPage) usan `React.lazy()` + `Suspense`. LoginPage y NotFoundPage siguen eager-loaded.
- D-06: El fallback de Suspense es un **spinner branded** — circulo animado con colores burgundy/gold centrado en pantalla sobre `bg-dark-bg`, con texto "Cargando...".
- D-07: Crear componente **LoadingSpinner.jsx** en `src/components/ui/` — componente puro reutilizable.

**Debounce (PERF-03)**
- D-08: El debounce es **silencioso** — sin indicador visual. 300ms, la lista se filtra cuando el debounce dispara.

### Claude's Discretion

- Memoizacion (PERF-02): React.memo en StudentRow, TeacherCard, StatCard + useCallback en handlers. Implementacion mecanica.
- manualChunks (PERF-04): Separar vendor-react y vendor-router en Vite config. Implementacion mecanica.
- Promise.all (PERF-05): Paralelizar getConvocatorias + getProfesores en Dashboard. Implementacion mecanica.

### Deferred Ideas (OUT OF SCOPE)

Ninguna — la discusion se mantuvo dentro del alcance de la fase.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PWA-04 | Service worker usa registerType prompt para evitar ChunkLoadError mid-session | D-01/D-02/D-03/D-04 + API `useRegisterSW` de `virtual:pwa-register/react` verificada |
| PERF-01 | 4 rutas post-login usan React.lazy() + Suspense (code-splitting por ruta) | D-05/D-06/D-07 + patron React.lazy/Suspense documentado |
| PERF-02 | StudentRow, TeacherCard y StatCard envueltos en React.memo con useCallback en handlers | Patron React.memo verificado en codigo existente; handlers identificados en DashboardPage |
| PERF-03 | searchQuery en DashboardPage usa debounce (300ms) | D-08 + patron useDebounce documentado; `searchResults` en linea 130-133 de DashboardPage identificado |
| PERF-04 | Vite config tiene manualChunks separando vendor-react y vendor-router | Config `build.rollupOptions.output.manualChunks` verificada via vite.config.js actual |
| PERF-05 | Dashboard paraleliza getConvocatorias + getProfesores con Promise.all | Waterfall identificado en DashboardPage:46-78; solucion Promise.all documentada |

</phase_requirements>

---

## Summary

Esta fase opera sobre 7 archivos especificos del proyecto sin introducir dependencias nuevas. El trabajo se divide en dos categorias: (1) cambios de configuracion y arquitectura de carga (PWA-04, PERF-01, PERF-04) y (2) optimizaciones de rendimiento en componentes existentes (PERF-02, PERF-03, PERF-05).

El hallazgo critico de la investigacion es el **orden de despliegue**: PWA-04 (registerType: prompt) debe implementarse primero porque el code-splitting (PERF-01) crea nuevos hash de chunks en cada build. Si el SW sigue en modo autoUpdate y actualiza chunks mientras un profesor tiene la pagina abierta, los imports dinamicos de React.lazy fallaran con ChunkLoadError porque los paths de chunks anteriores ya no existen.

La API de `vite-plugin-pwa@1.2.0` para modo prompt ha sido verificada directamente en los archivos del paquete instalado: `useRegisterSW` se importa de `virtual:pwa-register/react` y devuelve `{ needRefresh: [boolean, setter], updateServiceWorker: () => Promise<void> }`. No se requieren dependencias adicionales.

**Primary recommendation:** Implementar en orden estricto — (1) PWA-04 [registerType + UpdateBanner + hook en main.jsx], (2) PERF-04 [manualChunks en vite.config.js], (3) PERF-01 [React.lazy + LoadingSpinner], (4) PERF-02/03/05 [memoizacion, debounce, Promise.all].

---

## Standard Stack

### Core (ya instalado, sin nuevas dependencias)

| Biblioteca | Version | Proposito | Por que es el estandar |
|------------|---------|-----------|------------------------|
| vite-plugin-pwa | ^1.2.0 | Genera SW con Workbox; expone `useRegisterSW` via virtual module | Ya instalado; el modo `prompt` es config trivial |
| React | ^19.2.0 | `React.lazy()`, `Suspense`, `React.memo`, `useCallback`, `useDebounce` custom | Ya instalado; todas las APIs usadas son core de React |
| Vite | ^7.3.1 | `build.rollupOptions.output.manualChunks` para vendor splitting | Ya instalado; zero config adicional |

### Sin dependencias nuevas

Esta fase no requiere instalar ningun paquete adicional. Todas las tecnicas (lazy loading, memo, debounce, manualChunks, Promise.all) son nativas de React, Vite o JavaScript.

**No instalar:**
- `use-debounce` (npm) — un hook de 5 lineas es suficiente y evita dependencias
- `react-hot-toast` — viola patron zero-external-UI (confirmado fuera de scope en REQUIREMENTS.md)
- `workbox-*` directos — vite-plugin-pwa ya los abstrae

---

## Architecture Patterns

### Estructura de archivos afectados (esta fase)

```
src/
├── main.jsx                          # MODIFICAR: hook useRegisterSW + UpdateBanner
├── App.jsx                           # MODIFICAR: React.lazy + Suspense
├── components/
│   └── ui/
│       ├── UpdateBanner.jsx          # NUEVO: banner SW update
│       └── LoadingSpinner.jsx        # NUEVO: Suspense fallback
├── components/features/
│   ├── StudentRow.jsx                # MODIFICAR: React.memo wrapper
│   └── TeacherCard.jsx               # MODIFICAR: React.memo wrapper
├── components/ui/
│   └── StatCard.jsx                  # MODIFICAR: React.memo wrapper
└── pages/
    └── DashboardPage.jsx             # MODIFICAR: debounce + Promise.all
vite.config.js                        # MODIFICAR: registerType + manualChunks
```

### Pattern 1: registerType prompt + useRegisterSW (PWA-04)

**Que hace:** Cambia la estrategia de actualizacion del SW de silenciosa a prompting. El SW nuevo espera activacion manual via `updateServiceWorker()`.

**Dos partes obligatorias:**
1. `vite.config.js` — cambiar `registerType: 'autoUpdate'` a `registerType: 'prompt'`
2. Consumidor del hook — llamar `useRegisterSW()` y renderizar el banner cuando `needRefresh[0] === true`

**Donde va el hook:** `src/main.jsx` es el mejor lugar — ya es el root de la app, envuelve ErrorBoundary y App. El hook se llama una vez y pasa props a un `UpdateBanner` que se renderiza fuera de `App` para evitar que se pierda al navegar entre rutas.

```jsx
// src/main.jsx — patron verificado en vite-plugin-pwa@1.2.0 react.d.ts
import { useRegisterSW } from 'virtual:pwa-register/react'

function Root() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  return (
    <>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <UpdateBanner needRefresh={needRefresh} onUpdate={() => updateServiceWorker(true)} />
    </>
  )
}
// Fuente: node_modules/vite-plugin-pwa/react.d.ts (verificado localmente)
```

**Alternativa descartada:** Manejar el estado en `App.jsx` es posible pero complica el componente. `main.jsx` como Root component es mas limpio y aislado.

### Pattern 2: React.lazy + Suspense (PERF-01)

**Que hace:** Convierte imports sincronos de paginas en imports dinamicos. Vite genera un chunk JS separado por cada lazy-import. Los chunks se descargan solo cuando se navega a esa ruta.

**Regla de aplicacion (D-05):**
- `LoginPage` — EAGER (primera ruta, debe cargar inmediato, sin lazy)
- `NotFoundPage` — EAGER (ligera, no vale la sobrecarga)
- `ConvocatoriaPage`, `AttendancePage`, `SavedPage`, `DashboardPage` — LAZY

```jsx
// src/App.jsx — patron verificado en React 19 docs
import { lazy, Suspense } from 'react'
import LoadingSpinner from './components/ui/LoadingSpinner.jsx'
// Eager (sin cambio):
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
// Lazy (nuevos):
const ConvocatoriaPage = lazy(() => import('./pages/ConvocatoriaPage'))
const AttendancePage = lazy(() => import('./pages/AttendancePage'))
const SavedPage = lazy(() => import('./pages/SavedPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))

// En Routes: envolver todas las rutas lazy en un Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/" element={<LoginPage />} />
    {/* rutas protegidas con lazy pages... */}
  </Routes>
</Suspense>
```

**Donde va el Suspense:** Envuelve `<Routes>` completo, no cada ruta individual. Un solo boundary es suficiente para todas las rutas lazy.

### Pattern 3: manualChunks en Vite (PERF-04)

**Que hace:** Separa React core y React Router en chunks distintos que el navegador puede cachear independientemente del codigo de la app.

```js
// vite.config.js — seccion build
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom'],
        'vendor-router': ['react-router-dom'],
      }
    }
  }
}
// Fuente: Vite 7 docs build.rollupOptions (patron estandar conocido)
```

**Impacto en precache:** El SW regenera el manifest de precache en cada build. Con manualChunks, los hashes de `vendor-react` y `vendor-router` NO cambian si solo cambia codigo de la app. Esto reduce el volumen de precache en deploys futuros.

### Pattern 4: React.memo + useCallback (PERF-02)

**Que hace:** Evita re-renders de componentes hijo cuando el padre re-renderiza pero las props no han cambiado. `useCallback` estabiliza referencias de funcion para que React.memo pueda comparar correctamente.

**Componentes objetivo y sus props criticas:**

| Componente | Props que cambian | Handlers que necesitan useCallback |
|------------|------------------|-------------------------------------|
| `StudentRow` | `isPresent` (boolean), `name`, `initials` | `onToggle` — viene de `AttendancePage` |
| `TeacherCard` | `isExpanded` (boolean), `teacher` (objeto estable) | `onToggle`, `onStudentClick` — vienen de `DashboardPage` |
| `StatCard` | `value`, `label`, `color`, `variant` | `onClick` — viene de `DashboardPage` |

```jsx
// Patron de aplicacion — sin cambio visual
import { memo } from 'react'

export default memo(function StudentRow({ name, initials, isPresent, onToggle, delay, stats }) {
  // ...cuerpo sin cambios
})
// Fuente: React 19 docs — memo() acepta function declaration como argumento
```

**En DashboardPage**, los handlers inline que se pasan a TeacherCard y StatCard necesitan `useCallback`:

```jsx
// DashboardPage.jsx — handlers estabilizados
import { useState, useMemo, useEffect, useCallback } from 'react'

const handleAlertClick = useCallback(() => setShowAlertPopup(true), [])
const handleClear = useCallback(() => setSearchQuery(''), [])
// onToggle de TeacherCard — depende de expandedTeacher
const handleTeacherToggle = useCallback((id) => {
  setExpandedTeacher(prev => prev === id ? null : id)
}, [])
```

**Advertencia ESLint:** El eslint-disable en DashboardPage:79 sobre `react-hooks/exhaustive-deps` se mantiene tal cual — no es objetivo de esta fase.

### Pattern 5: useDebounce hook custom (PERF-03)

**Que hace:** Retrasa la actualizacion de `searchQuery` 300ms desde el ultimo keystroke, evitando que `searchResults` se recalcule en cada tecla.

**Implementacion inline en DashboardPage** (opcion preferida — sin archivo extra):

```jsx
// src/pages/DashboardPage.jsx
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'

// Hook de debounce en el mismo archivo (5 lineas)
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

// En el componente:
const [searchQuery, setSearchQuery] = useState('')
const debouncedSearch = useDebounce(searchQuery, 300)

const searchResults = useMemo(() => {
  if (debouncedSearch.length < 2) return []
  return allStudents.filter(s => s.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
}, [debouncedSearch, allStudents])  // debouncedSearch, no searchQuery
```

**El `SearchInput` no cambia.** Su `value` sigue siendo `searchQuery` (sin debounce) para que el campo refleje inmediatamente lo que el usuario escribe. Solo el calculo de resultados usa `debouncedSearch`.

**Alternativa hook custom en `src/hooks/`:** Claude tiene discrecion. Si DashboardPage supera 250 lineas tras todos los cambios de esta fase, extraer el hook es la solucion correcta. Ver seccion "Common Pitfalls — Limite de 250 lineas".

### Pattern 6: Promise.all para paralelizar Dashboard (PERF-05)

**Situacion actual:** `useConvocatorias` se resuelve primero, luego `loadConvData` ejecuta `Promise.all([getProfesores(), getResumen()])`. El waterfall es: getConvocatorias (~800ms) → getProfesores + getResumen (~800ms) = ~1.6s total.

**Optimizacion:** `getProfesores()` NO depende de la convocatoria seleccionada. Puede ejecutarse en paralelo con `getConvocatorias`.

```jsx
// src/pages/DashboardPage.jsx — refactor del useEffect principal
useEffect(() => {
  if (convsLoading) return  // useConvocatorias aun cargando — esperar
  // ... manejo de errores y mock igual que antes

  let cancelled = false
  setLoading(true)
  setError(null)

  Promise.all([
    getProfesores(),              // no depende de convocatoria
    getResumen(convocatoria.id),  // si depende de convocatoria
  ])
    .then(([profesores, resumen]) => {
      if (!cancelled) {
        setTeachers(buildTeachersHierarchy(profesores || [], resumen || []))
        setLoading(false)
      }
    })
    .catch(err => {
      if (!cancelled) {
        setError(err.message || 'Error al cargar datos')
        setLoading(false)
      }
    })
  return () => { cancelled = true }
}, [convsLoading, convsError, convocatoria]) // eslint-disable-line react-hooks/exhaustive-deps
```

**Importante:** La funcion auxiliar `loadConvData` existente en linea 37-43 se reemplaza por esta logica directa en el useEffect. `loadConvData` tambien es llamada por `handleConvChange` (linea 89) — ese uso tambien se actualiza.

**NOTA CRITICA sobre el waterfall:** El waterfall principal es `useConvocatorias` (llamada en el hook) → `useEffect` (esperando `convsLoading === false`). La optimizacion de PERF-05 no elimina esa espera — solo paralela lo que ocurre despues. El ahorro real es ~400ms dentro del segundo segmento.

### Anti-Patterns a Evitar

- **Lazy + Suspense en cada ruta individual:** Crea multiples boundaries que se activan en cadena. Un solo `<Suspense>` envolviendo `<Routes>` es correcto.
- **React.memo sin useCallback:** Envolver en memo un componente que recibe funciones inline es inutil — las funciones inline crean nuevas referencias en cada render. memo y useCallback van juntos.
- **Debounce con libreria externa:** `use-debounce` de npm es innecesario para un hook de 5 lineas. Viola la filosofia de dependencias minimas del proyecto.
- **Cambiar registerType SIN crear el UI de actualizacion:** Si se cambia a `prompt` pero no hay `onNeedRefresh` handler ni UpdateBanner, el SW nuevo nunca se activa y los usuarios nunca reciben actualizaciones.
- **Colocar useRegisterSW dentro de App.jsx:** Si App.jsx se desmonta (raro en SPA pero posible con ErrorBoundary), el hook se pierde. `main.jsx` como Root component es mas robusto.

---

## Don't Hand-Roll

| Problema | No construir | Usar en cambio | Por que |
|----------|--------------|----------------|---------|
| Deteccion de SW update | Event listener manual en `navigator.serviceWorker` | `useRegisterSW` de `virtual:pwa-register/react` | Workbox maneja el ciclo de vida del SW; el virtual module es la API oficial de vite-plugin-pwa |
| Chunk splitting manual | Analisis manual de dependencias | `manualChunks` de Vite + `React.lazy()` | Vite/Rollup conoce el grafo de modulos completo; el splitting manual rompe tree-shaking |
| Spinner de carga animado | CSS keyframes nuevos | `animate-spin` de Tailwind + keyframe `spin` ya en `animations.css` | El keyframe `spin` ya existe en `src/styles/animations.css` |
| Comparacion profunda de props | `_.isEqual` o comparador custom | `React.memo` con comparacion superficial (default) | Las props de StudentRow/TeacherCard/StatCard son primitivos o referencias estables con useCallback — la comparacion superficial es suficiente |

---

## Common Pitfalls

### Pitfall 1: ChunkLoadError mid-session (el pitfall que motiva D-04)

**Que sale mal:** El codigo-splitting genera chunks con hashes como `AttendancePage-Bx7k3Z.js`. Si el SW sigue en `autoUpdate` y el usuario tiene la app abierta mientras se hace un deploy nuevo, el SW actualiza los assets. Cuando React intenta cargar un chunk lazy, el path ya no existe (hash diferente) → `ChunkLoadError: Loading chunk X failed`.

**Por que ocurre:** `autoUpdate` activa el nuevo SW en background. El SW invalida el cache de assets viejos pero la pagina actual sigue corriendo. Al navegar a una ruta lazy, el import dinamico falla.

**Como evitar:** Implementar PWA-04 (registerType: prompt) ANTES de PERF-01/PERF-04. Con `prompt`, el SW nuevo espera en estado `waiting` hasta que el usuario pulse "Actualizar", momento en que la pagina recarga y carga el bundle nuevo completo.

**Warning sign:** En DevTools > Application > Service Workers, ver dos SWs activos simultaneamente (uno `activated`, otro `waiting`).

### Pitfall 2: DashboardPage supera 250 lineas

**Que sale mal:** El archivo ya tiene 273 lineas (viola CLAUDE.md). Los cambios de PERF-02 (useCallback), PERF-03 (useDebounce), y PERF-05 (Promise.all inline) agregan lineas. Si se anade el hook `useDebounce` inline (7-10 lineas) el archivo puede crecer aun mas.

**Como evitar:** Medir antes de implementar. Si el archivo supera 250 lineas tras los cambios, extraer `useDebounce` a `src/hooks/useDebounce.js` (archivo separado de ~15 lineas). ARCH-01 (refactor completo de DashboardPage) es Phase 3 — no adelantar ese trabajo, solo extraer lo minimo necesario.

**Warning sign:** Conteo de lineas post-edicion > 250. ESLint no lo detecta; requiere revision manual.

### Pitfall 3: virtual:pwa-register/react no resuelve en tests

**Que sale mal:** Los tests de Vitest usan jsdom y no tienen acceso al Service Worker. El import `virtual:pwa-register/react` es un modulo virtual que solo existe en el contexto de Vite. En tests, el import falla.

**Como evitar:** Si se escriben tests para `main.jsx` o el `UpdateBanner`, mockear el modulo virtual:

```js
// src/tests/setup.js o en el test especifico
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  })
}))
```

**Warning sign:** Error `Cannot find module 'virtual:pwa-register/react'` en la salida de `npm test`.

### Pitfall 4: React.memo con prop `onToggle` inline en DashboardPage

**Que sale mal:** En DashboardPage linea 249, `onToggle` se define inline: `() => setExpandedTeacher(...)`. Aunque se envuelva `TeacherCard` en `React.memo`, la funcion inline crea una nueva referencia en cada render de DashboardPage → memo no sirve.

**Como evitar:** Usar `useCallback` para todos los handlers que se pasan a componentes memoizados. Ver Pattern 4 arriba.

**Warning sign:** React DevTools Profiler muestra que TeacherCard sigue re-renderizando incluso cuando sus datos no cambian.

### Pitfall 5: `useRegisterSW` fuera del contexto de React

**Que sale mal:** `useRegisterSW` es un hook de React. Si se llama fuera de un componente funcional (por ejemplo, en el body de `main.jsx` sin envolverlo en un componente), lanza el error de hooks.

**Como evitar:** Envolver la llamada en un componente `Root` o similar antes de `createRoot.render()`. Ver Pattern 1 — la estructura de `main.jsx` requiere un componente intermedio.

---

## Code Examples

### UpdateBanner.jsx (componente nuevo)

```jsx
// src/components/ui/UpdateBanner.jsx
// Patron de referencia: ErrorBanner.jsx (role, renderiza null cuando no aplica)
// Especificacion visual: 02-UI-SPEC.md seccion "UpdateBanner"

/**
 * Banner de actualizacion del Service Worker.
 * @param {object} props
 * @param {boolean} props.needRefresh - Si hay una nueva version disponible
 * @param {function} props.onUpdate - Handler al pulsar "Actualizar"
 */
export default function UpdateBanner({ needRefresh, onUpdate }) {
  if (!needRefresh) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      <div className="max-w-[430px] mx-auto bg-gold-soft border-t border-gold/40 px-4 py-3 flex items-center justify-between gap-3">
        <p className="font-montserrat text-sm text-text-dark">
          Nueva version disponible
        </p>
        <button
          onClick={onUpdate}
          className="bg-burgundy text-white text-xs font-semibold font-montserrat rounded-lg px-4 py-2 min-h-[44px] shrink-0 hover:bg-burgundy-light transition-colors duration-200"
        >
          Actualizar
        </button>
      </div>
    </div>
  )
}
// Fuente: 02-UI-SPEC.md (contrato de diseno aprobado)
```

### LoadingSpinner.jsx (componente nuevo)

```jsx
// src/components/ui/LoadingSpinner.jsx
// Patron de referencia: SVG spinner inline en Button.jsx

/**
 * Spinner de carga para fallback de Suspense.
 * Pantalla completa sobre bg-dark-bg.
 */
export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center gap-3">
      <svg
        className="animate-spin"
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
      >
        <circle
          cx="16" cy="16" r="12"
          strokeWidth="3"
          stroke="currentColor"
          className="text-burgundy/30"
        />
        <path
          d="M16 4 a12 12 0 0 1 12 12"
          strokeWidth="3"
          stroke="currentColor"
          strokeLinecap="round"
          className="text-gold"
        />
      </svg>
      <span className="font-montserrat text-xs font-semibold text-white/80">
        Cargando...
      </span>
    </div>
  )
}
// Fuente: 02-UI-SPEC.md + animations.css (keyframe spin ya existente)
```

### main.jsx refactorizado (PWA-04)

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './index.css'
import './styles/animations.css'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import App from './App.jsx'
import UpdateBanner from './components/ui/UpdateBanner.jsx'

function Root() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  return (
    <>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <UpdateBanner
        needRefresh={needRefresh}
        onUpdate={() => updateServiceWorker(true)}
      />
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
// Fuente: vite-plugin-pwa@1.2.0 react.d.ts (verificado en node_modules)
```

### vite.config.js — cambios de esta fase

```js
// Cambio 1: registerType
registerType: 'prompt',  // era 'autoUpdate'

// Cambio 2 (nueva seccion build):
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom'],
        'vendor-router': ['react-router-dom'],
      }
    }
  }
}
// Fuente: Vite 7 docs + auditoria 03-rendimiento.md seccion 6.4
```

---

## State of the Art

| Patron Antiguo | Patron Actual | Cuando Cambio | Impacto en esta Fase |
|----------------|---------------|---------------|----------------------|
| `registerSW()` callback manual | `useRegisterSW` hook de vite-plugin-pwa | v0.12+ (2022) | Usar el hook — el callback manual es API de nivel inferior |
| `React.lazy()` sin Suspense boundary | `React.lazy()` + `<Suspense fallback>` obligatorio | React 16.6+ | Suspense es requerido; sin el, lazy throws |
| `React.memo(Component, compareFn)` con comparador custom | `React.memo(Component)` + useCallback en parent | React 16.6+ | La comparacion superficial + useCallback es suficiente para este caso; custom comparator agrega complejidad innecesaria |

**Nota de version:** `useRegisterSW` en `vite-plugin-pwa@1.2.0` (instalado) devuelve `needRefresh` como **array** `[boolean, setter]`, no como boolean directo. Desestructurar correctamente: `const { needRefresh: [needRefresh, setNeedRefresh] } = useRegisterSW()`.

---

## Environment Availability

Fase puramente de codigo — sin dependencias externas nuevas. Node 24.14.0 disponible. Todas las dependencias ya instaladas y verificadas.

| Dependencia | Requerida por | Disponible | Version | Fallback |
|-------------|--------------|------------|---------|----------|
| Node.js | Build/test | Si | v24.14.0 | — |
| vite-plugin-pwa | PWA-04 | Si | ^1.2.0 | — |
| react (lazy, memo, useCallback) | PERF-01/02 | Si | ^19.2.0 | — |
| Vite manualChunks | PERF-04 | Si | ^7.3.1 | — |
| virtual:pwa-register/react | PWA-04 | Si (modulo virtual de vite-plugin-pwa) | — | — |

---

## Validation Architecture

### Test Framework

| Propiedad | Valor |
|-----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | vite.config.js (seccion `test`) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Comportamiento | Tipo de Test | Comando Automatizado | Archivo Existe? |
|--------|---------------|--------------|----------------------|-----------------|
| PWA-04 | UpdateBanner renderiza cuando needRefresh es true | unit | `npm test -- --testPathPattern UpdateBanner` | No — Wave 0 |
| PWA-04 | UpdateBanner no renderiza cuando needRefresh es false | unit | `npm test -- --testPathPattern UpdateBanner` | No — Wave 0 |
| PWA-04 | UpdateBanner llama onUpdate al click en boton | unit | `npm test -- --testPathPattern UpdateBanner` | No — Wave 0 |
| PERF-01 | LoadingSpinner renderiza spinner + "Cargando..." | unit | `npm test -- --testPathPattern LoadingSpinner` | No — Wave 0 |
| PERF-02 | StudentRow no re-renderiza cuando props identicas (memo) | unit | tests existentes en StudentRow.test.jsx — verificar pasan | Si |
| PERF-03 | searchResults no se recalcula en cada keystroke | N/A (manual-only) | Prueba visual en devtools: teclear rapido y observar renders | — |
| PERF-04 | Build genera chunks vendor-react y vendor-router separados | smoke | `npm run build` y verificar output | — |
| PERF-05 | getProfesores y getResumen se llaman en paralelo | unit (mock) | N/A — comportamiento de Promise.all dificil de unit-testear en aislamiento | — |

### Sampling Rate

- **Por commit de tarea:** `npm test`
- **Por merge de wave:** `npm test` (suite completa)
- **Phase gate:** Suite completa verde antes de `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/tests/UpdateBanner.test.jsx` — cubre PWA-04 (renderizado condicional + handler onUpdate)
- [ ] `src/tests/LoadingSpinner.test.jsx` — cubre PERF-01 (renderizado del spinner y label)

**Tests existentes no requieren modificacion:** `StudentRow.test.jsx` ya prueba el componente; envolver en `memo` no cambia la interfaz externa.

---

## Open Questions

1. **Limite de 250 lineas en DashboardPage post-cambios**
   - Que sabemos: DashboardPage tiene actualmente 273 lineas (ya viola la regla). Los cambios de PERF-02, PERF-03 y PERF-05 anadiran ~20-30 lineas adicionales.
   - Que no es claro: Si el planner debe incluir una tarea de extraccion minima (solo `useDebounce` a `src/hooks/`) o diferir a Phase 3 (ARCH-01).
   - Recomendacion: El planner debe incluir una tarea de medicion post-cambio. Si supera 250 lineas, extraer `useDebounce` como `src/hooks/useDebounce.js`. NO adelantar el refactor completo de ARCH-01.

2. **`handleConvChange` en DashboardPage y la eliminacion de `loadConvData`**
   - Que sabemos: `loadConvData` en linea 37-43 es llamada tanto por el useEffect (linea 70) como por `handleConvChange` (linea 89). Si PERF-05 inlinea la logica en el useEffect, `handleConvChange` tambien necesita actualizarse para llamar `Promise.all([getProfesores(), getResumen(conv.id)])` directamente.
   - Que no es claro: Si `loadConvData` debe mantenerse como funcion auxiliar interna (para no duplicar codigo) o eliminarse.
   - Recomendacion: Mantener `loadConvData` como funcion interna del componente pero actualizarla para usar `Promise.all`. El useEffect la llama, y `handleConvChange` tambien. Esto minimiza los cambios y no duplica logica.

---

## Project Constraints (from CLAUDE.md)

Directivas aplicables a esta fase:

| Directiva | Aplicacion en Phase 2 |
|-----------|----------------------|
| CERO estilos inline | UpdateBanner y LoadingSpinner usan exclusivamente Tailwind. Ningun `style={{}}`. |
| Max 250 lineas por archivo | DashboardPage ya viola. Ver Open Question 1. UpdateBanner y LoadingSpinner seran < 50 lineas. |
| Tokens Tailwind, cero hexadecimales | UpdateBanner usa `bg-gold-soft`, `border-gold/40`, `bg-burgundy`, `bg-burgundy-light`. LoadingSpinner usa `bg-dark-bg`, `text-burgundy/30`, `text-gold`, `text-white/80`. Todos son tokens configurados en tailwind.config.js. |
| UI en espanol, codigo en ingles | Texto "Nueva version disponible" / "Actualizar" / "Cargando..." en espanol. Variables `needRefresh`, `updateServiceWorker`, `LoadingSpinner`, `UpdateBanner` en ingles. |
| JSDoc obligatorio en componentes nuevos | UpdateBanner.jsx y LoadingSpinner.jsx requieren bloque JSDoc con @param documentado. |
| Animaciones CSS custom en animations.css | El keyframe `spin` ya existe en animations.css. No agregar keyframes nuevos a tailwind.config.js. |
| Commits en espanol (Conventional Commits) | Commits de esta fase: `feat: updatebanner sw-prompt -- banner inferior actualizacion PWA`, `perf: code-splitting rutas post-login -- react.lazy suspense`, etc. |
| `npm run lint` obligatorio antes de entrega | Ejecutar despues de cada tarea; los cambios de useCallback pueden introducir nuevas dependencias en arrays de deps. |

---

## Sources

### Primary (HIGH confidence)

- `node_modules/vite-plugin-pwa/react.d.ts` — API `useRegisterSW` verificada directamente en el paquete instalado (v1.2.0). Firma del hook, tipo de retorno `needRefresh` como array.
- `node_modules/vite-plugin-pwa/types/index.d.ts` — `RegisterSWOptions.onNeedRefresh` verificado.
- `src/pages/DashboardPage.jsx` — waterfall identificado, lineas 37-79 auditadas.
- `src/components/features/StudentRow.jsx`, `TeacherCard.jsx`, `src/components/ui/StatCard.jsx` — prop signatures verificadas para aplicacion de React.memo.
- `docs/auditoria/03-rendimiento.md` — metricas de bundle actuales (271 KB raw / 85 KB gzip), analisis de re-renders.
- `docs/auditoria/04-pwa-offline.md` — riesgo ChunkLoadError con autoUpdate documentado.
- `.planning/phases/02-rendimiento-y-bundle/02-UI-SPEC.md` — contrato visual de UpdateBanner y LoadingSpinner.
- `src/styles/animations.css` — keyframe `spin` existente verificado.
- `vite.config.js` — estado actual de la configuracion PWA y build.

### Secondary (MEDIUM confidence)

- React 19 docs (conocimiento de entrenamiento) — `React.lazy()`, `Suspense`, `React.memo`, `useCallback`. APIs estables desde React 16.6/17; confianza ALTA en patrones de uso.
- Vite 7 docs (conocimiento de entrenamiento) — `build.rollupOptions.output.manualChunks`. API estable desde Vite 2; verificada conceptualmente contra vite.config.js actual que muestra estructura de `workbox` como guia del formato de config.

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — sin dependencias nuevas; todo verificado en node_modules o codigo existente
- Architecture: HIGH — patrones verificados en archivos fuente; API de vite-plugin-pwa verificada en tipos del paquete instalado
- Pitfalls: HIGH — identificados en auditorias del proyecto (docs/auditoria/) y codigo fuente real
- Tests: MEDIUM — infraestructura existente verificada; tests nuevos (UpdateBanner, LoadingSpinner) son Wave 0 gaps pendientes

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stack estable; vite-plugin-pwa@1.x tiene API estable)
