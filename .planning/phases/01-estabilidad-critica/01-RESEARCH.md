# Phase 1: Estabilidad Critica - Research

**Researched:** 2026-03-30
**Domain:** PWA / Workbox, React error handling, Tailwind design tokens, React Router v7 catch-all
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Usar patron **banner inline** para errores. Un banner rojo (bg-error-soft, text-error) aparece dentro de la pagina, arriba del contenido o junto al boton de guardar. Desaparece al reintentar la accion.

**D-02:** Crear componente reutilizable **ErrorBanner.jsx** en `src/components/ui/`. Recibe `message` y `onDismiss` como props. Componente puro sin logica de negocio, siguiendo el patron existente de ui/.

**D-03:** Pagina 404 **branded minima** — fondo `bg-dark-bg`, heading "404" en `font-cinzel` + `text-gold`, mensaje "Pagina no encontrada" en `font-montserrat`, y un boton `bg-burgundy` que navega a `/` (login). Sin animaciones.

**D-04:** Crear token Tailwind `disabled` con valor `#CCCCCC` en `tailwind.config.js` bajo `extend.colors`. Reemplazar `bg-[#CCCCCC]` en Button.jsx y `bg-[#CDCDCD]` en ToggleSwitch.jsx por `bg-disabled`. Nombre semantico que indica para que se usa.

### Claude's Discretion

Fixes mecanicos (PWA-01, PWA-02, PWA-03, ERR-01, ERR-03, COMP-02, COMP-03) tienen implementacion obvia — Claude ejecuta sin necesidad de consultar.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PWA-01 | navigateFallback cambiado de /offline.html a /index.html para que la SPA funcione offline | Audit 04 C1: confirmado — cambio de una linea en vite.config.js workbox.navigateFallback |
| PWA-02 | Regex de runtime caching captura script.googleusercontent.com ademas de script.google.com | Audit 04 C3: confirmado — Google redirige a googleusercontent.com; regex actual no matchea |
| PWA-03 | Manifest PWA tiene start_url, scope, y lang="es" correctos | Audit 04 M3/M4: confirmado — campos ausentes en manifest config de vite.config.js |
| ERR-01 | api.js verifica res.ok antes de parsear JSON y lanza error descriptivo si falla | Audit 01 #1: confirmado — apiGet/apiPost en src/services/api.js carecen de verificacion res.ok |
| ERR-02 | AttendancePage muestra feedback visual al usuario cuando falla guardar o cargar asistencia | Audit 04 C2: confirmado — catch en AttendancePage:62 ya tiene setSaveError, falta integrar ErrorBanner |
| ERR-03 | SavedPage no redirige cuando present === 0 (bug logico corregido) | Audit 01 #7: confirmado — condicion !state.present redirige cuando present===0 (falsy) |
| ERR-04 | Ruta 404/NotFound muestra pagina amigable para URLs invalidas | Audit 01 #14: confirmado — no existe ruta catch-all en App.jsx |
| COMP-01 | 3 hex hardcodeados en Button, ToggleSwitch, MobileContainer reemplazados por tokens Tailwind | Audit 01 #8/#9/#10: confirmado — bg-[#CCCCCC], bg-[#CDCDCD], #111111 localizados |
| COMP-02 | index.html tiene lang="es" en lugar de lang="en" | Audit 04 M4: confirmado — index.html linea 2 tiene lang="en" |
| COMP-03 | npm audit fix resuelve vulnerabilidades conocidas | Audit live: 9 vulnerabilidades (1 moderada, 8 altas), todas en devDependencies/vite-plugin-pwa |
</phase_requirements>

---

## Summary

Esta fase corrige 10 requisitos de estabilidad que hacen la app no-confiable en produccion. Los problemas estan perfectamente localizados gracias a la auditoria previa: tres archivos de configuracion (vite.config.js, tailwind.config.js, index.html), dos archivos de componentes (Button.jsx, ToggleSwitch.jsx), un servicio central (api.js), dos paginas (AttendancePage.jsx, SavedPage.jsx), y dos archivos nuevos a crear (ErrorBanner.jsx, NotFoundPage.jsx, con App.jsx modificado para la ruta catch-all).

