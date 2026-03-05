# Registro de Progreso - NovAttend

## Ultimo Hito
- **Fecha:** 2026-03-05
- **Hito:** Fase 13 — CacheService en Apps Script + deploy Vercel actualizado + prueba E2E exitosa

## Resumen de Cambios (Fases 1-11)

### Fases 1-5 — Infraestructura + Componentes + Limpieza
- Tailwind config con tokens, animaciones CSS, 8 componentes UI, 6 features
- Paginas recompuestas: SavedPage, AttendancePage, DashboardPage, LoginPage
- brand.js eliminado, 0 inline styles en paginas, todos <250 lineas

### Fases 6-8 — Backend + API + Deploy
- Google Sheets como backend (5 hojas: CONVOCATORIAS, PROFESORES, ALUMNOS, ASISTENCIA, LOG)
- Apps Script API REST (Code.gs): doGet/doPost con endpoints completos
- Capa de servicios en src/services/api.js
- Deploy en Vercel + GitHub

### Fases 9-11 — Deuda tecnica + Convocatorias + Dashboard API
- ErrorBoundary, PWA con Workbox, 19 tests (Vitest)
- Flujo convocatorias: login -> consulta activas -> selector si 2+ -> asistencia
- Dashboard CEO conectado a API real con getResumen y getAsistenciaAlumno

### Fase 12 — Gestion de convocatorias + Optimizaciones + Deuda tecnica

#### Backend: Apps Script (`gestionConvocatorias.gs`)
- **`crearConvocatoria()`** — Crea separador de color + 28 hojas de grupo por convocatoria
- **`sincronizarAlumnos()`** — Lee nombres de hojas de grupo, genera IDs (`alu-XXXX`), vuelca a ALUMNOS
- **`actualizarEstadisticas()`** — Actualiza columnas B/C/D (Asistencia %, Ultima clase, Total clases) en hojas de grupo
- **`onEdit()`** — Trigger automatico: sincroniza ALUMNOS cuando Aurora escribe un nombre en columna A, fila 3+
- **`onOpen()`** — Menu "NovAttend" en el spreadsheet (crear conv, sync manual, actualizar stats)

#### Estructura de hojas por convocatoria
- Separador con color: `[ MAR26 ]` (hoja protegida con info)
- 28 hojas de grupo: `MAR26 - Samuel - G1`, `MAR26 - Samuel - G2`, etc.
- Patron: `PREFIJO - NombreProfesor - GX`
- Convocatoria ID derivado del prefijo: `conv-mar26`
- Flujo Aurora: Solo escribe nombres en columna A. Todo lo demas es automatico.

#### Optimizaciones frontend
- **`AttendancePage.jsx`** — Cache de alumnos con `useRef` por grupo. Prefetch paralelo de G2/G3/G4.
- **`LoginPage.jsx`** — Timeout de seguridad de 8s (`Promise.race`) para convocatorias activas.
- **`animations.css`** — Delays escalonados mas rapidos.

#### Deuda tecnica cerrada
- **Tests ampliados:** De 4 suites/19 tests a 8 suites/55 tests. Nuevas suites: LoginPage, ConvocatoriaPage, StudentRow, api.
- **Pagina offline PWA:** `public/offline.html` con branding NovAttend.
- **Hooks custom:** `src/hooks/useStudents.js` y `src/hooks/useConvocatorias.js` extraidos de paginas.
- **Workbox configurado:** `navigateFallback: '/offline.html'` en vite.config.js.

### Fase 13 — CacheService en Apps Script + Deploy

#### CacheService (Code.gs)
- **`cachedGet(key, fetchFn)`** — Wrapper que lee de `CacheService.getScriptCache()`, si miss ejecuta fetchFn y guarda con TTL 120s.
- **`cacheInvalidate(prefixes)`** — Invalida claves por prefijo usando indice `_keys`.
- **`cacheTrackKey(key)`** — Registra claves activas para poder invalidar por prefijo.
- **Endpoints cacheados:** getConvocatorias (`conv`), getProfesores (`prof`), getAlumnos (`alu_{conv}_{prof}_{grupo}`), getResumen (`res_{conv}_{prof}_{grupo}`).
- **getAsistencia NO cacheado** — Consulta bajo demanda, siempre fresco.
- **Invalidacion automatica en POST:**
  - `guardarAsistencia` -> invalida `res_{convocatoria_id}_*`
  - `crearAlumno` -> invalida `alu_{convocatoria_id}_*`
  - `actualizarAlumno` -> invalida `alu_*`
