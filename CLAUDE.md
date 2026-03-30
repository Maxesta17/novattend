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

<!-- GSD:project-start source:PROJECT.md -->
## Project

**NovAttend — Mejoras Post-Auditoria (Olas 1-3)**

Ciclo de mejoras para NovAttend basado en una auditoria completa de codigo, rendimiento, PWA, seguridad y calidad. Este milestone cubre las Olas 1-3: fixes criticos, optimizacion de rendimiento y refactorizacion de arquitectura. La app es un sistema de control de asistencia para LingNova Academy, usada por 7 profesores y 1 CEO.

**Core Value:** La app debe ser estable y rapida: cero errores silenciosos, carga optimizada, y la funcionalidad offline que la PWA promete debe funcionar de verdad.

### Constraints

- **Stack:** React 19 + Vite 7 + Tailwind 3 — no cambiar framework
- **Atomicidad:** Max 250 lineas por archivo (regla CLAUDE.md)
- **Estilos:** Cero inline styles, solo Tailwind tokens
- **Idioma:** UI/comentarios en espanol, codigo en ingles
- **Backend:** Google Apps Script — no se toca en este milestone (Ola 4)
- **Mobile-first:** Max-width 430px, no romper layout existente
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (ES2020+, ESM) - All frontend and backend code
- JSX - React component syntax
- CSS - Custom keyframe animations in `src/styles/animations.css`
- HTML - Single entry point `index.html`
## Runtime
- Node.js 18+ (stated requirement in CLAUDE.md)
- Browser target: modern browsers (ECMAScript 2020)
- Google Apps Script V8 runtime (backend)
- npm
- Lockfile: `package-lock.json` present
## Frameworks
- React `^19.2.0` - UI library
- React DOM `^19.2.0` - DOM rendering
- React Router DOM `^7.13.0` - Client-side routing (SPA mode)
- Vitest `^4.0.18` - Test runner (integrated with Vite)
- @testing-library/react `^16.3.2` - Component testing utilities
- @testing-library/jest-dom `^6.9.1` - Custom DOM matchers
- @testing-library/user-event `^14.6.1` - User interaction simulation
- jsdom `^28.1.0` - DOM environment for tests
- Vite `^7.3.1` - Build tool and dev server
- @vitejs/plugin-react `^5.1.1` - React Fast Refresh + JSX transform
- vite-plugin-pwa `^1.2.0` - PWA service worker generation (Workbox)
- Tailwind CSS `^3.4.19` - Utility-first CSS framework
- PostCSS `^8.5.6` - CSS processing pipeline
- Autoprefixer `^10.4.24` - Vendor prefix automation
- ESLint `^9.39.1` - Flat config format
- eslint-plugin-react-hooks `^7.0.1` - Hooks rules
- eslint-plugin-react-refresh `^0.4.24` - Fast Refresh compliance
- globals `^16.5.0` - Global variable definitions
## Key Dependencies
- `react` `^19.2.0` - Core UI framework
- `react-dom` `^19.2.0` - DOM renderer
- `react-router-dom` `^7.13.0` - SPA routing with `ProtectedRoute` guards
- `vite` `^7.3.1` - Dev server on port 5173, production bundler
- `vite-plugin-pwa` `^1.2.0` - Generates service worker with Workbox strategies
- `tailwindcss` `^3.4.19` - All styling via utility classes
- `vitest` `^4.0.18` - Unit testing framework
## Configuration
- `.env` file present (DO NOT read - contains secrets)
- Key env var: `VITE_API_URL` - Google Apps Script Web App URL
- Accessed via `import.meta.env.VITE_API_URL` in `src/config/api.js`
- When `VITE_API_URL` is empty/missing, app falls back to local mock data
- `vite.config.js` - Vite + React plugin + PWA plugin + Vitest config
- `tailwind.config.js` - Custom color tokens + font families
- `postcss.config.js` - Tailwind CSS + Autoprefixer pipeline
- `eslint.config.js` - ESLint flat config with React hooks/refresh plugins
- Colors: `burgundy`, `burgundy-dark`, `burgundy-light`, `burgundy-soft`, `gold`, `gold-light`, `gold-dark`, `gold-soft`, `off-white`, `cream`, `text-dark`, `text-body`, `text-muted`, `text-light`, `border`, `border-light`, `success`, `success-soft`, `warning`, `warning-soft`, `error`, `error-soft`, `dark-bg`
- Fonts: `font-cinzel` (Cinzel, serif), `font-montserrat` (Montserrat, sans-serif)
- Register type: `autoUpdate`
- App shell precache: `**/*.{js,css,html,png,svg,ico,woff2}`
- Navigate fallback: `/offline.html`
- Runtime caching: Google Fonts (CacheFirst, 1yr), Google Apps Script API (NetworkFirst, 10s timeout)
- Environment: jsdom
- Globals: enabled (no need to import `describe`/`it`/`expect`)
- Setup file: `src/tests/setup.js` (imports `@testing-library/jest-dom`)
## Platform Requirements
- Node.js 18+
- npm (any recent version)
- `npm install` then `npm run dev` -> http://localhost:5173
- Static hosting (Vercel or similar) - outputs to `dist/`
- PWA-capable (service worker, manifest, offline fallback)
- Backend: Google Apps Script Web App (separate deployment)
- `npm run dev` - Vite dev server
- `npm run build` - Production build
- `npm run lint` - ESLint check (mandatory before delivery)
- `npm run preview` - Preview production build locally
- `npm test` - Run all tests (`vitest run`)
- `npm run test:watch` - Tests in watch mode
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- PascalCase for React components: `LoginPage.jsx`, `StudentRow.jsx`, `Button.jsx`
- camelCase for non-component JS modules: `api.js`, `users.js`
- camelCase prefixed with `use` for hooks: `useConvocatorias.js`, `useStudents.js`
- Test files mirror component name with `.test.jsx` suffix: `Button.test.jsx`
- PascalCase, named exports via `export default function ComponentName()`: every component uses this pattern
- Private/helper components defined as plain functions in the same file (e.g., `LoginInput` in `src/pages/LoginPage.jsx`)
- camelCase for all functions: `handleLogin`, `toggleStudent`, `loadStudents`
- Event handlers prefixed with `handle` in components: `handleClick`, `handleLogin`, `handleGroupChange`
- Callbacks prefixed with `on` in props: `onClick`, `onToggle`, `onLogout`
- camelCase for all variables: `loadingStudents`, `selectedGroup`, `presentCount`
- UPPER_SNAKE_CASE for module-level constants: `GROUPS`, `MOCK_GROUPS`, `USERS`
- No TypeScript. Props documented via JSDoc `@param` tags in component headers.
## Code Style
- No Prettier config detected. Formatting is manual/editor-based.
- 2-space indentation observed throughout.
- Single quotes for strings.
- No trailing semicolons inconsistency -- semicolons are NOT used (implicit ASI).
- Wait: semicolons ARE used consistently. Correction after re-checking files: no semicolons at end of import lines in some files, but generally inconsistent. Actually re-checking: imports do NOT have semicolons in `api.js` lines but DO in test files. The codebase is inconsistent on semicolons -- no enforced rule.
- ESLint 9 with flat config: `eslint.config.js`
- Plugins: `eslint-plugin-react-hooks` (flat recommended), `eslint-plugin-react-refresh` (vite config)
- Custom rules: `no-unused-vars` set to error with `varsIgnorePattern: '^[A-Z_]'` (allows unused PascalCase/CONSTANT imports)
- Run with: `npm run lint`
## Language Policy
- **UI text, comments, commit messages:** Spanish
- **Code identifiers (variables, functions, components):** English
- Example: component named `StudentRow`, prop named `isPresent`, but label text reads `"Presentes"`
## Import Organization
- Relative paths only (`../`, `./`). No path aliases configured.
- `.jsx` extension included in component imports: `import Button from '../components/ui/Button.jsx'`
- `.js` extension omitted for non-component modules: `import { API_URL } from '../config/api'`
## Component Patterns
- `useState`, `useEffect`, `useCallback`, `useRef` from React
- `useNavigate`, `useLocation` from react-router-dom
- Custom hooks in `src/hooks/`: `useConvocatorias`, `useStudents`
## Styling Approach
- Colors: `bg-burgundy`, `text-gold`, `text-error`, `bg-dark-bg`, `border-border-light`
- Fonts: `font-cinzel` (headings), `font-montserrat` (body)
- Status colors: `text-success` (>=80%), `text-warning` (60-79%), `text-error` (<60%)
## Error Handling
- `try/catch` in async functions with user-facing error messages in Spanish
- Error state managed via `useState`: `const [error, setError] = useState(null)`
- API errors thrown as `new Error(json.error || 'Error desconocido de la API')` in `src/services/api.js`
- Cleanup pattern with `cancelled` flag in `useEffect` to prevent state updates after unmount:
## Comments & Documentation
## Commit Conventions
- `feat:` for new features
- `fix:` for bug fixes
- `refactor:` for restructuring
- `docs:` for documentation
- `chore:` for maintenance
- `feat: actualizarEstadisticasGrupo -- stats auto tras guardar asistencia`
- `refactor: auditoria baseline-ui -- 15 correcciones de diseno en 18 archivos`
- `docs: fase 13 -- CacheService en Apps Script + deploy Vercel + E2E`
## Module Design
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Single Page Application (React 19 + React Router 7) with no SSR
- Mobile-first PWA (max-width 430px) wrapped in a device frame on desktop
- Dual-mode data: live API (Google Apps Script) or local mock data, toggled by `VITE_API_URL`
- Role-based access (teacher / ceo) with sessionStorage auth
- No global state library -- uses React local state + custom hooks + sessionStorage
## Layers
- Purpose: Route-level views that orchestrate layout and compose feature/UI components
- Location: `src/pages/`
- Contains: `LoginPage.jsx`, `ConvocatoriaPage.jsx`, `AttendancePage.jsx`, `SavedPage.jsx`, `DashboardPage.jsx`
- Depends on: hooks, services/api, components/features, components/ui, config
- Used by: `src/App.jsx` via React Router `<Route>` elements
- Purpose: Components with business logic, domain-specific behavior, event handling
- Location: `src/components/features/`
- Contains: `PageHeader.jsx`, `GroupTabs.jsx`, `StudentRow.jsx`, `StudentDetailPopup.jsx`, `AlertList.jsx`, `TeacherCard.jsx`, `ConvocatoriaSelector.jsx`
- Depends on: `src/components/ui/`, `src/config/teachers.js`, `src/services/api.js`
- Used by: Pages
- Purpose: Pure, reusable presentation components with no business logic
- Location: `src/components/ui/`
- Contains: `Button.jsx`, `StatCard.jsx`, `Avatar.jsx`, `Badge.jsx`, `Modal.jsx`, `ProgressBar.jsx`, `ToggleSwitch.jsx`, `SearchInput.jsx`
- Depends on: Nothing (self-contained)
- Used by: Feature components and pages
- Purpose: Encapsulate data fetching, caching, and state management logic
- Location: `src/hooks/`
- Contains: `useStudents.js` (student loading with group cache + prefetch), `useConvocatorias.js` (convocatoria fetching + selection)
- Depends on: `src/services/api.js`, `src/config/api.js`
- Used by: `AttendancePage.jsx`, `DashboardPage.jsx`
- Purpose: Single module wrapping all Google Apps Script API calls (GET/POST)
- Location: `src/services/api.js`
- Contains: `apiGet()`, `apiPost()` base functions + named exports per endpoint (`getConvocatorias`, `getAlumnos`, `getAsistencia`, `getResumen`, `guardarAsistencia`, `crearAlumno`, `actualizarAlumno`, `getAsistenciaAlumno`, `getProfesores`)
- Depends on: `src/config/api.js` for URL + feature flag
- Used by: Hooks and pages
- Purpose: Static data, API config, mock datasets
- Location: `src/config/`
- Contains: `api.js` (API URL + `isApiEnabled()` flag), `users.js` (hardcoded user credentials), `teachers.js` (mock teacher/student data + `getAttendanceScheme()` helper)
- Used by: All layers
- Purpose: Pure data transformation functions
- Location: `src/utils/`
- Contains: `buildTeachersHierarchy.js` (transforms flat API response into teacher->group->students tree)
- Used by: `DashboardPage.jsx`
## Data Flow
- **Auth state:** `sessionStorage.getItem('user')` -- read directly by `ProtectedRoute` and pages via `useMemo`
- **Page state:** React `useState` within each page component
- **Data fetching state:** Custom hooks (`useStudents`, `useConvocatorias`) encapsulate loading/error/data
- **Cross-page data:** Passed via React Router `location.state` (convocatoria object, save results)
- **Caching:** `useStudents` uses `useRef` for in-memory group cache; PWA Workbox caches API responses (NetworkFirst, 10s timeout)
## Key Abstractions
- Purpose: App works offline/without backend using mock data, switches to live API when `VITE_API_URL` is set
- Guard: `isApiEnabled()` from `src/config/api.js` returns `false` when URL is empty
- All `src/services/api.js` functions return `null` when API is disabled
- Pages and hooks fall back to mock data from `src/config/teachers.js` and `src/hooks/useStudents.js` (MOCK_GROUPS)
- Purpose: The active convocatoria determines which students/data to load
- Passed via `location.state` from `LoginPage`/`ConvocatoriaPage` to `AttendancePage`
- Selected via `useConvocatorias` hook in `DashboardPage`
- All API calls require `convocatoria_id` as a parameter
- Purpose: Consistent color semantics across all attendance percentages
- Implementation: `getAttendanceScheme()` in `src/config/teachers.js` and `getAttendanceColor()` in `src/components/features/StudentDetailPopup.jsx`
- Thresholds: >=80% success (green), 60-79% warning (orange), <60% error (red)
## Entry Points
- Location: `index.html` -> `src/main.jsx`
- Renders: `StrictMode` > `ErrorBoundary` > `App`
- `App` (`src/App.jsx`) sets up `BrowserRouter` > `MobileContainer` > `Routes`
- `/` -> `LoginPage` (public)
- `/convocatorias` -> `ProtectedRoute(teacher)` > `ConvocatoriaPage`
- `/attendance` -> `ProtectedRoute(teacher)` > `AttendancePage`
- `/saved` -> `ProtectedRoute(teacher)` > `SavedPage`
- `/dashboard` -> `ProtectedRoute(ceo)` > `DashboardPage`
- Location: Auto-generated by `vite-plugin-pwa` (config in `vite.config.js`)
- Offline fallback: `public/offline.html`
## Error Handling
- **Global ErrorBoundary** (`src/components/ErrorBoundary.jsx`): Class component wrapping the entire app in `src/main.jsx`. Catches render errors, shows recovery UI with reload button. In dev mode, displays error message.
- **API errors:** `src/services/api.js` throws `Error` when response has `status: 'error'`. Callers use try/catch in hooks and pages.
- **Login timeout:** `LoginPage` uses `Promise.race` with 8-second timeout on `getConvocatorias()` call.
- **Cancelled async operations:** Hooks (`useStudents`, `useConvocatorias`, `StudentDetailPopup`) use `cancelled` flag pattern in `useEffect` cleanup to prevent state updates on unmounted components.
- **Dashboard error state:** `DashboardPage` renders error UI with a "Reintentar" button that calls `reload()` from `useConvocatorias`.
- **Silent failures:** Prefetch calls in `useStudents` silently catch errors (`catch(() => {})`).
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
