# Auditoria PWA y Comportamiento Offline — NovAttend

**Fecha:** 2026-03-30
**Auditor:** Claude Opus 4.6
**Commit base:** 79b2be9

---

## 1. Service Worker (vite-plugin-pwa + Workbox)

### 1.1 Configuracion en `vite.config.js`

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Plugin instalado | OK | `vite-plugin-pwa@1.2.0` en devDependencies |
| `registerType` | OK | `autoUpdate` — SW se actualiza sin prompt al usuario |
| `globPatterns` | OK | `**/*.{js,css,html,png,svg,ico,woff2}` — precachea app shell |
| `navigateFallback` | OK | `/offline.html` — fallback para navegacion SPA |
| `navigateFallbackDenylist` | OK | `/^\/api/` — excluye rutas API del fallback |

### 1.2 Estrategias de cache por recurso

| Recurso | Handler | Cache Name | TTL | Timeout |
|---------|---------|------------|-----|---------|
| Google Fonts CSS | `CacheFirst` | `google-fonts-css` | 365 dias | — |
| Google Fonts WOFF2 | `CacheFirst` | `google-fonts-woff2` | 365 dias | — |
| Apps Script API | `NetworkFirst` | `api-cache` | 24 horas | 10s |
| Assets estaticos (JS/CSS/HTML) | `precache` (Workbox default) | Workbox precache | Versionado por hash | — |

### 1.3 Actualizacion de assets

- **`registerType: 'autoUpdate'`** significa que Workbox activa el nuevo SW automaticamente sin pedirle al usuario.
- Los assets precacheados se versionan por content hash en el manifiesto de Workbox — se actualizan con cada build.
- **RIESGO:** No hay ningun UI que avise al usuario "hay una version nueva, recarga". El SW se actualiza en segundo plano pero la pagina actual sigue sirviendo JS viejo hasta el proximo `window.location.reload()`. Si el usuario deja la pestaña abierta largo tiempo, puede estar usando JS obsoleto.

---

## 2. Comportamiento Offline — HALLAZGOS CRITICOS

### 2.1 Apertura de la app sin WiFi

| Escenario | Resultado |
|-----------|-----------|
| Primera visita (nunca cacheado) | FALLO TOTAL — pantalla en blanco o error del navegador |
| Visita posterior (app shell cacheado) | PARCIAL — carga app shell desde precache, pero... |
| Navegacion a ruta SPA (ej: `/attendance`) | Sirve `offline.html` via `navigateFallback` |

**Problema clave:** `navigateFallback: '/offline.html'` intercepta TODAS las rutas de navegacion cuando no hay red. Esto significa que si el usuario abre la app cacheada e intenta navegar a `/attendance`, ve la pagina de "Sin conexion" en vez de la SPA cacheada. La app shell (JS/CSS) esta en precache, pero el SW redirige la navegacion a `offline.html` en vez de servir `index.html` cacheado.

**Solucion esperada:** El `navigateFallback` deberia ser `/index.html` (el entry point de la SPA), no `/offline.html`. El `offline.html` deberia ser un ultimo recurso cuando ni `index.html` esta en cache.

### 2.2 Guardar asistencia offline

| Pregunta | Respuesta |
|----------|-----------|
| ¿Hay cola de sincronizacion offline? | **NO** |
| ¿Se usa Background Sync API? | **NO** |
| ¿Se almacenan datos pendientes en IndexedDB/localStorage? | **NO** |
| ¿`guardarAsistencia()` tiene retry automatico? | **NO** |

**Impacto:** Si el profesor esta en una zona sin cobertura y marca asistencia, al pulsar "Guardar" la llamada a `apiPost()` falla silenciosamente (el `catch` en `AttendancePage:60-62` solo hace `setSaving(false)` sin mostrar mensaje de error). El profesor no sabe si se guardo o no.

### 2.3 Login sin conexion