La complejidad maxima del trabajo esta en los dos fixes PWA (PWA-01 y PWA-02): cambiar navigateFallback es trivial, pero el fix del regex de cache requiere entender que Google Apps Script redirige todas las peticiones GET de `script.google.com` a `script.googleusercontent.com`. El patron correcto debe incluir ambos dominios con un `|` en el regex. Los fixes de codigo (ERR-01, ERR-02, ERR-03, ERR-04) son cambios quirurgicos de 1 a 10 lineas cada uno. Los fixes de compliance (COMP-01, COMP-02, COMP-03) son puramente mecanicos.

La situacion actual de AttendancePage.jsx es mas avanzada de lo esperado: ya tiene `saveError` state y renderiza el banner inline en el JSX (lineas 161-165). Lo que falta es refactorizar ese bloque ad-hoc al componente reutilizable ErrorBanner decidido en D-02.

**Primary recommendation:** Ejecutar los fixes en orden de dependencia: primero tokens Tailwind (COMP-01, base para ErrorBanner), luego nuevo componente (D-02 ErrorBanner), luego integraciones (ERR-01, ERR-02), luego fixes de paginas (ERR-03, ERR-04), luego configuracion (PWA-01, PWA-02, PWA-03, COMP-02), finalmente npm audit (COMP-03).

---

## Standard Stack

### Core (ya instalado, sin cambios de dependencias)

| Biblioteca | Version | Proposito | Por que es el estandar |
|------------|---------|-----------|----------------------|
| vite-plugin-pwa | ^1.2.0 | Genera service worker con Workbox | Ya instalado — PWA-01/02/03 son solo cambios de config |
| Tailwind CSS | ^3.4.19 | Tokens de diseno | Ya instalado — COMP-01 es solo agregar una entrada en tailwind.config.js |
| React Router DOM | ^7.13.0 | Routing SPA | Ya instalado — ERR-04 usa ruta `path="*"` con React Router |
| Vitest | ^4.0.18 | Test runner | Ya instalado — tests de validacion al final de cada tarea |

### Sin nuevas dependencias

Esta fase no requiere instalar ningun paquete nuevo. Todos los requisitos se resuelven con el stack existente.

| Lo que podria parecer necesario | Por que NO se instala |
|--------------------------------|----------------------|
| react-hot-toast | Decisiones CLAUDE.md: banner inline, cero external UI libs |
| focus-trap-react | No es scope de esta fase (Modal/A11Y son Phase 3) |
| workbox-window | No necesario — fix es cambio de config, no de logica de SW |

---

## Architecture Patterns

### Patron 1: Componente UI puro (aplicar a ErrorBanner.jsx)

Todos los componentes en `src/components/ui/` siguen el mismo patron: export default function, props destructuradas con defaults, clases Tailwind compuestas con array + filter(Boolean).join(' '), JSDoc obligatorio.

```jsx
// Patron establecido en Button.jsx, Badge.jsx, etc.
/**
 * Banner de error inline reutilizable.
 * @param {object} props
 * @param {string} props.message - Mensaje de error a mostrar
 * @param {function} [props.onDismiss] - Callback al cerrar el banner
 */
export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null
  const classes = [
    'flex items-center gap-2 px-3 py-2',
    'bg-error-soft border border-error/30 rounded-lg',
    'text-error text-xs font-montserrat',
  ].join(' ')
  return (
    <div className={classes} role="alert">
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-error/70 hover:text-error font-bold leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>
      )}
    </div>
  )
}
```

### Patron 2: Fix de res.ok en fetch (aplicar en api.js)

El problema en `apiGet` y `apiPost` es que `res.json()` se llama incluso cuando el servidor devuelve HTTP 4xx/5xx con body HTML. El fix es verificar `res.ok` antes de parsear.

```js
// Fuente: audit 01-errores-codigo.md hallazgo #1
// Ubicacion: src/services/api.js:27 (apiGet) y :44 (apiPost)
const res = await fetch(url.toString())
if (!res.ok) {
  throw new Error(`Error HTTP ${res.status}: ${res.statusText}`)
}
const json = await res.json()
```

### Patron 3: Fix de SavedPage (aplicar en SavedPage.jsx)

La condicion `!state.present` es falsa cuando `present === 0` porque 0 es falsy en JavaScript. El fix es verificar `undefined` explicitamente.

```jsx
// Fuente: audit 01-errores-codigo.md hallazgo #7
// Antes (SavedPage.jsx:12):
if (!state || !state.present || state.total === undefined) {

// Despues:
if (!state || state.present === undefined || state.total === undefined) {
```

### Patron 4: Ruta 404 en React Router v7 (aplicar en App.jsx)

