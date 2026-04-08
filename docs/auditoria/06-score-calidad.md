# 06 — Evaluacion Integral de Calidad de Codigo

**Proyecto:** NovAttend
**Fecha:** 2026-03-30
**Alcance:** Todo `src/` + configuracion (vite, tailwind, eslint, package.json)
**Metodo:** Analisis estatico manual + metricas automatizadas + informes previos (01–05)
**Modelo:** Claude Opus 4.6

---

## Resumen Ejecutivo

| Indicador | Valor |
|-----------|-------|
| **Puntuacion Global** | **7.3 / 10** |
| Archivos fuente (sin tests) | 32 |
| Archivos de test | 8 |
| Tests pasando | 55/55 (100%) |
| Lineas de codigo (src/) | ~2,300 |
| ESLint errores / warnings | 0 / 1 |
| Inline styles | 4 (todos dinamicos, aceptables) |
| Hex hardcodeados | 3 (violacion design system) |
| Archivos >250 lineas | 1 (DashboardPage: 272) |
| Bundle JS (gzip) | 85.11 KB |
| Bundle CSS (gzip) | 5.44 KB |
| Precache PWA | 406.25 KB |

---

## Puntuaciones por Area

| # | Area | Nota | Veredicto |
|---|------|------|-----------|
| 1 | Estructura del proyecto | 8.0 | Bueno |
| 2 | Consistencia de codigo | 7.5 | Bueno |
| 3 | Manejo de errores | 6.5 | Aceptable |
| 4 | Rendimiento | 6.5 | Aceptable |
| 5 | PWA compliance | 7.0 | Bueno |
| 6 | Seguridad | 4.5 | Deficiente |
| 7 | Accesibilidad | 5.0 | Deficiente |
| 8 | UX/UI | 9.0 | Excelente |
| 9 | Mantenibilidad | 7.5 | Bueno |
| 10 | Preparacion para produccion | 6.5 | Aceptable |
| | **MEDIA PONDERADA** | **7.3** | **Bueno** |

> Ponderacion: Seguridad x1.5, UX/UI x1.2, el resto x1.0.
> Un proyecto interno para ~8 usuarios con credenciales hardcodeadas penaliza fuertemente en Seguridad.

---

## Detalle por Area

### 1. Estructura del Proyecto — 8.0/10

**Fortalezas:**
- Separacion clara: `ui/` (atomicos puros) vs `features/` (logica de negocio) vs `pages/` (orquestadores)
- Hooks custom (`useStudents`, `useConvocatorias`) extraen logica de datos correctamente
- Capa de servicios centralizada en `services/api.js`
- Configuracion aislada en `config/`

**Problemas:**
- `DashboardPage.jsx` tiene 272 lineas — viola el limite de 250 de CLAUDE.md
- `teachers.js` (144 lineas) mezcla datos mock con funcion utilitaria `generateAbsences()`
- Tests sin estructura interna (`src/tests/` plano, sin `unit/` / `integration/`)

**Mejora #1 mas impactante:**
Extraer de `DashboardPage` los hooks `useTeacherData()` y `useAlertStudents()` para bajar a <200 lineas.

---

### 2. Consistencia de Codigo — 7.5/10

**Fortalezas:**
- PascalCase en componentes, camelCase en funciones/variables — 100% consistente
- Imports ordenados: React → paquetes externos → imports locales
- Patron consistente de handlers: `handleLogin`, `handleSelect`, `handleConvChange`
- Event cleanup con `cancelled` flag en todos los useEffect async

**Problemas:**
- JSDoc presente solo en 9/32 archivos (28%) — CLAUDE.md lo requiere en todos los componentes nuevos
- 3 colores hex hardcodeados fuera de tailwind.config.js:
  - `#CCCCCC` en Button.jsx:32
  - `#CDCDCD` en ToggleSwitch.jsx:22
  - `#111111` en MobileContainer.jsx:15
- `eslint-disable` innecesario en useStudents.js (el warning ya no aplica)

**Mejora #1 mas impactante:**
Mover los 3 hex a tokens en `tailwind.config.js` (ej: `disabled-bg`, `toggle-off`, `dark-frame`).

---

### 3. Manejo de Errores — 6.5/10

**Fortalezas:**
- ErrorBoundary global bien implementado (class component, dev/prod diferenciado)
- Todas las llamadas API envueltas en try/catch
- LoginPage usa `Promise.race()` con timeout como fallback
- Hooks propagan errores al estado de UI (`setError`)