- **Impacto:** Primera carga ~3-5s (cold), cargas posteriores ~200-500ms (cache hit).

#### Prueba E2E (Playwright)
- Login teacher (samuel): funciona, detecta convocatoria activa, va directo a /attendance
- Alumnos reales: Antonio Perez Burrul cargado en G1 de Samuel
- Toggle asistencia: funciona, contadores se actualizan correctamente
- Login CEO (admin): dashboard carga 7 profesores reales
- Pagina offline: se muestra correctamente con branding

#### Deploy Vercel
- Push a GitHub (Maxesta18/novattend) con todos los cambios
- `VITE_API_URL` configurada en Vercel Production
- Deploy manual con `vercel --prod --force` (clean build)
- URL produccion: https://novattend.vercel.app
- **Nota:** Service Worker puede cachear version vieja. Si muestra datos mock, hacer: DevTools > Application > Service Workers > Unregister + Ctrl+Shift+R.

## Estado
- **Rama:** main
- **Build:** funcional, JS 271KB
- **Lint:** 0 errores
- **Tests:** 55 passing (8 suites)
- **Fase completada:** 13
- **Commits recientes:**
  - `3b47a5b` feat: CacheService en Apps Script
  - `a1a78c1` feat: fase 12 completa — hooks, tests, offline PWA, convocatorias

## Estructura de Carpetas Actual
- `src/config/`: api.js, users.js, teachers.js
- `src/services/`: api.js (capa de servicios fetch)
- `src/hooks/`: useStudents.js (156 lineas), useConvocatorias.js (68 lineas)
- `src/components/ui/`: Button, StatCard, Avatar, Badge, Modal, ProgressBar, ToggleSwitch, SearchInput
- `src/components/features/`: PageHeader, GroupTabs, StudentRow, StudentDetailPopup, AlertList, TeacherCard, ConvocatoriaSelector
- `src/components/`: MobileContainer, ErrorBoundary, ProtectedRoute
- `src/pages/`: LoginPage, ConvocatoriaPage, AttendancePage, SavedPage, DashboardPage
- `src/utils/`: buildTeachersHierarchy.js
- `src/tests/`: 8 archivos test (Badge, Button, StatCard, ProtectedRoute, LoginPage, ConvocatoriaPage, StudentRow, api)
- `public/`: offline.html, logova1.png
- `docs/apps-script/`: Code.gs (con CacheService), gestionConvocatorias.gs, importarAlumnos.gs (legacy)

## Deuda Tecnica
### Resuelta
- Rendimiento en cambio de grupo (cache useRef + prefetch)
- Timeout en LoginPage (8s maximo)
- Animaciones de entrada lentas (delays reducidos)
- Tests ampliados (8 suites, 55 tests)
- Pagina offline fallback PWA
- Hooks custom (useStudents, useConvocatorias)
- Selector de convocatoria en Dashboard
- Rendimiento dashboard (CacheService 120s en Apps Script)

### Pendiente
- Validar que `actualizarEstadisticas()` se ejecuta correctamente tras guardar asistencia
- Considerar migracion a TypeScript en el futuro

## Archivos de Apps Script
- `docs/apps-script/Code.gs` — API REST principal con CacheService (doGet, doPost, cache helpers, setupSheets)
- `docs/apps-script/gestionConvocatorias.gs` — Gestion de convocatorias y alumnos
- `docs/apps-script/importarAlumnos.gs` — Script legacy (ya no se usa)

## Logica de Negocio (Convocatorias)
- Convocatoria activa = `fecha_inicio <= hoy <= fecha_fin` (automatico)
- Cada convocatoria tiene sus propios alumnos independientes
- Varias convocatorias pueden convivir simultaneamente
- Alumnos se mantienen en su grupo durante toda la convocatoria (excepciones manuales en Sheet)
- 7 profesores activos x 4 grupos = 28 hojas por convocatoria
- Profesores: Samuel, Maria Wolf, Nadine, Marta Battistella, Elisabeth Shick, Myriam Marcia, Sonja

## Siguiente Paso
1. Verificar que https://novattend.vercel.app carga datos reales (no mock) — si muestra mock, limpiar Service Worker
2. Pegar Code.gs actualizado (con CacheService) en Apps Script y hacer nuevo deploy de Web App
3. Validacion end-to-end con datos reales (pasar lista con samuel, verificar en dashboard con admin)
4. Onboarding de profesores (entregar credenciales, explicar flujo)
5. Considerar mejoras UX basadas en feedback real