React Router v7 usa `path="*"` como ruta catch-all. Debe ser la ultima Route dentro del bloque Routes.

```jsx
// Fuente: documentacion React Router v7 - catch-all routes
// Ubicacion: src/App.jsx — agregar al final de Routes
import NotFoundPage from './pages/NotFoundPage'

// Dentro de <Routes>:
<Route path="*" element={<NotFoundPage />} />
```

La NotFoundPage NO necesita ProtectedRoute — debe ser accesible sin autenticacion para que cualquier URL invalida muestre el 404.

### Patron 5: Token Tailwind disabled (aplicar en tailwind.config.js)

Agregar bajo `extend.colors`. El valor `#CCCCCC` es el que usa Button.jsx actualmente. ToggleSwitch usa `#CDCDCD` (valor ligeramente distinto). Decision D-04 consolida ambos bajo un token semantico `disabled`.

```js
// Fuente: tailwind.config.js existente — solo agregar entrada
extend: {
  colors: {
    // ...colores existentes...
    disabled: '#CCCCCC',  // token semantico para elementos deshabilitados
  }
}
```

Despues del token, los cambios en los componentes son:
- `Button.jsx:32`: `'bg-[#CCCCCC] text-white cursor-not-allowed'` → `'bg-disabled text-white cursor-not-allowed'`
- `ToggleSwitch.jsx:22`: `'bg-[#CDCDCD]'` → `'bg-disabled'`

### Patron 6: MobileContainer hex fix (aplicar en MobileContainer.jsx)

El `#111111` esta dentro de un bloque `<style>` en linea (excepcion documentada para media queries). El token existente `dark-bg: '#111111'` ya esta en tailwind.config.js. Sin embargo, dentro de un bloque `<style>` no se puede usar directamente la clase Tailwind. La solucion es referenciar el valor del token directamente.

```jsx
// Antes (MobileContainer.jsx:15):
background-color: #111111;

// Despues — usar CSS variable o valor directo del token
// El token dark-bg ya existe en tailwind.config.js con valor '#111111'
// La documentacion de Tailwind 3 permite acceder via CSS vars: var(--tw-color-dark-bg)
// Alternativa mas simple y robusta: extraer a src/styles/mobile-container.css
background-color: #111111; /* token: dark-bg — valor canonico en tailwind.config.js */
```

**Nota critica:** Tailwind 3 NO genera CSS variables automaticamente para colores custom en `extend.colors`. Las CSS vars (`var(--tw-...)`) solo existen para los valores de utilidades que Tailwind genera, no para colores custom como `dark-bg`. Por tanto, la referencia directa al hex dentro del bloque `<style>` es la unica opcion sin agregar una CSS var manualmente. La estrategia mas limpia para el planner: mover el bloque `<style>` a `src/styles/mobile-container.css` con un comentario que documente que el valor `#111111` corresponde al token `dark-bg`. Esto no es un inline style — es un archivo CSS separado, cumple con CLAUDE.md.

### Patron 7: PWA navigateFallback fix (vite.config.js)

```js
// Fuente: audit 04-pwa-offline.md hallazgo C1
// Antes:
navigateFallback: '/offline.html',

// Despues:
navigateFallback: '/index.html',
```

La razon: con `navigateFallback: '/offline.html'`, cuando el SW intercepta una navegacion a `/attendance` sin red, sirve la pagina de "sin conexion" en lugar del app shell. Cambiarlo a `/index.html` permite que React Router maneje la ruta dentro de la SPA cacheada.

### Patron 8: PWA runtime caching regex fix (vite.config.js)

```js
// Fuente: audit 04-pwa-offline.md hallazgo C3
// Antes — solo matchea el dominio de envio, no el de respuesta:
urlPattern: /^https:\/\/script\.google\.com\/.*/i,

// Despues — matchea ambos dominios (Google redirige a googleusercontent.com):
urlPattern: /^https:\/\/script\.(google|googleusercontent)\.com\/.*/i,
```

La razon: Google Apps Script devuelve HTTP 302 redirects de `script.google.com` a `script.googleusercontent.com`. Fetch sigue los redirects automaticamente, pero el cache de Workbox solo cachea si la URL final matchea el patron. El patron actual no captura `script.googleusercontent.com`.

### Patron 9: Manifest PWA fields (vite.config.js)