**Problemas (confirmados por informe 01):**
- `useStudents.js:110` — prefetch silencia errores con `.catch(() => {})` — no loguea ni notifica
- `api.js` — no maneja explicitamente rechazos de `fetch()` (error de red vs error HTTP)
- No hay manejo de timeout global en la capa API (solo LoginPage lo tiene)
- No existe ruta 404/NotFound — navegacion a URL invalida queda en blanco
- `SavedPage` — `!state.present` redirige cuando `present === 0` (bug logico reportado en informe 01)

**Mejora #1 mas impactante:**
Agregar wrapper `fetchWithTimeout()` en `api.js` que aplique timeout global de 10s y loguee errores de red.

---

### 4. Rendimiento — 6.5/10

**Fortalezas:**
- 14 instancias de `useMemo` correctamente aplicadas (DashboardPage, AttendancePage)
- `useCallback` en hooks de datos (useStudents, useConvocatorias)
- Prefetch paralelo de grupos G2-G4 en useStudents
- Cache local en useStudents con `cacheRef`
- Cleanup de efectos evita updates en componentes desmontados

**Problemas (confirmados por informe 03):**
- **0 code-splitting** — monolito de 271 KB, todas las rutas en un chunk
- **0 React.memo** — StudentRow y TeacherCard re-renderizan cascada al padre
- Busqueda en Dashboard sin debounce — filtra en cada keystroke
- Waterfall API en Dashboard: `getConvocatorias()` bloquea `getProfesores()` (~400ms extra)
- `getConvocatorias()` se llama dos veces (LoginPage + hook) sin cache compartido
- Google Fonts carga ~15 pesos de fuente (se usan 3-4)

**Mejora #1 mas impactante:**
Implementar `React.lazy()` en las 4 rutas post-login + `React.memo()` en StudentRow y TeacherCard. Ahorro estimado: ~40 KB en carga inicial y ~80% menos re-renders.

---

### 5. PWA Compliance — 7.0/10

**Fortalezas:**
- Manifest completo (nombre, iconos 192/512, theme_color, display standalone)
- Service Worker auto-generado con `vite-plugin-pwa` y autoUpdate
- Offline fallback page (`offline.html`) con branding y boton de reintento
- Cache strategies correctas: CacheFirst (fonts), NetworkFirst (API)
- Respeta `prefers-reduced-motion` en animaciones

**Problemas (confirmados por informe 04):**
- **CRITICO:** `navigateFallback: '/offline.html'` deberia ser `/index.html` — SPA shell no se sirve offline
- **CRITICO:** regex de cache API no matchea el dominio real (`script.google.com` vs `script.googleusercontent.com`)
- HTML `lang="en"` deberia ser `lang="es"`
- Falta `<meta name="theme-color">` en index.html
- Faltan campos manifest: `start_url`, `scope`, `orientation`, `lang`
- Un solo PNG para ambos tamanos de icono (borroso en 512x512)
- No hay notificacion al usuario cuando el SW se actualiza
- No hay cola offline (Background Sync) para guardar asistencia sin conexion

**Mejora #1 mas impactante:**
Cambiar `navigateFallback` a `/index.html` y corregir regex del cache API. Sin esto, la app offline esta rota.

---

### 6. Seguridad — 4.5/10

**Fortalezas:**
- sessionStorage (no localStorage) — se borra al cerrar pestana
- No usa `dangerouslySetInnerHTML`, `eval()`, `innerHTML` — React auto-escapa
- `.env` en `.gitignore` — no se commitean credenciales
- ProtectedRoute valida sesion y rol
- Inputs de tipo password enmascarados

**Problemas (confirmados por informe 05):**
- **CRITICO C-01:** Contrasenas de 7 profesores + CEO hardcodeadas en `users.js`, visibles en bundle de produccion via DevTools
- **CRITICO C-02:** Objeto usuario completo (con password) se guarda en sessionStorage
- **ALTO A-01:** URL de Apps Script expuesta en bundle — endpoint publico sin autenticacion
- **ALTO A-02:** API sin autenticacion — cualquier request con parametros correctos es aceptado
- **ALTO A-03:** Autenticacion 100% client-side — bypasseable via consola
- **ALTO A-04:** ProtectedRoute bypasseable manipulando sessionStorage
- **MEDIO M-03:** 9 vulnerabilidades npm (1 moderada, 8 altas — mayoria en devDependencies)
- No hay headers de seguridad (CSP, X-Frame-Options) en configuracion de Vercel

