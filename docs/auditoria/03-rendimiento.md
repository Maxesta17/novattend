# Auditoria de Rendimiento — NovAttend

> **Fecha:** 2026-03-30
> **Modo:** `/optimize_code` performance · deep · `src/` completo
> **Build:** Vite 7.3.1 · React 19 · 73 modulos · 1.48s build

---

## Resumen Ejecutivo

| Metrica | Valor | Veredicto |
|---------|-------|-----------|
| JS bundle (raw) | 271.27 KB | ALTO — monolitico |
| JS bundle (gzip) | 85.11 KB | Aceptable pero mejorable |
| CSS bundle (raw) | 23.67 KB | OK |
| CSS bundle (gzip) | 5.44 KB | OK |
| Precache total | 406.25 KB | Moderado |
| Code-splitting | **Ninguno** | CRITICO |
| React.lazy() | **No usado** | CRITICO |
| React.memo() | **No usado** | CRITICO |
| Source maps prod | No generados | OK |
| Compresion build | Solo gzip (por hosting) | Falta Brotli |

**Hallazgos priorizados por impacto en velocidad de carga:**

1. CRITICO — Sin code-splitting: todo el JS en un chunk monolitico
2. CRITICO — Sin React.memo en componentes UI: cascadas de re-renders
3. ALTO — Waterfall en Dashboard: API secuencial innecesaria
4. ALTO — Sin debounce en busqueda del Dashboard
5. MEDIO — Imagenes sin optimizar (PNG 534x467 para iconos PWA)
6. MEDIO — Google Fonts carga 15 variantes de peso
7. BAJO — getConvocatorias() duplicada (login + hook)

---

## 1. TAMANO DEL BUNDLE

### 1.1 Composicion del Bundle

```
dist/
  assets/index-DjMP_4rk.js ........ 271.27 KB (gzip: 85.11 KB)
  assets/index-9uMGCbPI.css ....... 23.67 KB  (gzip: 5.44 KB)
  registerSW.js ................... 0.13 KB
  manifest.webmanifest ............ 0.29 KB
  sw.js ........................... ~2 KB
  workbox-78ef5c9b.js ............. ~22 KB
  logova.png ...................... 49 KB
  logova1.png ..................... 64 KB
  offline.html .................... 3.8 KB
```

**Total first-load (JS+CSS):** ~295 KB raw / ~91 KB gzip

### 1.2 Dependencias de Produccion

Solo 3 dependencias en `dependencies`:
- `react` ^19.2.0
- `react-dom` ^19.2.0
- `react-router-dom` ^7.13.0

**Veredicto:** El arbol de dependencias es MINIMO. No hay librerias pesadas innecesarias.
El problema no es que haya demasiadas librerias — es que todo se empaqueta en un solo chunk.

### 1.3 Tree-Shaking

- Todos los imports son named imports (no `import * as`).
- No hay barrel imports (index.js re-exports).
- No hay imports de librerias completas cuando solo se usa una funcion.

**Veredicto:** Tree-shaking funciona correctamente. No hay desperdicio de imports.

### 1.4 Vite Config — Gaps de Build

**Archivo:** `vite.config.js`

Falta toda la seccion `build`:
```
Ausente: build.rollupOptions.output.manualChunks
Ausente: build.sourcemap = false (explícito)
Ausente: build.minify config (usa default esbuild — OK)
Ausente: compresion Brotli (vite-plugin-compression)
```

---

## 2. CARGA INICIAL

### 2.1 Archivos en Primera Visita

| Recurso | Tamano | Tipo | Bloqueante |
|---------|--------|------|------------|
| index.html | 0.94 KB | HTML | Si |
| index-DjMP_4rk.js | 271 KB (85 gzip) | JS module | Si |
| index-9uMGCbPI.css | 24 KB (5.4 gzip) | CSS | Si |
| Google Fonts CSS | ~2 KB | CSS externo | **Si — render-blocking** |
| Google Fonts WOFF2 | ~60 KB | Fuentes | No (display=swap) |
| logova1.png | 64 KB | Icono/logo | No (pero prioritario) |
| registerSW.js | 0.13 KB | SW registro | No |

**Total bloqueante:** ~91 KB gzip (JS+CSS) + Google Fonts CSS

### 2.2 Code-Splitting — NO IMPLEMENTADO

**Archivo:** `src/App.jsx` (lineas 5-9)