```js
// Fuente: audit 04-pwa-offline.md hallazgo M3
// Agregar al objeto manifest en VitePWA config:
manifest: {
  name: 'NovAttend',
  short_name: 'NovAttend',
  theme_color: '#800000',
  background_color: '#FAFAF8',
  display: 'standalone',
  start_url: '/',      // AGREGAR
  scope: '/',          // AGREGAR
  lang: 'es',          // AGREGAR
  icons: [...]
}
```

### Patron 10: index.html metadata (index.html)

```html
<!-- Antes: -->
<html lang="en">
<title>novattend</title>

<!-- Despues: -->
<html lang="es">
<title>NovAttend</title>
<meta name="theme-color" content="#800000">
```

El `<meta name="theme-color">` es recomendado para que la barra del navegador use el color burgundy en Chrome Android incluso antes de que el SW inyecte el manifest. No es estrictamente parte de PWA-03 pero es el momento correcto para incluirlo junto con el lang fix (COMP-02).

### Anti-Patterns a Evitar

- **No crear NotFoundPage con ProtectedRoute:** La pagina 404 debe ser publica. Un usuario con URL invalida no debe ver el login antes del 404.
- **No usar `navigate('/attendance')` en SavedPage como fallback principal:** El fix de ERR-03 es solo cambiar la condicion de redireccion, no el destino del redirect.
- **No instalar `workbox-window` ni manipular el SW manualmente:** Los tres fixes PWA son puramente de configuracion en vite.config.js.
- **No agregar `navigateFallbackAllowlist`:** Hay un `navigateFallbackDenylist` existente que excluye `/api`. No tocar esto.
- **No usar `bg-gray-300` en lugar de `bg-disabled`:** La decision D-04 especifica un token semantico `disabled`, no una clase generica de Tailwind.

---

## Don't Hand-Roll

| Problema | No construir | Usar en cambio | Por que |
|----------|-------------|----------------|---------|
| Offline SPA navigation | Custom fetch interceptor | Workbox navigateFallback: '/index.html' | Workbox ya lo maneja, es solo config |
| API response validation | Wrapper HTTP custom | if (!res.ok) throw antes de res.json() | 2 lineas, no necesita abstraccion |
| 404 page | Middleware de servidor | React Router path="*" | SPA — el servidor sirve siempre index.html |
| Error display | Toast library externa | ErrorBanner.jsx local | Decision D-02; toast viola patron zero-external-UI |
| Design token | CSS variable manual | tailwind.config.js extend.colors | El sistema de tokens ya existe y funciona |

---

## Common Pitfalls

### Pitfall 1: NotFoundPage dentro de ProtectedRoute
**Que sale mal:** El planner rodea la ruta catch-all con ProtectedRoute para "protegerla", causando que usuarios no autenticados con URL invalida sean redirigidos al login en lugar de ver el 404.
**Por que ocurre:** Inercia — las otras rutas (menos `/`) estan protegidas.
**Como evitar:** La ruta `path="*"` en App.jsx va sin ProtectedRoute. La pagina 404 es siempre publica.
**Signos de alerta:** Navegar a `/foo` sin sesion redirige a `/`.

### Pitfall 2: SavedPage sigue redirigiendo con present=0 despues del fix
**Que sale mal:** El fix cambia `!state.present` por `state.present === undefined` pero hay un segundo check en linea 17 (`if (!state) return null`) que es correcto. Si el planner confunde las dos condiciones y las fusiona, el bug puede persistir.
**Por que ocurre:** La linea 12 y la linea 17 son checks distintos: linea 12 redirige via useEffect (side effect), linea 17 retorna null (render guard). Ambas necesitan existir.
**Como evitar:** Cambiar SOLO la condicion dentro del useEffect en linea 12. No tocar linea 17.
**Signos de alerta:** `npm test` falla en SavedPage test si existe, o navegar manualmente con 0 presentes todavia redirige.

### Pitfall 3: El fix del regex de cache no tiene efecto en desarrollo
**Que sale mal:** El desarrollador cambia el regex en vite.config.js, ejecuta `npm run dev`, y no puede verificar que el cache funcione porque en desarrollo el SW no se activa por defecto con vite-plugin-pwa.
**Por que ocurre:** En modo dev, el SW esta desactivado por defecto con `devOptions: { enabled: false }` (default).
**Como evitar:** Verificar el fix con `npm run build && npm run preview`. En preview mode el SW si se activa. La verificacion visual es abrir DevTools > Application > Cache Storage y confirmar que aparece `api-cache` con respuestas.
**Signos de alerta:** No ver entradas en `api-cache` en DevTools despues de build.

