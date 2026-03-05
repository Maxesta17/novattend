# Registro de Progreso - NovAttend

## Ultimo Hito
- **Fecha:** 2026-03-05
- **Hito:** Fase 4 completada — todas las paginas recompuestas con Tailwind + componentes

## Resumen de Cambios (Fases 1-4)

### Fase 1 — Infraestructura
- `tailwind.config.js` — tokens `warning` y `warning-soft`
- `src/styles/animations.css` — 9 keyframes + clases de utilidad + delays
- `src/main.jsx` — import de animations.css

### Fase 2 — Componentes UI atomicos (8)
- `src/components/ui/` — Button, StatCard, Avatar, Badge, Modal, ProgressBar, ToggleSwitch, SearchInput

### Fase 3 — Componentes features (6)
- `src/components/features/` — PageHeader, GroupTabs, StudentRow, StudentDetailPopup, AlertList, TeacherCard

### Fase 4 — Recomposicion de paginas
- **SavedPage:** 241 → 58 lineas, cero inline styles
- **AttendancePage:** 497 → 139 lineas, cero inline styles
- **DashboardPage:** 859 → 132 lineas (datos extraidos a `src/config/teachers.js`, UI a TeacherCard)
- **LoginPage:** 363 → 119 lineas, cero inline styles, input extraido a LoginInput
- **MobileContainer:** simplificado, solo conserva media query necesaria
- **brand.js:** ya no se importa en ninguna pagina (candidato a eliminacion en Fase 5)

## Estado
- **Rama:** main
- **Build:** funcional, JS 258KB (antes 269KB)
- **Lint:** 0 errores (antes 11)
- **style={{}}:** 0 en paginas, 3 en componentes (valores dinamicos inevitables)
- **Max lineas por archivo:** 140 (TeacherCard.jsx) — todos bajo 250
- **Fase completada:** 4 de 5

## Decisiones Tomadas
- Enfoque bottom-up: componentes atomicos primero, recomponer paginas despues
- Tokens Tailwind sin prefijos: `bg-burgundy` en vez de `bg-brand-burgundy`
- JSDoc obligatorio solo en componentes nuevos
- fadeUp unificado (opacidad + translateY) en todas las paginas
- DashboardPage fragmentada en: teachers.js (datos), TeacherCard.jsx (UI), DashboardPage.jsx (orquestador)
- useEffect eliminado en AttendancePage, reemplazado por handler directo (corrige lint)

### Fase 5 — Limpieza
- `src/config/brand.js` eliminado (sin importaciones)
- `CLAUDE.md` actualizado: seccion "Estado Actual", Gotchas, estructura de carpetas

## Estado
- **Rama:** main
- **Build:** funcional, JS 258KB
- **Lint:** 0 errores
- **style={{}}:** 0 en paginas, 3 en componentes (valores dinamicos)
- **Max lineas por archivo:** 140 (TeacherCard.jsx)
- **Fase completada:** 5 de 5

### Fase 6 — Backend Google Sheets
- Disenada estructura de 5 hojas: CONVOCATORIAS, PROFESORES, ALUMNOS, ASISTENCIA, LOG
- Soporta multiples convocatorias simultaneas en un solo Google Sheet
- Especificacion tecnica: `docs/google-sheets-backend.md`
- Manual de usuario: `docs/manual-usuario.md`
- Excel original analizado: `public/Control de Asistencia Global .xlsx`

### Fase 7 — Auth completa + Fechas de faltas
- `src/components/ProtectedRoute.jsx` — guardia de ruta con validacion de sesion y rol
- `src/App.jsx` — rutas /attendance, /saved y /dashboard protegidas
- `src/components/features/PageHeader.jsx` — boton de logout (prop onLogout)
- `src/pages/AttendancePage.jsx` y `DashboardPage.jsx` — pasan onLogout al header
- `src/config/teachers.js` — funcion generateAbsences + campo absences en todos los alumnos
- `src/components/features/StudentDetailPopup.jsx` — seccion "Dias de inasistencia" con chips de fechas
- `src/components/features/TeacherCard.jsx` — muestra ultima falta en fila de alumno

## Estado
- **Rama:** main
- **Build:** funcional
- **Lint:** 0 errores
- **Fase completada:** 7

