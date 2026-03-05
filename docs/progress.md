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

## Siguiente Paso
- Crear el Google Sheet con la nueva estructura de 5 hojas
- Escribir el codigo Apps Script (doGet/doPost) para exponer la API REST
- Conectar el frontend React a los endpoints del Apps Script
- Subir proyecto a GitHub
- Deploy en Vercel
- Pendiente tambien:
  - Tests unitarios
  - Estrategia de cache offline PWA