### Pitfall 4: MobileContainer y CSS variables de Tailwind
**Que sale mal:** El planner intenta usar `var(--tw-colors-dark-bg)` dentro del bloque `<style>` de MobileContainer, pero Tailwind 3 no genera CSS vars para colores custom en `extend.colors`.
**Por que ocurre:** Confusion con Tailwind 4 (que si genera CSS vars) o con tokens de `theme()` (que requieren PostCSS).
**Como evitar:** La solucion correcta para COMP-01 en MobileContainer es una de dos: (a) mover el bloque `<style>` a `src/styles/mobile-container.css` con comentario documentando el token, o (b) dejar el hex con un comentario explicativo. Cualquiera cumple con CLAUDE.md. La opcion (a) es mas limpia.
**Signos de alerta:** `npm run build` falla con error de CSS var no definida.

### Pitfall 5: npm audit fix --force puede romper la app
**Que sale mal:** El planner ejecuta `npm audit fix --force` que puede hacer breaking upgrades (ej: actualizar vite-plugin-pwa de 1.x a 2.x con API incompatible).
**Por que ocurre:** `--force` ignora semver y puede actualizar major versions.
**Como evitar:** Ejecutar solo `npm audit fix` (sin --force). Las 9 vulnerabilidades actuales son en devDependencies (undici dentro de vite-plugin-pwa). `npm audit fix` sin flag deberia resolver las que tienen fix disponible sin breaking changes.
**Signos de alerta:** Despues de `npm audit fix`, ejecutar `npm run build` y `npm test` para confirmar que nada se rompio.

### Pitfall 6: ErrorBanner vs banner ad-hoc existente en AttendancePage
**Que sale mal:** AttendancePage.jsx ya tiene un banner de error ad-hoc en lineas 161-165 (bloque div con `bg-error/10`). Si el planner crea ErrorBanner.jsx pero no reemplaza el bloque existente, habra dos implementaciones de banner.
**Por que ocurre:** El planner puede tratar la creacion de ErrorBanner y su integracion como tareas separadas y olvidar la integracion.
**Como evitar:** La tarea de integracion (ERR-02) debe incluir explicitamente: reemplazar el bloque div ad-hoc de lineas 161-165 de AttendancePage con `<ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />`.
**Signos de alerta:** AttendancePage muestra el error pero sin el componente reutilizable.

---

## Code Examples

### ErrorBanner.jsx completo

```jsx
// src/components/ui/ErrorBanner.jsx
/**
 * Banner de error inline reutilizable.
 * @param {object} props
 * @param {string|null} props.message - Mensaje de error. Si es null/empty, no renderiza.
 * @param {function} [props.onDismiss] - Callback al cerrar. Si no se pasa, no muestra boton X.
 */
export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null

  const classes = [
    'flex items-center gap-2 mb-2 px-3 py-2',
    'bg-error-soft border border-error/30 rounded-lg',
    'text-error text-xs font-montserrat',
  ].join(' ')

  return (
    <div className={classes} role="alert">
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-error/70 hover:text-error font-bold text-sm leading-none"
          aria-label="Cerrar error"
        >
          ×
        </button>
      )}
    </div>
  )
}
```

### NotFoundPage.jsx completo (Decision D-03)

```jsx
// src/pages/NotFoundPage.jsx
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'

/**
 * Pagina 404 — ruta no encontrada.
 * Branded minima: fondo oscuro, heading gold, boton a login.
 */
export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-dark-bg flex flex-col items-center justify-center p-8 box-border">
      <h1 className="font-cinzel text-6xl font-bold text-gold m-0 mb-3">
        404
      </h1>
      <p className="font-montserrat text-sm text-white/60 m-0 mb-8 text-center">
        Pagina no encontrada
      </p>
      <Button variant="primary" onClick={() => navigate('/')}>
        Volver al inicio
      </Button>
    </div>
  )
}
```

### App.jsx — ruta catch-all (solo la adicion)

```jsx
// src/App.jsx — agregar import y Route al final de Routes
import NotFoundPage from './pages/NotFoundPage'

// Dentro de <Routes>, despues de todas las rutas existentes:
<Route path="*" element={<NotFoundPage />} />
```

### vite.config.js — los tres fixes PWA juntos

