# 00 — Resumen Ejecutivo de Auditoria

**Proyecto:** NovAttend
**Fecha:** 2026-03-30
**Fuentes:** Informes 01-errores-codigo, 02-grafo-dependencias, 03-rendimiento, 04-pwa-offline, 05-seguridad, 06-score-calidad
**Score global:** 7.3 / 10

---

## TOP 10 Problemas Criticos (ordenados por impacto)

### #1 — Contrasenas hardcodeadas visibles en bundle de produccion
- **Que:** Las 8 contrasenas (7 profesores + CEO) estan en texto plano en `src/config/users.js`. Al compilar, quedan legibles en DevTools > Sources.
- **Donde:** `src/config/users.js` (todas las lineas) + `src/pages/LoginPage.jsx:27` (guarda password en sessionStorage)
- **Fuente:** 05-seguridad [C-01, C-02]
- **Esfuerzo:** Alto (~8h) — Requiere mover autenticacion al backend Apps Script con `doPost` + verificacion server-side, excluir password del objeto en sessionStorage, y eliminar `users.js`.

### #2 — API de Apps Script sin autenticacion
- **Que:** El endpoint de Google Apps Script es publico (`Access-Control-Allow-Origin: *`). Cualquier persona con la URL puede leer alumnos, guardar asistencia falsa o crear registros.
- **Donde:** `src/services/api.js` (todas las funciones) + backend `Code.gs`
- **Fuente:** 05-seguridad [A-01, A-02]
- **Esfuerzo:** Alto (~6h) — Implementar token secreto o API key en Apps Script, enviar token desde el frontend en cada request, validar en `doGet`/`doPost`.

### #3 — Autenticacion 100% client-side, bypasseable
- **Que:** Login valida contra lista local. Se puede inyectar `sessionStorage.setItem('user', '{"role":"ceo"}')` desde consola y acceder a cualquier ruta. ProtectedRoute no verifica contra servidor.
- **Donde:** `src/pages/LoginPage.jsx:18-21` + `src/components/ProtectedRoute.jsx:9-16`
- **Fuente:** 05-seguridad [A-03, A-04]
- **Esfuerzo:** Alto (~6h) — Vinculado a #1. Al implementar auth server-side, ProtectedRoute debe validar sesion contra backend.

### #4 — PWA offline rota: navigateFallback apunta a offline.html
- **Que:** `navigateFallback: '/offline.html'` intercepta TODAS las rutas cuando no hay red. La SPA cacheada no se sirve — siempre muestra "Sin conexion" aunque el app shell este en precache.
- **Donde:** `vite.config.js` (linea de navigateFallback)
- **Fuente:** 04-pwa-offline [C1]
- **Esfuerzo:** Bajo (~30min) — Cambiar `navigateFallback` de `/offline.html` a `/index.html`.

### #5 — Regex de cache API no matchea dominio real
- **Que:** El patron `/^https:\/\/script\.google\.com\/.*/i` no captura las respuestas reales de Apps Script que redirigen a `script.googleusercontent.com`. El cache `api-cache` esta probablemente vacio.
- **Donde:** `vite.config.js` (runtimeCaching, urlPattern de API)
- **Fuente:** 04-pwa-offline [C3]
- **Esfuerzo:** Bajo (~30min) — Ampliar regex a `/(script\.google\.com|script\.googleusercontent\.com)/`.

### #6 — Sin code-splitting: monolito JS de 271 KB
- **Que:** Las 5 paginas se importan sincronamente en `App.jsx`. Todo el codigo de Dashboard (CEO) se carga para teachers y viceversa. Sin `React.lazy()`, sin `manualChunks`.
- **Donde:** `src/App.jsx:5-9` + `vite.config.js` (sin `build.rollupOptions`)
- **Fuente:** 03-rendimiento [Hallazgo 1]
- **Esfuerzo:** Bajo (~2h) — `React.lazy()` + `Suspense` en 4 rutas post-login. Agregar `manualChunks` para vendor split.

