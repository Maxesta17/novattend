# Registro de Progreso - NovAttend

## Ultimo Hito
- **Fecha:** 2026-03-05
- **Hito:** Fase 12 completada — Hooks custom + deuda tecnica cerrada + tests ampliados + offline PWA

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

### Fase 12 — Gestion de convocatorias en Google Sheets + Optimizaciones frontend

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
- **`AttendancePage.jsx`** — Cache de alumnos con `useRef` por grupo. Prefetch paralelo de G2/G3/G4 al montar el componente. Cambio de tab instantaneo sin recarga de API.
- **`AttendancePage.jsx`** — Mapeo `profesorId` corregido: `prof-${username}` para coincidir con IDs en hoja PROFESORES.
- **`LoginPage.jsx`** — Timeout de seguridad de 8s (`Promise.race`) para la consulta de convocatorias activas. Evita que el usuario espere indefinidamente si la API no responde.
- **`animations.css`** — Delays escalonados mas rapidos (0s, 0.1s, 0.18s, 0.25s, 0.35s, 0.4s, 0.5s, 0.7s). Animaciones mas agiles en la entrada de elementos.

#### Decisiones tecnicas
- Cache con `useRef` en vez de `useState` para evitar re-renders innecesarios al almacenar datos de grupos no visibles.
- Prefetch paralelo con `forEach` + `.catch(() => {})` silencioso para no bloquear la UI si un grupo falla.
- `Promise.race` con timeout de 8s en LoginPage: balance entre esperar la API y no frustrar al usuario.
- Patron de limpieza `cancelled` en useEffect para evitar actualizaciones de estado en componentes desmontados.

#### Archivos modificados
- `src/pages/AttendancePage.jsx` — cache + prefetch + fix prof-ID
- `src/pages/LoginPage.jsx` — timeout 8s en consulta de convocatorias
- `src/styles/animations.css` — delays escalonados mas rapidos
- `docs/apps-script/gestionConvocatorias.gs` — sistema completo de gestion
- `docs/apps-script/importarAlumnos.gs` — script legacy (reemplazado)

#### Estado
- Script pegado en Apps Script. Hojas viejas (sin prefijo) eliminadas.
- Listo para crear primera convocatoria con el nuevo sistema.

### Fase 12 (cierre) — Deuda tecnica cerrada
- **Tests ampliados:** De 4 suites/19 tests a 8 suites/55 tests. Nuevas suites: LoginPage, ConvocatoriaPage, StudentRow, api.
- **Pagina offline PWA:** `public/offline.html` con branding NovAttend (logo, icono wifi-off, boton reintentar, colores burgundy/gold, fuentes Cinzel/Montserrat).
- **Hooks custom:** `src/hooks/useStudents.js` y `src/hooks/useConvocatorias.js` extraidos de AttendancePage y DashboardPage para separar logica de vista.
- **Workbox configurado:** `navigateFallback: '/offline.html'` en vite.config.js.

## Estado
- **Rama:** main
- **Build:** funcional
- **Lint:** 0 errores
- **Tests:** 55 passing (8 suites)
- **Fase completada:** 12 (completada)

## Deuda Tecnica
### Resuelta en fase 12
- Rendimiento en cambio de grupo (era una recarga API por cada tab, ahora es instantaneo via cache)
- Timeout inexistente en LoginPage al consultar convocatorias (ahora 8s maximo)
- Animaciones de entrada lentas (reducidos delays)
- Ampliar tests (de 4 suites/19 tests a 8 suites/55 tests)
- Pagina offline fallback PWA (`public/offline.html` + Workbox navigateFallback)
- Extraer hooks custom (`useStudents`, `useConvocatorias`) para separar logica de vista
- ~~Selector de convocatoria en Dashboard si hay 2+ activas~~ (resuelto)

### Pendiente
- Validar que `actualizarEstadisticas()` se ejecuta correctamente tras guardar asistencia
- Considerar migracion a TypeScript en el futuro

## Archivos de Apps Script
- `docs/apps-script/Code.gs` — API REST principal (doGet, doPost, setupSheets)
- `docs/apps-script/gestionConvocatorias.gs` — Gestion de convocatorias y alumnos (crearConvocatoria, sincronizarAlumnos, actualizarEstadisticas, onEdit, onOpen)
- `docs/apps-script/importarAlumnos.gs` — Script legacy (ya no se usa)

## Logica de Negocio (Convocatorias)
- Convocatoria activa = `fecha_inicio <= hoy <= fecha_fin` (automatico)
- Cada convocatoria tiene sus propios alumnos independientes
- Varias convocatorias pueden convivir simultaneamente (abril, mayo, etc.)
- Alumnos se mantienen en su grupo durante toda la convocatoria (excepciones manuales en Sheet)
- 7 profesores activos x 4 grupos = 28 hojas por convocatoria
- Profesores: Samuel, Maria Wolf, Nadine, Marta Battistella, Elisabeth Shick, Myriam Marcia, Sonja

### Resuelto post-fase 12
- Selector de convocatoria en DashboardPage (dropdown en header cuando hay 2+ activas)
- `buildTeachersHierarchy` extraido a `src/utils/buildTeachersHierarchy.js` para cumplir limite 250 lineas
- Nuevo componente: `src/components/features/ConvocatoriaSelector.jsx` (37 lineas)

## Siguiente Paso
1. Validacion end-to-end con datos reales (crear convocatoria, inscribir alumnos, pasar lista, verificar estadisticas)
2. Onboarding de profesores (entregar credenciales, explicar flujo)
3. Considerar mejoras UX basadas en feedback real