```jsx
import LoginPage from './pages/LoginPage'
import ConvocatoriaPage from './pages/ConvocatoriaPage'
import AttendancePage from './pages/AttendancePage'
import SavedPage from './pages/SavedPage'
import DashboardPage from './pages/DashboardPage'
```

**Hallazgo CRITICO:** Las 5 paginas se importan sincronamente. Todo el codigo de Dashboard (CEO) se carga incluso para teachers. Todo el codigo de Attendance se carga para el CEO.

**Impacto estimado con lazy loading:**
- LoginPage: ~15 KB (siempre necesaria — no lazy)
- DashboardPage + TeacherCard + StudentDetailPopup: ~40 KB → solo CEO
- AttendancePage + StudentRow: ~20 KB → solo teachers
- ConvocatoriaPage: ~8 KB → solo si 2+ convocatorias
- SavedPage: ~5 KB → solo post-guardado

**Ahorro potencial:** Un teacher cargaria ~40 KB menos de JS. Un CEO ~25 KB menos.

### 2.3 Dynamic Imports

**Ninguno encontrado.** No hay `import()` en ningun archivo del proyecto.

---

## 3. IMAGENES Y ASSETS

### 3.1 Logos

| Archivo | Tamano | Dimensiones | Uso |
|---------|--------|-------------|-----|
| `public/logova.png` | 49 KB | 534x467 | **Sin uso detectado** |
| `public/logova1.png` | 64 KB | 534x467 | Logo en LoginPage, PageHeader, SavedPage, PWA icons |
| `public/vite.svg` | 1.5 KB | SVG | Favicon por defecto (no usado) |
| `src/assets/react.svg` | 4.1 KB | SVG | **Sin uso detectado** |

**Problemas:**
- `logova.png` y `react.svg` parecen no usarse — peso muerto en build/public.
- `logova1.png` (534x467px) se usa como icono PWA 192x192 y 512x512 — el navegador descarga 64KB y escala down.
- No hay formato WebP ni AVIF alternativo.
- No hay variantes por tamano (`logo-192.png`, `logo-512.png`).

### 3.2 Lazy Loading de Imagenes

**No implementado.** Ningun `<img>` tiene `loading="lazy"`:

- `src/components/features/PageHeader.jsx:29-33` — logo en header
- `src/pages/LoginPage.jsx:68-72` — logo en login
- `src/pages/SavedPage.jsx:28-32` — logo en confirmacion

**Nota:** Para el logo del header y login, `loading="eager"` es correcto (above-the-fold). Para SavedPage podria ser lazy.

### 3.3 PWA Icons

```json
// manifest.webmanifest
{
  "icons": [
    {"src": "/logova1.png", "sizes": "192x192", "type": "image/png"},
    {"src": "/logova1.png", "sizes": "512x512", "type": "image/png"}
  ]
}
```

**Problemas:**
- Misma imagen (534x467) para ambos tamanos.
- No hay icono `maskable` para Android.
- Imagen no es cuadrada (534x467) — puede verse distorsionada.

### 3.4 Caching de Assets (Service Worker)

```javascript
// vite.config.js — workbox
globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}']
```

**Veredicto:** Assets estaticos se pre-cachean correctamente. Google Fonts usa CacheFirst (365 dias). OK.

### 3.5 Google Fonts

**Archivo:** `index.html:9-11`

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="...family=Cinzel:wght@400;500;600;700;800;900&family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

**Bien:**
- `preconnect` configurado para ambos dominios.
- `display=swap` previene FOIT.

**Problemas:**
- Cinzel: 6 pesos (400-900) — probablemente solo se usan 2-3.
- Montserrat: 6 pesos (300-800) — probablemente solo se usan 3-4.
- No hay `&subset=latin` para reducir glyphs.
- CSS de Google Fonts es **render-blocking** (no hay `media="print" onload`).

---

## 4. RE-RENDERS INNECESARIOS EN REACT

### 4.1 React.memo — AUSENTE EN TODO EL PROYECTO

**Ninguno** de los 8 componentes UI ni los 6 feature components usa `React.memo()`.