| Pregunta | Respuesta |
|----------|-----------|
| ¿Login funciona offline si ya te habias logueado? | **NO** — la validacion de credenciales es local (`USERS` en config), pero tras login exitoso se llama `getConvocatorias()` que falla sin red |
| ¿Que pasa si `getConvocatorias()` falla? | Se muestra error "Error al conectar con el servidor. Reintenta." (OK, hay feedback) |
| ¿El timeout de 8s funciona? | Si, hay `Promise.race` con timeout de 8000ms |
| ¿Se redirige al modo mock? | **NO** — si la API esta habilitada (hay `VITE_API_URL`) y falla la red, se bloquea. No hay fallback a datos cacheados |

### 2.4 Cache de datos de ultima sesion

| Pregunta | Respuesta |
|----------|-----------|
| ¿Se cachean los datos de la API en localStorage/IndexedDB? | **NO** — solo cache de Workbox (runtime caching `NetworkFirst` con TTL 24h) |
| ¿Workbox sirve respuestas cacheadas? | **SI, pero...** — con `NetworkFirst` + timeout 10s, tras el timeout sirve cache. Pero las respuestas de Apps Script redirigen (302) a `script.googleusercontent.com`, y el patron regex solo matchea `script.google.com` |
| ¿El `useRef` cache en `useStudents` persiste entre sesiones? | **NO** — es cache en memoria (React ref), se pierde al cerrar/recargar |

**Problema critico del runtime caching:** El patron `urlPattern: /^https:\/\/script\.google\.com\/.*/i` probablemente NO captura las respuestas reales de Apps Script, ya que Google redirige las peticiones a `script.googleusercontent.com` (dominio distinto). Esto significa que el cache `api-cache` podria estar vacio.

---

## 3. Fallbacks por Pantalla

### 3.1 LoginPage (`src/pages/LoginPage.jsx`)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| try/catch en API call | OK | `getConvocatorias()` envuelto en try/catch (linea 46-58) |
| Timeout | OK | 8s via `Promise.race` (linea 43) |
| Estado de loading | OK | `setLoading(true)` con boton que muestra "Cargando..." |
| Mensaje de error | OK | "Error al conectar con el servidor. Reintenta." |
| Feedback visual del boton | OK | Componente `Button` con prop `loading` |

**Veredicto: ACEPTABLE** — Es la pantalla mejor protegida.

### 3.2 ConvocatoriaPage (`src/pages/ConvocatoriaPage.jsx`)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| try/catch en API call | N/A | No hace llamadas API propias (recibe datos via `location.state`) |
| Estado vacio | OK | Muestra "No hay convocatorias activas" si array vacio |
| Perdida de state al recargar | PROBLEMA | Si el usuario recarga (F5), `location.state` es `null` y ve lista vacia sin explicacion |

**Veredicto: RIESGO BAJO** — Solo falla en edge case de recarga.

### 3.3 AttendancePage (`src/pages/AttendancePage.jsx`)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| try/catch en carga de alumnos | PARCIAL | `useStudents` hook tiene catch (linea 69) pero muestra lista vacia sin mensaje de error |
| Estado de loading | OK | Skeletons animados (lineas 128-139) |
| Error al cargar alumnos | PROBLEMA | `catch` en `useStudents:69` pone `setStudents([])` — el usuario ve "Alumnos · G1" con lista vacia, sin saber por que |
| Feedback del boton guardar | PARCIAL | Loading OK (`saving` state), pero error silencioso — `catch` en linea 60-62 solo hace `setSaving(false)`, **sin mensaje de error al usuario** |
| Error de red al guardar | CRITICO | No hay feedback. El profesor pulsa guardar, ve que deja de hacer loading, pero no sabe si se guardo |

**Veredicto: PROBLEMATICO** — Errores silenciosos en la pantalla mas critica.

### 3.4 DashboardPage (`src/pages/DashboardPage.jsx`)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| try/catch en API calls | OK | `loadConvData` envuelto en catch (linea 72-77) |
| Estado de loading | OK | Skeleton completo (lineas 136-165) |
| Estado de error | OK | Muestra mensaje de error + boton "Reintentar" (lineas 168-177) |
| Reload | OK | Hook `useConvocatorias` expone `reload()` |

**Veredicto: BIEN IMPLEMENTADO** — Es la pantalla con mejor manejo de errores.

### 3.5 SavedPage (`src/pages/SavedPage.jsx`)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Sin API calls | OK | Solo muestra datos del state |
| Perdida de state | OK | Redirige a `/attendance` si no hay state (linea 12-14) |