### #7 — Errores silenciosos en AttendancePage (pantalla critica)
- **Que:** Al guardar asistencia, si falla la API el `catch` solo hace `setSaving(false)` sin feedback. Al cargar alumnos, el error muestra lista vacia sin explicacion. El profesor no sabe que paso.
- **Donde:** `src/pages/AttendancePage.jsx:60-62` (guardar) + `src/hooks/useStudents.js:69` (cargar)
- **Fuente:** 01-errores-codigo [#4] + 04-pwa-offline [C2, A2]
- **Esfuerzo:** Bajo (~1.5h) — Agregar estado de error + toast/banner de feedback en ambos flujos.

### #8 — Sin React.memo: cascada de re-renders en listas
- **Que:** Ningun componente UI ni feature usa `React.memo()`. StudentRow (12+ instancias) y TeacherCard re-renderizan en cascada con cada cambio de estado del padre. Dashboard sin debounce en busqueda.
- **Donde:** `src/components/features/StudentRow.jsx`, `TeacherCard.jsx`, `src/pages/DashboardPage.jsx:130-133`
- **Fuente:** 03-rendimiento [Hallazgo 2, 3]
- **Esfuerzo:** Bajo (~2h) — `React.memo()` en StudentRow, TeacherCard, StatCard. Debounce en searchQuery.

### #9 — DashboardPage excede 250 lineas + acoplamiento excesivo
- **Que:** 272 lineas (viola limite CLAUDE.md). 14 dependencias directas (fan-out excesivo). Mezcla orquestacion, calculos y presentacion.
- **Donde:** `src/pages/DashboardPage.jsx`
- **Fuente:** 01-errores-codigo [#2] + 02-grafo-dependencias [Seccion 4.2]
- **Esfuerzo:** Medio (~3h) — Extraer hooks `useTeacherData()`, `useAlertStudents()` y subcomponentes para bajar a <200 lineas.

### #10 — Accesibilidad: Modal sin focus trap + falta cobertura ARIA
- **Que:** Modal/StudentDetailPopup no atrapa foco (tabulacion escapa). Sin Escape para cerrar. Solo 3 de 19 componentes tienen atributos ARIA. TeacherCard expandible sin soporte de teclado.
- **Donde:** `src/components/ui/Modal.jsx`, `src/components/features/StudentDetailPopup.jsx`, `src/components/features/TeacherCard.jsx`
- **Fuente:** 06-score-calidad [Seccion 7 — Accesibilidad: 5.0/10]
- **Esfuerzo:** Medio (~3h) — Focus trap + Escape en Modal, `tabIndex`/`onKeyDown` en TeacherCard, ARIA labels en componentes clave.

---

## Problemas adicionales relevantes (fuera del TOP 10)

| ID | Problema | Donde | Esfuerzo |
|----|----------|-------|----------|
| #11 | Bug logico: `present === 0` redirige en SavedPage | `SavedPage.jsx:12` | 10min |
| #12 | 3 hex hardcodeados violan design system | `Button.jsx:32`, `ToggleSwitch.jsx:22`, `MobileContainer.jsx:15` | 30min |
| #13 | `api.js` no verifica `res.ok` antes de parsear JSON | `src/services/api.js:27` | 30min |
| #14 | JSDoc faltante en 11 componentes | 11 archivos (ver informe 01 #11) | 2h |
| #15 | Cobertura de tests: 35% (objetivo: 60%) | 15 modulos sin tests | 8h+ |
| #16 | `html lang="en"` deberia ser `"es"` | `index.html:2` | 5min |
| #17 | Sin ruta 404/NotFound | `src/App.jsx` | 30min |
| #18 | 9 vulnerabilidades npm (mayoria devDeps) | `package-lock.json` | 30min |
| #19 | Waterfall API en Dashboard (400ms extra) | `DashboardPage.jsx` | 1h |
| #20 | Manifest PWA incompleto (falta start_url, scope, lang) | `vite.config.js` | 30min |

---

## Plan de Accion Recomendado

### Ola 1 — Fixes criticos y rapidos (1 dia)
> Objetivo: eliminar bugs y funcionalidad offline rota

| Orden | Problema | Ref | Tiempo |
|-------|----------|-----|--------|
| 1.1 | Corregir `navigateFallback` → `/index.html` | #4 | 30min |
| 1.2 | Corregir regex de cache API | #5 | 30min |
| 1.3 | Fix bug `present === 0` en SavedPage | #11 | 10min |
| 1.4 | Agregar `if (!res.ok)` en api.js | #13 | 30min |
| 1.5 | Feedback de error en AttendancePage (guardar + cargar) | #7 | 1.5h |
| 1.6 | Reemplazar hex hardcodeados | #12 | 30min |
| 1.7 | Corregir `html lang="es"` + metadata | #16, #20 | 30min |
| 1.8 | `npm audit fix` | #18 | 30min |
| | **Subtotal Ola 1** | | **~5h** |

### Ola 2 — Rendimiento (1 dia)
> Objetivo: code-splitting, memo, debounce

| Orden | Problema | Ref | Tiempo |
|-------|----------|-----|--------|
| 2.1 | React.lazy() + Suspense en 4 rutas | #6 | 2h |
| 2.2 | React.memo en StudentRow, TeacherCard, StatCard | #8 | 1.5h |
| 2.3 | Debounce en searchQuery del Dashboard | #8 | 30min |
| 2.4 | manualChunks en vite.config.js (vendor split) | #6 | 30min |
| 2.5 | Paralelizar getConvocatorias + getProfesores | #19 | 1h |
| | **Subtotal Ola 2** | | **~5.5h** |

### Ola 3 — Arquitectura y mantenibilidad (1-2 dias)
> Objetivo: deuda tecnica, violaciones de capas, DashboardPage

| Orden | Problema | Ref | Tiempo |
|-------|----------|-----|--------|
| 3.1 | Refactorizar DashboardPage (<250 lineas) | #9 | 3h |
| 3.2 | Agregar ruta 404/NotFound | #17 | 30min |
| 3.3 | Focus trap + Escape en Modal | #10 | 1.5h |
| 3.4 | Soporte teclado en TeacherCard | #10 | 1h |
| 3.5 | JSDoc en 11 componentes faltantes | #14 | 2h |
| | **Subtotal Ola 3** | | **~8h** |

### Ola 4 — Seguridad (2-3 dias)
> Objetivo: migrar autenticacion a server-side

| Orden | Problema | Ref | Tiempo |
|-------|----------|-----|--------|
| 4.1 | Endpoint de login en Apps Script (doPost) | #1, #3 | 4h |
| 4.2 | Token de sesion server-side (no passwords en bundle) | #1 | 4h |
| 4.3 | API key/token en todos los endpoints | #2 | 3h |
| 4.4 | ProtectedRoute con validacion server-side | #3 | 2h |
| 4.5 | Headers de seguridad en vercel.json (CSP, X-Frame) | — | 1h |
| 4.6 | Eliminar `src/config/users.js` | #1 | 30min |
| | **Subtotal Ola 4** | | **~15h** |

### Ola 5 — Tests y calidad (2+ dias)
> Objetivo: subir cobertura de 35% a 60%+

| Orden | Problema | Ref | Tiempo |
|-------|----------|-----|--------|
| 5.1 | Tests para useStudents y useConvocatorias (hooks) | #15 | 3h |
| 5.2 | Tests para AttendancePage y DashboardPage | #15 | 3h |
| 5.3 | Tests para Modal, Avatar, ProgressBar | #15 | 2h |
| | **Subtotal Ola 5** | | **~8h** |

---

## Estimacion de Tiempo Total

| Ola | Foco | Tiempo | Acumulado |
|-----|------|--------|-----------|
| 1 | Fixes criticos y rapidos | ~5h | 5h |
| 2 | Rendimiento | ~5.5h | 10.5h |
| 3 | Arquitectura y mantenibilidad | ~8h | 18.5h |
| 4 | Seguridad (auth server-side) | ~15h | 33.5h |
| 5 | Tests y calidad | ~8h | 41.5h |
| | **TOTAL** | **~42h** | |

> **Nota:** Las Olas 1-3 (~19h) resuelven el 80% de los problemas funcionales y de rendimiento. La Ola 4 es la mas compleja porque implica cambios en el backend de Apps Script. La Ola 5 es incremental y puede intercalarse con las demas.

---

## Score Esperado Post-Correccion

| Area | Actual | Post-Ola 1-3 | Post-Ola 4-5 |
|------|--------|--------------|--------------|
| Estructura | 8.0 | 8.5 | 8.5 |
| Consistencia | 7.5 | 8.5 | 9.0 |
| Manejo de errores | 6.5 | 8.0 | 8.5 |
| Rendimiento | 6.5 | 8.5 | 8.5 |
| PWA | 7.0 | 8.5 | 9.0 |
| Seguridad | 4.5 | 5.0 | 8.0 |
| Accesibilidad | 5.0 | 7.0 | 7.5 |
| UX/UI | 9.0 | 9.0 | 9.0 |
| Mantenibilidad | 7.5 | 8.5 | 9.0 |
| Produccion | 6.5 | 7.5 | 8.5 |
| **GLOBAL** | **7.3** | **~8.0** | **~8.5** |

---

*Este documento es el input para GSD. Cada Ola puede mapearse a una o mas fases del roadmap.*
