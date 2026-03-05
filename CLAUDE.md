# CLAUDE.md - Protocolo NovAttend

## REGLAS DE ORO (Prioridad Cero)
- **CERO ESTILOS INLINE:** Uso exclusivo de Tailwind CSS. Prohibido `style={{...}}`.
- **ATOMICIDAD:** Maximo **250 lineas** por archivo. Si un componente excede este limite, DEBE fragmentarse.
- **SISTEMA DE DISENO:** Prohibido hardcodear hexadecimales. Usar tokens de Tailwind configurados en `tailwind.config.js` (ej: `bg-burgundy`, `text-gold`).
- **IDIOMA:** UI, comentarios de logica y mensajes de commit en **Espanol**. Codigo (nombres de variables, funciones, componentes) en **Ingles**.
- **TRABAJO FINO:** Antes de cualquier cambio estructural, Claude debe presentar un esquema de pasos (pseudocodigo o bullet points) para aprobacion del usuario.

## Gestion de Eficiencia y Tokens
- **Monitor de Contexto:** Claude debe avisar explicitamente cuando la ventana de contexto este llegando al limite (70-80%) para resumir hitos y reiniciar la sesion.
- **Documento de Relevo (`docs/progress.md`):** Obligatorio actualizar este archivo tras cada tarea importante con:
    1. Ultimo hito completado.
    2. Estado de la rama y archivos modificados.
    3. Bloqueos, dudas o decisiones pendientes.
    4. Siguiente paso sugerido para el proximo agente/sesion.
- **Uso Inteligente de Agentes:** Usar agentes paralelos solo cuando las tareas son genuinamente independientes. No invocar herramientas de busqueda si la tarea es ejecutable con el contexto local.
- **Filtro de Incertidumbre:** Ante ambiguedad en la logica de negocio o arquitectura, Claude **DETENDRA** la ejecucion y preguntara. Prohibido suponer.

## Quick Start
- **Requisito:** Node 18+
- `npm install`
- `npm run dev` → abre en http://localhost:5173

## Arquitectura y Stack
- **Framework:** React 19 + Vite 7 + React Router 7 (SPA).
- **Estilo:** Tailwind CSS 3 (Mobile-first, max-width 430px).
- **PWA:** vite-plugin-pwa con Workbox (precache app shell + runtime caching: Google Fonts CacheFirst, API NetworkFirst).
- **Tests:** Vitest + @testing-library/react + jest-dom. Setup en `src/tests/setup.js`.
- **Estado:** `sessionStorage` para Auth + React State para UI.
- **Estructura de Carpetas:**
    - `src/config/`: Datos mock (`users.js`, `teachers.js`).
    - `src/styles/`: CSS custom (animaciones keyframe).
    - `src/components/ui/`: Componentes atomicos/puros (Button, StatCard, Avatar, Badge, Modal, ProgressBar, ToggleSwitch, SearchInput).
    - `src/components/features/`: Componentes con logica de negocio (PageHeader, GroupTabs, StudentRow, StudentDetailPopup, AlertList, TeacherCard).
    - `src/components/MobileContainer.jsx`: Wrapper mobile (componente especial, no ui ni feature).
    - `src/pages/`: Vistas de ruta (deben ser ligeras y orquestadoras).
    - `src/components/ErrorBoundary.jsx`: Error boundary global (class component).
    - `src/tests/`: Tests unitarios (Vitest + Testing Library).
    - `src/hooks/`: (pendiente) Logica de extraccion de datos, validacion y auth.
    - `docs/`: Registro de progreso y especificaciones tecnicas.

## Rutas
- `/` -> LoginPage (autenticacion)
- `/convocatorias` -> ConvocatoriaPage (teacher - selector de convocatoria, solo si 2+ activas)
- `/attendance` -> AttendancePage (teacher - marcar asistencia, recibe convocatoria via state)
- `/saved` -> SavedPage (confirmacion tras guardar)
- `/dashboard` -> DashboardPage (ceo - analiticas)

## Comandos de Desarrollo
- `npm run dev`: Servidor de desarrollo (Vite).
- `npm run build`: Build de produccion.
- `npm run lint`: Ejecucion obligatoria antes de cada entrega de codigo.
- `npm run preview`: Previsualizacion de build local.
- `npm test`: Ejecutar tests unitarios (Vitest).
- `npm run test:watch`: Tests en modo watch.

## Design System (Strict)
- **Fondo General:** `bg-dark-bg` (via `MobileContainer`).
- **Primario:** `burgundy` (#800000) | **Acento:** `gold` (#C5A059).
- **Fuentes:** `font-cinzel` (headings) + `font-montserrat` (body) via Google Fonts.
- **Semantica de Status (Asistencia):**
    - Critico (<60%): `text-error` (#C62828).
    - Alerta (60-79%): `text-warning` (#E65100).
    - Optimo (>=80%): `text-success` (#2E7D32).
- **Tokens Tailwind:** Colores y fuentes ya configurados en `tailwind.config.js` bajo `extend.colors` y `extend.fontFamily`. Usar clases directas: `bg-burgundy`, `text-gold`, `text-error`, `font-cinzel`, etc.

## Autenticacion y Roles
- **Roles:** `teacher` (acceso `/attendance`) | `ceo` (acceso `/dashboard`).
- **Persistencia:** Objeto JSON en `sessionStorage` bajo la clave `user`.
- **Seguridad:** Guardias de ruta implementadas via `ProtectedRoute.jsx`.

## Convenciones de Codigo
- **Commits:** Conventional Commits en espanol (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- **Naming:** PascalCase para Componentes/Archivos JSX, camelCase para funciones/variables.
- **Documentacion:** JSDoc obligatorio en la cabecera de componentes nuevos detallando sus `props`.

## Gotchas
- `src/styles/animations.css` define keyframes CSS custom (fadeUp, slideUp). No usar `@keyframes` en Tailwind config.
- Guardias de ruta implementadas en `ProtectedRoute.jsx` — valida sesion y rol.
- `MobileContainer.jsx` esta en `src/components/` (raiz), no en `ui/` ni `features/`.
- Quedan 3 `style={{}}` en componentes para valores dinamicos (ej: width de ProgressBar). Son inevitables.

## Logica de Negocio (Convocatorias)
- **Activa por fecha:** `fecha_inicio <= hoy <= fecha_fin` (automatico, sin checkbox manual).
- **Todos los profesores** participan en todas las convocatorias activas.
- **Grupos fijos:** G1, G2, G3, G4 en cada convocatoria.
- **Alumnos fijos** por convocatoria/grupo (no se mueven).
- **Flujo teacher:** Login -> consulta convocatorias activas -> 1=directo, 2+=selector -> asistencia.

## Estado Actual del Proyecto
- **Fase:** 11 completada — Dashboard CEO conectado a API real.
- **Componentes:** 8 ui/ + 6 features/ + ErrorBoundary + ProtectedRoute + 5 paginas.
- **Backend:** Google Apps Script (Web App) + capa de servicios en `src/services/api.js`.
- **Tests:** 19 tests (4 suites) — ProtectedRoute, Button, Badge, StatCard.
- **Metricas:** 0 estilos inline en paginas, 0 errores lint, todos < 250 lineas, build JS 269KB.
- **Deuda tecnica pendiente:** Ampliar tests, pagina offline fallback PWA, selector convocatoria en Dashboard si 2+ activas.

---
*Nota para el Agente: Al iniciar, lee este archivo y `docs/progress.md`. Si `docs/progress.md` no existe, crealo tras tu primera intervencion que produzca cambios en el codigo.*