| Componente | Tipo | Re-render innecesario |
|------------|------|----------------------|
| `StudentRow` | features/ | **CRITICO** — 12+ instancias re-renderizan al cambiar cualquier estado del padre |
| `TeacherCard` | features/ | **ALTO** — cada interaccion re-renderiza todas las cards |
| `StatCard` | ui/ | MEDIO — 4 instancias en Dashboard |
| `Button` | ui/ | MEDIO — multiples instancias |
| `GroupTabs` | features/ | MEDIO — re-renderiza al cambiar estados no relacionados |
| `Badge` | ui/ | BAJO |
| `Avatar` | ui/ | BAJO |
| `ProgressBar` | ui/ | BAJO |
| `Modal` | ui/ | BAJO |
| `SearchInput` | ui/ | BAJO |
| `ToggleSwitch` | ui/ | BAJO |
| `AlertList` | features/ | MEDIO |
| `PageHeader` | features/ | BAJO |
| `StudentDetailPopup` | features/ | BAJO (renderiza condicionalmente) |

### 4.2 useMemo/useCallback — Uso Insuficiente

**DashboardPage.jsx** (el peor caso):

| Linea(s) | Calculo | Problema |
|----------|---------|----------|
| 97-100 | `totalStudents` — nested reduce | OK (tiene useMemo) |
| 102-112 | `globalAttendance` — triple nested reduce | OK (tiene useMemo) |
| 114-126 | `allStudents` — flatMap completo | OK (tiene useMemo) |
| 128 | `alertStudents` — filter | OK (tiene useMemo) |
| **130-133** | `searchResults` — filter por searchQuery | **ALTO — se ejecuta en cada keystroke sin debounce** |
| 204 | `onClick={() => setShowAlertPopup(true)}` | Inline fn nueva cada render |
| 214-215 | `onChange`, `onClear` en SearchInput | Inline fns nuevas cada render |
| 244-251 | `onToggle` por cada TeacherCard | **ALTO — N funciones nuevas cada render** |

**AttendancePage.jsx:**

| Linea(s) | Problema |
|----------|----------|
| 84-88 | SVG `saveIcon` creado inline cada render |
| 141-153 | `StudentRow` recibe props sin memo → cascada |

**LoginPage.jsx:**

| Linea(s) | Problema |
|----------|----------|
| 95-107 | SVG icons inline en cada render |
| 99, 106 | `onChange` handlers inline |
| 24 | `setTimeout` sin cleanup (memory leak potencial) |

**TeacherCard.jsx:**

| Linea(s) | Problema |
|----------|----------|
| 16-20 | `teacherStudents`, `teacherAttendance` — calculos sin memoizar |
| 104 | `onClick` crea nuevo objeto `{...student, teacher, teacherId, group}` cada render |

### 4.3 Estado Demasiado Alto

**No detectado como problema grave.** El estado esta razonablemente localizado:
- `useStudents` hook encapsula estado de alumnos.
- `useConvocatorias` hook encapsula estado de convocatorias.
- Dashboard tiene muchos estados pero son necesarios a ese nivel.

---

## 5. API CALLS

### 5.1 Inventario de Llamadas

| Funcion | Tipo | Donde se usa | Cache |
|---------|------|-------------|-------|
| `getConvocatorias()` | GET | LoginPage, useConvocatorias | **Duplicada** |
| `getProfesores()` | GET | DashboardPage | Sin cache cliente |
| `getAlumnos()` | GET | useStudents | **Cache en useRef** (por grupo) |
| `getAsistencia()` | GET | useStudents | Sin cache |
| `getResumen()` | GET | DashboardPage | Sin cache cliente |
| `getAsistenciaAlumno()` | GET | StudentDetailPopup | Sin cache (cada apertura) |
| `guardarAsistencia()` | POST | AttendancePage | N/A |

### 5.2 Paralelismo

**Bien implementado:**
- `DashboardPage:39-40` — `Promise.all([getProfesores(), getResumen()])` — PARALELO.
- `useStudents:104-111` — Prefetch de G2-G4 en paralelo (fire-and-forget).
- `LoginPage:45-56` — `Promise.race()` con timeout de 8s.

### 5.3 Waterfall Critico — Dashboard

```
Flujo actual:
1. useConvocatorias → getConvocatorias() ......... ~800ms
2. Espera a que termine (convsLoading = false)
3. LUEGO → Promise.all([getProfesores(), getResumen()]) ... ~800ms
                                                    Total: ~1.6s

Flujo optimizado:
1. Promise.all([
     getConvocatorias(),
     getProfesores()          ← NO depende de convocatoria
   ])                         ............................... ~800ms
2. getResumen(conv.id)        ← SI depende de convocatoria .. ~400ms
                                                    Total: ~1.2s
```

**Ahorro estimado:** ~400ms en carga del Dashboard.

### 5.4 Llamada Duplicada