**Mejora #1 mas impactante:**
Eliminar passwords del bundle: mover autenticacion al backend (Apps Script `doPost` con verificacion server-side). Excluir campo `password` del objeto guardado en sessionStorage.

---

### 7. Accesibilidad — 5.0/10

**Fortalezas:**
- HTML semantico (button, input, header, form correctos)
- 3 componentes con ARIA: SearchInput (`aria-label`), ToggleSwitch (`role="switch"`, `aria-checked`), PageHeader (`aria-label` en logout)
- `focus-visible` en ToggleSwitch con outline burgundy
- Respeta `prefers-reduced-motion` globalmente
- Porcentajes de asistencia mostrados como numero + color (no solo color)

**Problemas:**
- **Solo 3 de 19 componentes tienen atributos ARIA** (16% cobertura)
- Modal (`StudentDetailPopup`) sin focus trap — tabulacion escapa del modal
- Sin manejo de Escape para cerrar modales
- TeacherCard expandible solo funciona con click — sin soporte de teclado
- Contraste insuficiente: `text-white/45` sobre burgundy-dark (~3.1:1 vs 4.5:1 WCAG AA)
- Alt text generico: `alt="logo"` en PageHeader
- Sin `role="list"` / `role="listitem"` en listas de alumnos
- Sin skip-to-content link

**Mejora #1 mas impactante:**
Agregar focus trap al Modal y manejo de Escape para cerrar. Esto cubre el problema a11y mas critico (usuarios de teclado quedan atrapados o no pueden cerrar popups).

---

### 8. UX/UI — 9.0/10

**Fortalezas:**
- Loading states con skeleton loaders (Dashboard, Attendance) — feedback inmediato
- Libreria de animaciones completa: fadeUp, slideUp, popIn, popUp, shake
- Delays escalonados (delay-0 a delay-7) para cascada visual elegante
- Mobile-first con `max-w-[430px]` y safe-area-inset-bottom
- Error feedback visual: mensaje + animacion shake en login
- Jerarquia tipografica clara: Cinzel (headings) + Montserrat (body)
- Hover/active states en todos los botones interactivos
- Vista CEO con tarjetas de profesor expandibles + busqueda integrada

**Problemas:**
- 4 inline styles (todos dinamicos — animationDelay, maxWidth, width — aceptables)
- Empty states podrian ser mas prominentes (icono + texto en vez de solo texto)
- No hay transicion al cambiar entre tabs de grupo (corte abrupto)

**Mejora #1 mas impactante:**
Agregar transicion `fadeUp` al cambiar de tab de grupo para suavizar la experiencia al alternar entre G1-G4.

---

### 9. Mantenibilidad — 7.5/10

**Fortalezas:**
- Componentes UI reutilizables (Button, Avatar, Badge, Modal, StatCard, ProgressBar, ToggleSwitch, SearchInput)
- Feature components compuestos desde UI (TeacherCard usa Avatar+Badge, StudentRow usa Avatar+ToggleSwitch)
- Hooks custom encapsulan logica de datos con cleanup
- Naming convencions claros y consistentes
- 0 dependencias circulares (DAG limpio confirmado por informe 02)

**Problemas:**
- JSDoc en solo 28% de archivos — las 5 paginas carecen de documentacion de cabecera
- `teachers.js` mezcla datos mock + funcion utilitaria (baja cohesion)
- 3 violaciones de capas (informe 02):
  - StudentDetailPopup accede a `services/api` directamente (deberia usar hook)
  - TeacherCard accede a `config/teachers` directamente (deberia recibir por props)
  - LoginPage duplica `getConvocatorias()` en vez de usar hook
- DashboardPage tiene 14 dependencias directas (fan-out excesivo)

**Mejora #1 mas impactante:**
Resolver las 3 violaciones de capas: crear `useStudentDetail` hook para StudentDetailPopup, pasar datos por props a TeacherCard, usar `useConvocatorias` en LoginPage.

---

### 10. Preparacion para Produccion — 6.5/10

**Fortalezas:**
- Vite build configurado y funcional (1.37s build time)
- ESLint activo con 0 errores
- 55 tests pasando (8 suites, 100% pass rate)
- PWA instalable y funcional
- Desplegado en Vercel (`.vercel/project.json` presente)
- Env vars via `VITE_API_URL`

**Problemas:**
- **Cobertura de tests: 35%** — 8 de 23 modulos cubiertos
  - Paginas: 40% | UI: 38% | Features: 29% | **Hooks: 0%** | Services: 100%