**Veredicto: SIN RIESGO**

---

## 4. Manifest y Metadata

### 4.1 Campos del manifest (generado por vite-plugin-pwa)

| Campo | Valor | Estado |
|-------|-------|--------|
| `name` | "NovAttend" | OK |
| `short_name` | "NovAttend" | OK |
| `theme_color` | `#800000` (burgundy) | OK |
| `background_color` | `#FAFAF8` (off-white) | DISCUTIBLE — el login tiene fondo `burgundy-dark`, no off-white. El splash screen mostrara fondo claro y luego saltar a oscuro |
| `display` | `standalone` | OK |
| `start_url` | (no definido) | AUSENTE — deberia ser `/` |
| `scope` | (no definido) | AUSENTE — deberia ser `/` |
| `description` | (no definido) | AUSENTE — recomendable para tiendas y motores de busqueda |
| `orientation` | (no definido) | AUSENTE — recomendable `portrait` para app mobile-first |
| `lang` | (no definido) | AUSENTE — deberia ser `es` |
| `categories` | (no definido) | AUSENTE — recomendable `["education", "productivity"]` |

### 4.2 Iconos PWA

| Tamano | Archivo | Estado |
|--------|---------|--------|
| 192x192 | `/logova1.png` | PROBLEMA — es el mismo archivo para ambos tamanos |
| 512x512 | `/logova1.png` | PROBLEMA — archivo de ~64KB, probablemente una sola resolucion |
| `purpose: maskable` | (no definido) | AUSENTE — necesario para iconos adaptativos en Android |
| `purpose: any` | (no definido) | AUSENTE (implicito pero recomendable ser explicito) |
| apple-touch-icon | `/logova1.png` | OK — definido en `index.html` |
| favicon | `/logova1.png` | OK — definido en `index.html` |

**Problema:** Usar el mismo PNG para 192x192 y 512x512 causa que Android/iOS escale la imagen. Lo correcto es tener archivos separados optimizados para cada tamano.

### 4.3 "Add to Home Screen"

- **Android:** Deberia funcionar (tiene manifest con name + icons + display:standalone). Falta `start_url` que algunos navegadores requieren.
- **iOS:** Funciona via "Agregar a inicio" de Safari. El apple-touch-icon esta definido.
- **Instalabilidad Chrome:** Requiere service worker + manifest + no errores de consola. Deberia pasar.

### 4.4 Metadata en `index.html`

| Campo | Estado | Detalle |
|-------|--------|---------|
| `<html lang>` | PROBLEMA | `lang="en"` pero la app es en espanol. Deberia ser `lang="es"` |
| `<title>` | PROBLEMA | `novattend` en minusculas. Deberia ser `NovAttend` |
| `<meta name="description">` | AUSENTE | Necesario para SEO y compartir |
| `<meta name="theme-color">` | AUSENTE en HTML | Solo esta en manifest (Workbox lo inyecta), pero el `offline.html` si lo tiene |

---

## 5. Actualizaciones de la PWA

### 5.1 Deteccion de version nueva

- **Mecanismo:** `registerType: 'autoUpdate'` — Workbox comprueba si hay un nuevo SW en cada visita (via byte-diff del SW file).
- **Cuando:** Al abrir la app o al hacer focus en la pestaña (comportamiento default del navegador).
- **Frecuencia:** Cada vez que Vite genera un nuevo build y se despliega.

### 5.2 Notificacion al usuario

| Pregunta | Respuesta |
|----------|-----------|
| ¿Se avisa al usuario de la actualizacion? | **NO** |
| ¿Hay UI de "nueva version disponible"? | **NO** |
| ¿Se fuerza recarga automatica? | **NO** — el SW se instala pero la pagina sigue con JS viejo |

**Riesgo:** Con `autoUpdate`, el nuevo SW se activa pero los `clients` (pestanas) no se recargan. El usuario puede estar usando JS/HTML viejo hasta que cierre y reabra la app o haga F5 manualmente.

**Alternativa recomendada:** Usar `registerType: 'prompt'` con un banner tipo "Hay una actualizacion disponible. ¿Recargar?" — o al menos escuchar el evento `controllerchange` para forzar un `window.location.reload()`.