```js
workbox: {
  globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
  navigateFallback: '/index.html',                          // FIX PWA-01
  navigateFallbackDenylist: [/^\/api/],
  runtimeCaching: [
    // ... google fonts sin cambios ...
    {
      urlPattern: /^https:\/\/script\.(google|googleusercontent)\.com\/.*/i,  // FIX PWA-02
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
        networkTimeoutSeconds: 10
      }
    }
  ]
},
manifest: {
  name: 'NovAttend',
  short_name: 'NovAttend',
  theme_color: '#800000',
  background_color: '#FAFAF8',
  display: 'standalone',
  start_url: '/',    // FIX PWA-03
  scope: '/',        // FIX PWA-03
  lang: 'es',        // FIX PWA-03
  icons: [...]
}
```

---

## Runtime State Inventory

Esta fase no es una fase de rename/refactor/migracion. No aplica.

---

## Environment Availability

| Dependencia | Requerida por | Disponible | Version | Fallback |
|-------------|---------------|------------|---------|----------|
| Node.js | Build/test | Si | v24.14.0 | — |
| npm | Dependencias | Si | 11.9.0 | — |
| Vitest | Tests de validacion | Si (en devDeps) | ^4.0.18 | — |

Todos los requisitos se resuelven con archivos locales. No hay dependencias externas nuevas.

---

## Validation Architecture

### Test Framework

| Propiedad | Valor |
|-----------|-------|
| Framework | Vitest ^4.0.18 + @testing-library/react ^16.3.2 |
| Archivo config | vite.config.js (seccion `test:`) |
| Comando rapido | `npm test` |
| Suite completa | `npm test` (sin separacion actualmente) |

### Phase Requirements → Test Map

| ID | Comportamiento | Tipo de test | Comando automatizado | Archivo existe? |
|----|---------------|-------------|---------------------|-----------------|
| PWA-01 | navigateFallback es '/index.html' en config | Manual (build+preview) | `npm run build && npm run preview` | N/A |
| PWA-02 | Regex incluye googleusercontent.com | Unit (verificacion de patron) | `npm test` | No — crear en Wave 0 |
| PWA-03 | Manifest tiene start_url, scope, lang | Manual (build+DevTools) | `npm run build` | N/A |
| ERR-01 | apiGet lanza Error cuando res.ok=false | Unit | `npm test -- api.test` | Si (api.test.jsx — ampliar) |
| ERR-02 | AttendancePage muestra ErrorBanner cuando save falla | Unit (render) | `npm test` | No — crear en Wave 0 |
| ERR-03 | SavedPage no redirige cuando present===0 | Unit | `npm test` | No — crear en Wave 0 |
| ERR-04 | Ruta * muestra NotFoundPage | Unit (routing) | `npm test` | No — crear en Wave 0 |
| COMP-01 | Button y ToggleSwitch usan bg-disabled (no hex) | Unit (className) | `npm test -- Button.test` | Si (Button.test.jsx — ampliar) |
| COMP-02 | index.html tiene lang="es" | Manual (inspeccion) | — | N/A |
| COMP-03 | npm audit reporta 0 vulnerabilidades activas | CLI | `npm audit` | N/A |

### Sampling Rate

- **Por tarea:** `npm test` (todos los tests, < 30s)
- **Por wave merge:** `npm test && npm run lint`
- **Phase gate:** `npm test && npm run lint && npm run build` — todo en verde antes de `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/tests/ErrorBanner.test.jsx` — cubre ERR-02 (renders message, hides when null, calls onDismiss)
- [ ] `src/tests/SavedPage.test.jsx` — cubre ERR-03 (no redirige cuando present===0, si redirige cuando present===undefined)
- [ ] `src/tests/NotFoundPage.test.jsx` — cubre ERR-04 (muestra "404", muestra "Pagina no encontrada", navega a / al click)
- [ ] Ampliar `src/tests/api.test.jsx` — cubre ERR-01 (apiGet lanza cuando !res.ok)
- [ ] Ampliar `src/tests/Button.test.jsx` — cubre COMP-01 (clase contiene 'bg-disabled' en variant disabled)

---

## State of the Art