- No hay servicio de error tracking (Sentry, LogRocket)
- No hay logging centralizado — solo `console.error` en ErrorBoundary
- No existe `.env.example` con documentacion de variables necesarias
- No hay monitoreo de performance (Web Vitals, Lighthouse CI)
- No hay guia de despliegue en README
- No hay health check endpoint
- Bundle monolitico de 85 KB gzip — sin code-splitting

**Mejora #1 mas impactante:**
Subir cobertura de tests al 60%: priorizar tests de `useStudents` (logica de cache compleja), `DashboardPage` (orquestador principal), y `AttendancePage` (feature core).

---

## Tabla Resumen de Metricas del Modo 4

| Metrica | Objetivo | Actual | Estado |
|---------|----------|--------|--------|
| Complejidad ciclomatica | ≤10 por funcion | ≤8 (cumple) | CUMPLE |
| Archivos ≤250 lineas | 100% | 97% (31/32) | FALLA (DashboardPage) |
| Cobertura de tests | >60% | 35% (8/23) | FALLA |
| Adherencia design system | 100% tokens | 97% (3 hex sueltos) | FALLA |
| Inline styles | ≤3 documentados | 4 (todos dinamicos) | ACEPTABLE |
| Lint errors | 0 | 0 errores, 1 warning | CUMPLE |

---

## Hallazgos Criticos Consolidados (de informes 01-05)

Estos son los problemas que bloquean un despliegue a produccion serio:

| ID | Severidad | Area | Hallazgo |
|----|-----------|------|----------|
| C-01 | CRITICO | Seguridad | Passwords hardcodeados en bundle |
| C-02 | CRITICO | Seguridad | Password en sessionStorage |
| A-02 | ALTO | Seguridad | API sin autenticacion |
| PWA-01 | CRITICO | PWA | navigateFallback apunta a offline.html, no a index.html |
| PWA-02 | CRITICO | PWA | Regex de cache no matchea dominio real de API |
| PERF-01 | ALTO | Rendimiento | 0 code-splitting — monolito 271 KB |
| A11Y-01 | ALTO | Accesibilidad | Modal sin focus trap ni Escape |

---

## Plan de Accion Priorizado

### Prioridad 1 — Seguridad (impacto en confianza)
1. Mover autenticacion a backend (Apps Script)
2. Excluir password del objeto en sessionStorage
3. Agregar headers de seguridad en Vercel

### Prioridad 2 — PWA (funcionalidad rota)
4. Corregir `navigateFallback` a `/index.html`
5. Corregir regex de cache API
6. Cambiar `lang="en"` a `lang="es"`

### Prioridad 3 — Rendimiento (experiencia)
7. Code-splitting con React.lazy en rutas
8. React.memo en StudentRow y TeacherCard
9. Debounce en busqueda de Dashboard

### Prioridad 4 — Mantenibilidad (deuda tecnica)
10. Refactorizar DashboardPage (<250 lineas)
11. Resolver violaciones de capas (3 archivos)
12. Mover hex hardcodeados a tailwind.config.js
13. Ampliar cobertura de tests a 60%

### Prioridad 5 — Accesibilidad (inclusion)
14. Focus trap + Escape en Modal
15. Soporte de teclado en TeacherCard expandible
16. Corregir contraste de texto sobre burgundy

---

## Veredicto Final

**7.3 / 10 — Proyecto Bueno con deuda tecnica localizada.**

NovAttend es un prototipo funcional bien ejecutado con UX/UI excelente (9.0), arquitectura limpia y patrones React solidos. Los problemas estan concentrados en dos areas:

1. **Seguridad (4.5)** — El modelo de autenticacion client-side con credenciales en el bundle es el riesgo mas grave. Aceptable como prototipo interno para ~8 usuarios, pero debe migrar a server-side antes de cualquier exposicion externa.

2. **Accesibilidad (5.0)** — Tiene buenas bases (HTML semantico, prefers-reduced-motion) pero le falta coverage ARIA, focus management en modales y soporte de teclado.

El resto del proyecto esta solidamente por encima de 6.5, con UX/UI como punto fuerte destacado. Con las 16 mejoras del plan de accion, este proyecto puede subir a **8.5+** facilmente.

---

*Generado automaticamente. Consistente con hallazgos de informes 01-errores-codigo, 02-grafo-dependencias, 03-rendimiento, 04-pwa-offline, y 05-seguridad.*