### Fase 8 — Backend API + Deploy
- `src/config/api.js` — configuracion de URL del Apps Script (via VITE_API_URL)
- `src/services/api.js` — capa de servicios con fetch (GET/POST) a la API REST
- `docs/apps-script/Code.gs` — API REST completa para Google Apps Script
- `docs/apps-script/Migracion.gs` — script de migracion de datos del Sheet viejo
- `docs/setup-google-sheet.md` — guia paso a paso para montar el backend
- `docs/manual-usuario.md` — manual para profesores y administradores
- Proyecto subido a GitHub y desplegado en Vercel

## Estado
- **Rama:** main
- **Build:** funcional, JS 261KB
- **Lint:** 0 errores
- **Fase completada:** 8

### Fase 9 — Deuda tecnica
- `src/components/ErrorBoundary.jsx` — error boundary global (class component, UI con design system)
- `src/main.jsx` — App envuelta en ErrorBoundary
- `vite.config.js` — Workbox configurado: precache de app shell + runtime caching (Google Fonts CacheFirst, API NetworkFirst)
- Vitest + @testing-library/react + jest-dom + user-event instalados
- `src/tests/setup.js` — setup global de jest-dom
- 4 suites de tests: ProtectedRoute (4), Button (6), Badge (5), StatCard (4) = 19 tests
- Scripts: `npm test` (run), `npm run test:watch` (watch)
- Build: 262KB JS, PWA precachea 9 entries con SW generado

## Estado
- **Rama:** main
- **Build:** funcional, JS 262KB
- **Lint:** 0 errores
- **Tests:** 19 passing (4 suites)
- **Fase completada:** 9

### Fase 10 — Flujo de convocatorias + conexion API
- `docs/apps-script/Code.gs` — convocatorias activas por fecha (`fecha_inicio <= hoy <= fecha_fin`), ya no usa checkbox `activa`
- `src/pages/ConvocatoriaPage.jsx` — selector de convocatoria activa (cards con nombre y fechas)
- `src/pages/LoginPage.jsx` — flujo post-login: consulta convocatorias activas, redirige segun cantidad (0=error, 1=directo, 2+=selector)
- `src/pages/AttendancePage.jsx` — recibe convocatoria via state, carga alumnos desde API, guarda asistencia con convocatoria_id. Fallback a datos mock si API deshabilitada
- `src/pages/SavedPage.jsx` — muestra nombre de convocatoria, boton volver preserva convocatoria
- `src/App.jsx` — nueva ruta `/convocatorias` protegida para teacher
- Grupos ahora son strings: G1, G2, G3, G4 (consistente con el backend)

## Estado
- **Rama:** main
- **Build:** funcional, JS 266KB
- **Lint:** 0 errores
- **Tests:** 19 passing (4 suites)
- **Fase completada:** 10

### Fase 11 — Dashboard CEO conectado a API real
- `docs/apps-script/Code.gs` — getResumen con porcentajes semanal/quincenal/mensual, getAsistencia con filtro alumno_id
- `src/services/api.js` — nuevo getAsistenciaAlumno(convocatoriaId, alumnoId)
- `src/pages/DashboardPage.jsx` — conectado a API con fallback mock, buildTeachersHierarchy transforma datos planos a jerarquia
- `src/components/features/StudentDetailPopup.jsx` — carga fechas de falta bajo demanda via API
- Diseno documentado en `docs/plans/2026-03-05-dashboard-api-design.md`

## Estado
- **Rama:** main
- **Build:** funcional, JS 269KB
- **Lint:** 0 errores
- **Tests:** 19 passing (4 suites)
- **Fase completada:** 11

## Logica de Negocio (Convocatorias)
- Convocatoria activa = `fecha_inicio <= hoy <= fecha_fin` (automatico, sin intervencion manual)
- Todos los profesores participan en todas las convocatorias activas
- Cada convocatoria tiene 4 grupos fijos: G1, G2, G3, G4
- Alumnos no se mueven entre convocatorias/grupos (excepto caso aislado manual en Sheet)

## Siguiente Paso
- Copiar Code.gs actualizado al editor de Apps Script y redesplegar
- Pendiente:
  - Ampliar cobertura de tests (paginas, features)
  - Pagina offline fallback para PWA
  - Selector de convocatoria en Dashboard si hay 2+ activas