`getConvocatorias()` se llama en:
1. `LoginPage.jsx:46` — para validar si hay convocatorias activas.
2. `useConvocatorias.js:36` — al montar la siguiente pagina.

**Impacto:** ~400ms extra + request redundante.

### 5.5 Caching Servidor (Service Worker)

```javascript
// API: NetworkFirst, 10s timeout, cache 24h
urlPattern: /^https:\/\/script\.google\.com\/.*/i
handler: 'NetworkFirst'
```

**Problema:** NetworkFirst siempre intenta red primero. No reduce llamadas en uso normal, solo sirve como fallback offline.

### 5.6 Sin Cache Compartido Cliente

No existe un cache global de respuestas API. Cada hook/componente gestiona su propio estado:
- `useStudents` tiene cache local con `useRef` (bueno pero aislado).
- `DashboardPage` re-fetch cada vez que cambia convocatoria.
- `StudentDetailPopup` re-fetch cada vez que se abre.

---

## 6. VITE CONFIG

**Archivo:** `vite.config.js`

### 6.1 Minificacion

- Usa esbuild (default de Vite) — **OK**, es el mas rapido.
- No hay config explicita pero el default es correcto.

### 6.2 Source Maps

- No se generan en produccion — **OK**.
- Verificado: no hay `.map` files ni `sourceMappingURL` en dist.

### 6.3 Compresion

- **No configurada en build.** El hosting (Vercel) aplica gzip automaticamente.
- Falta Brotli — comprime ~15% mejor que gzip en JS.
- Plugin sugerido: `vite-plugin-compression` (genera `.br` y `.gz` en build).

### 6.4 Chunk Splitting

- **No configurado.** Todo en un solo chunk JS.
- Falta `build.rollupOptions.output.manualChunks` para separar:
  - Vendor chunk (react, react-dom, react-router-dom)
  - Paginas como chunks independientes

---

## Tabla de Prioridades — Plan de Accion

| # | Hallazgo | Impacto | Esfuerzo | Ahorro Estimado |
|---|----------|---------|----------|-----------------|
| 1 | **Code-splitting con React.lazy()** en rutas | CRITICO | Bajo | -40 KB en carga teacher, -25 KB en carga CEO |
| 2 | **React.memo()** en StudentRow, TeacherCard, StatCard | CRITICO | Bajo | Elimina ~80% re-renders en listas |
| 3 | **Debounce en searchQuery** del Dashboard | ALTO | Bajo | Elimina filter en cada keystroke |
| 4 | **Paralelizar getProfesores()** con getConvocatorias() | ALTO | Bajo | -400ms en carga Dashboard |
| 5 | **manualChunks** en Vite config (vendor split) | ALTO | Bajo | Cache separado para React (no invalida con cambios de app) |
| 6 | **useCallback** en handlers inline del Dashboard | ALTO | Bajo | Previene re-render de TeacherCards |
| 7 | **Reducir pesos de Google Fonts** (3 pesos max por fuente) | MEDIO | Bajo | -20 KB en fonts WOFF2 |
| 8 | **Iconos PWA dedicados** (192x192 y 512x512 cuadrados) | MEDIO | Bajo | -40 KB en icono PWA + correcta visualizacion |
| 9 | **Eliminar assets sin uso** (logova.png, react.svg, vite.svg) | BAJO | Trivial | -55 KB en precache |
| 10 | **Cache compartido** para respuestas API | MEDIO | Medio | Elimina llamadas duplicadas |
| 11 | **Compresion Brotli** en build | BAJO | Bajo | ~15% mejor que gzip (depende del hosting) |
| 12 | **Memoizar calculos** en TeacherCard (flatMap, reduce) | MEDIO | Bajo | Menos trabajo CPU por re-render |

---

## Metricas Objetivo Post-Optimizacion

| Metrica | Actual | Objetivo |
|---------|--------|----------|
| JS initial load (gzip) | 85 KB (monolitico) | ~55 KB (solo core + ruta activa) |
| Chunks JS | 1 | 3-4 (vendor, core, dashboard, attendance) |
| React.memo en UI components | 0/8 | 8/8 |
| Code-splitting rutas | 0/5 | 4/5 (login siempre eager) |
| Waterfall API Dashboard | 1.6s | 1.2s |
| Re-renders por cambio de grupo | ~50+ | ~5-10 |
| Assets sin uso en build | 3 | 0 |

---

*Informe generado por /optimize_code · performance · deep*
*Siguiente paso: aplicar correcciones en orden de prioridad (pendiente aprobacion)*