| Enfoque anterior | Enfoque actual | Cuando cambio | Impacto |
|-----------------|----------------|---------------|---------|
| navigateFallback: '/offline.html' | navigateFallback: '/index.html' | Este milestone | SPA funciona offline en lugar de mostrar pagina de error |
| Regex solo script.google.com | Regex script.(google|googleusercontent).com | Este milestone | Cache de API realmente funciona en produccion |
| Hex hardcodeados en componentes | Tokens Tailwind semanticos | Este milestone | 100% adherencia al design system |
| Banner ad-hoc en AttendancePage | ErrorBanner.jsx reutilizable | Este milestone | Patron unificado para errores de API en toda la app |

---

## Open Questions

1. **MobileContainer COMP-01 strategy**
   - Lo que sabemos: Tailwind 3 no genera CSS vars para colores custom. El hex `#111111` esta en un bloque `<style>` (excepcion documentada).
   - Lo que no esta claro: Si el planner debe (a) mover el CSS a `src/styles/mobile-container.css` o (b) dejar el hex con comentario de documentacion.
   - Recomendacion: Usar estrategia (a) — crear `src/styles/mobile-container.css` e importarlo en MobileContainer.jsx. Es mas limpio y elimina el bloque `<style>` del JSX. El valor `#111111` tiene un comentario que referencia el token `dark-bg`.

2. **ErrorBanner en useStudents (ERR-02 alcance)**
   - Lo que sabemos: ERR-02 dice "AttendancePage muestra feedback cuando falla **guardar o cargar** asistencia". AttendancePage ya maneja el error de guardado (saveError state). El error de carga esta en `useStudents.js` que setea `students=[]` en el catch sin propagar el error.
   - Lo que no esta claro: Si ERR-02 cubre solo el guardado (ya implementado parcialmente) o tambien requiere error de carga.
   - Recomendacion: Cubrir ambos casos — el hook `useStudents` deberia exponer un `loadError` state, y AttendancePage deberia mostrar ErrorBanner cuando `loadError` es truthy. Esto completa el criterio de exito #2 de la fase.

---

## Project Constraints (from CLAUDE.md)

Directivas obligatorias aplicables a esta fase:

| Directiva | Aplicacion en esta fase |
|-----------|------------------------|
| CERO estilos inline | ErrorBanner.jsx y NotFoundPage.jsx — cero style={{}} |
| Max 250 lineas por archivo | Todos los archivos nuevos/modificados < 250 lineas |
| Prohibido hardcodear hex | COMP-01 es exactamente este fix; ErrorBanner y NotFoundPage usan solo tokens |
| UI/comentarios en espanol | Textos de ErrorBanner y NotFoundPage en espanol; JSDoc en espanol |
| Codigo en ingles | Nombres de componentes, variables, funciones en ingles |
| JSDoc obligatorio en nuevos componentes | ErrorBanner.jsx y NotFoundPage.jsx requieren JSDoc con @param |
| `npm run lint` antes de entrega | Verificacion obligatoria al final de cada tarea |
| GSD workflow | Todas las modificaciones via /gsd:execute-phase |

---

## Sources

### Primary (HIGH confidence)

- Auditoria `docs/auditoria/01-errores-codigo.md` — lista exacta de bugs con numeros de linea
- Auditoria `docs/auditoria/04-pwa-offline.md` — analisis detallado de config PWA y hallazgos
- Codigo fuente verificado directamente: `vite.config.js`, `src/services/api.js`, `src/pages/AttendancePage.jsx`, `src/pages/SavedPage.jsx`, `src/components/ui/Button.jsx`, `src/components/ui/ToggleSwitch.jsx`, `tailwind.config.js`, `index.html`, `src/App.jsx`
- `.planning/codebase/CONCERNS.md` — analisis de deuda tecnica y localizacion exacta de problemas
- `.planning/codebase/CONVENTIONS.md` — patrones establecidos (variant pattern, error handling, JSDoc)
- `01-CONTEXT.md` — decisiones bloqueadas del usuario (D-01 a D-04)

### Secondary (MEDIUM confidence)

- `docs/auditoria/06-score-calidad.md` — score actual 7.3/10, metricas de compliance
- Tests existentes en `src/tests/` — estructura y patrones de test establecidos
- `npm audit` output en vivo — 9 vulnerabilidades confirmadas (1 moderada, 8 altas)

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — todo el stack ya esta instalado, cero dependencias nuevas
- Architecture patterns: HIGH — todos los patterns son cambios quirurgicos a codigo existente verificado
- Pitfalls: HIGH — identificados directamente del codigo fuente y las auditorias
- Test architecture: MEDIUM — test gaps identificados, patrones de test existentes son claros

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stack estable, sin dependencias en flux)