### 5.3 Cache obsoleto

El cache de Workbox puede servir respuestas API obsoletas:
- `api-cache` tiene `maxAgeSeconds: 86400` (24h) — un dia entero de datos potencialmente desactualizados.
- Con `NetworkFirst` + timeout 10s, si la red es lenta (no caida, lenta), el usuario podria ver datos de hace 24h.
- **No hay mecanismo para invalidar el cache manualmente** (ej: boton "refrescar datos").

---

## 6. Resumen de Hallazgos por Severidad

### CRITICOS (requieren accion)

| # | Hallazgo | Pantalla | Impacto |
|---|----------|----------|---------|
| C1 | `navigateFallback` apunta a `offline.html` en vez de `index.html` | Toda la app | Offline, la SPA no carga — siempre muestra pagina de sin conexion |
| C2 | Error silencioso al guardar asistencia | AttendancePage | Profesor no sabe si se guardo la asistencia |
| C3 | Regex de API cache no matchea el dominio real de respuesta | Runtime caching | Cache de API probablemente vacio, `NetworkFirst` nunca sirve fallback |

### ALTOS

| # | Hallazgo | Pantalla | Impacto |
|---|----------|----------|---------|
| A1 | Sin cola de sincronizacion offline para asistencia | AttendancePage | Datos perdidos si no hay red al guardar |
| A2 | Error silencioso al cargar alumnos (lista vacia sin explicacion) | AttendancePage | Profesor confundido, cree que no hay alumnos |
| A3 | Sin notificacion de actualizacion de PWA | Global | Usuario puede usar version vieja indefinidamente |

### MEDIOS

| # | Hallazgo | Pantalla | Impacto |
|---|----------|----------|---------|
| M1 | `background_color` no coincide con pantalla de login | Manifest | Flash de color en splash screen |
| M2 | Mismo PNG para iconos 192 y 512 | Manifest | Icono borroso en pantallas HD |
| M3 | Faltan campos de manifest (`start_url`, `scope`, `orientation`, `lang`) | Manifest | Menor instalabilidad/compatibilidad |
| M4 | `<html lang="en">` deberia ser `"es"` | index.html | Accesibilidad y SEO incorrecto |
| M5 | `<title>` en minusculas ("novattend") | index.html | Branding inconsistente |
| M6 | Falta `<meta name="description">` | index.html | SEO y preview al compartir |
| M7 | Falta icono `maskable` para Android | Manifest | Icono con forma incorrecta en launchers |
| M8 | Sin `<meta name="theme-color">` en `index.html` | index.html | Barra de navegador sin color brand |

### BAJOS

| # | Hallazgo | Pantalla | Impacto |
|---|----------|----------|---------|
| B1 | `location.state` se pierde al recargar (F5) | ConvocatoriaPage | Edge case menor, usuario puede volver atras |
| B2 | Cache de API permite 24h de datos obsoletos | DashboardPage | Datos desactualizados si la red es lenta |

---

## 7. Mapa de Riesgo Offline por Pantalla

```
Pantalla              Carga sin red    Error feedback    Guardar offline
─────────────────────────────────────────────────────────────────────
LoginPage             PARCIAL          OK                N/A
ConvocatoriaPage      NO (state lost)  PARCIAL           N/A
AttendancePage        NO               FALLA             FALLA
SavedPage             NO (state lost)  N/A               N/A
DashboardPage         NO               OK                N/A
```

---

## 8. Archivos Relevantes

- `vite.config.js:14-59` — Configuracion completa de VitePWA
- `public/offline.html` — Pagina de fallback offline (158 lineas, bien disenada)
- `src/services/api.js` — Capa de API sin retry ni queue offline
- `src/hooks/useStudents.js:69` — catch silencioso al cargar alumnos
- `src/pages/AttendancePage.jsx:60-62` — catch silencioso al guardar
- `src/pages/LoginPage.jsx:43-58` — unico flujo con timeout + feedback adecuado
- `src/pages/DashboardPage.jsx:168-177` — mejor implementacion de error state
- `index.html:2` — `lang="en"` incorrecto

---

*Nota: Este informe es de solo lectura. No se ha modificado ningun archivo del proyecto.*
