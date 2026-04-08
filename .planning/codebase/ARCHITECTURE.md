# Architecture

**Analysis Date:** 2026-03-30

## Pattern Overview

**Overall:** Client-side SPA with external serverless backend (Google Apps Script)

**Key Characteristics:**
- Single Page Application (React 19 + React Router 7) with no SSR
- Mobile-first PWA (max-width 430px) wrapped in a device frame on desktop
- Dual-mode data: live API (Google Apps Script) or local mock data, toggled by `VITE_API_URL`
- Role-based access (teacher / ceo) with sessionStorage auth
- No global state library -- uses React local state + custom hooks + sessionStorage

## Layers

**Presentation (Pages):**
- Purpose: Route-level views that orchestrate layout and compose feature/UI components
- Location: `src/pages/`
- Contains: `LoginPage.jsx`, `ConvocatoriaPage.jsx`, `AttendancePage.jsx`, `SavedPage.jsx`, `DashboardPage.jsx`
- Depends on: hooks, services/api, components/features, components/ui, config
- Used by: `src/App.jsx` via React Router `<Route>` elements

**Feature Components:**
- Purpose: Components with business logic, domain-specific behavior, event handling
- Location: `src/components/features/`
- Contains: `PageHeader.jsx`, `GroupTabs.jsx`, `StudentRow.jsx`, `StudentDetailPopup.jsx`, `AlertList.jsx`, `TeacherCard.jsx`, `ConvocatoriaSelector.jsx`
- Depends on: `src/components/ui/`, `src/config/teachers.js`, `src/services/api.js`
- Used by: Pages

**UI Components (Atomic):**
- Purpose: Pure, reusable presentation components with no business logic
- Location: `src/components/ui/`
- Contains: `Button.jsx`, `StatCard.jsx`, `Avatar.jsx`, `Badge.jsx`, `Modal.jsx`, `ProgressBar.jsx`, `ToggleSwitch.jsx`, `SearchInput.jsx`
- Depends on: Nothing (self-contained)
- Used by: Feature components and pages

**Custom Hooks:**
- Purpose: Encapsulate data fetching, caching, and state management logic
- Location: `src/hooks/`
- Contains: `useStudents.js` (student loading with group cache + prefetch), `useConvocatorias.js` (convocatoria fetching + selection)
- Depends on: `src/services/api.js`, `src/config/api.js`
- Used by: `AttendancePage.jsx`, `DashboardPage.jsx`

**Service Layer:**
- Purpose: Single module wrapping all Google Apps Script API calls (GET/POST)
- Location: `src/services/api.js`
- Contains: `apiGet()`, `apiPost()` base functions + named exports per endpoint (`getConvocatorias`, `getAlumnos`, `getAsistencia`, `getResumen`, `guardarAsistencia`, `crearAlumno`, `actualizarAlumno`, `getAsistenciaAlumno`, `getProfesores`)
- Depends on: `src/config/api.js` for URL + feature flag
- Used by: Hooks and pages

**Configuration:**
- Purpose: Static data, API config, mock datasets
- Location: `src/config/`
- Contains: `api.js` (API URL + `isApiEnabled()` flag), `users.js` (hardcoded user credentials), `teachers.js` (mock teacher/student data + `getAttendanceScheme()` helper)
- Used by: All layers

**Utilities:**
- Purpose: Pure data transformation functions
- Location: `src/utils/`
- Contains: `buildTeachersHierarchy.js` (transforms flat API response into teacher->group->students tree)
- Used by: `DashboardPage.jsx`

## Data Flow

**Teacher Attendance Flow (primary flow):**

1. `LoginPage` authenticates against hardcoded `USERS` array in `src/config/users.js`
2. User object stored in `sessionStorage` as JSON under key `user`
3. If API enabled, `LoginPage` calls `getConvocatorias()` from `src/services/api.js`
4. If 1 convocatoria: navigates to `/attendance` with convocatoria in `location.state`
5. If 2+ convocatorias: navigates to `/convocatorias` which renders selector
6. `AttendancePage` receives convocatoria via `location.state.convocatoria`
7. `useStudents` hook loads students for current group via `getAlumnos()`, caches per group in `useRef`, prefetches G2-G4
8. Teacher toggles attendance per student (local state mutation)
9. On save: `guardarAsistencia()` POSTs data to Apps Script, then navigates to `/saved`

**CEO Dashboard Flow:**

1. `LoginPage` authenticates CEO, navigates to `/dashboard`
2. `useConvocatorias` hook loads active convocatorias
3. `DashboardPage` calls `getProfesores()` + `getResumen()` in parallel
4. `buildTeachersHierarchy()` transforms flat data into nested tree
5. Teacher cards expand to show groups, groups expand to show students
6. Student click opens `StudentDetailPopup` which loads absence data via `getAsistenciaAlumno()`

**State Management:**
- **Auth state:** `sessionStorage.getItem('user')` -- read directly by `ProtectedRoute` and pages via `useMemo`
- **Page state:** React `useState` within each page component
- **Data fetching state:** Custom hooks (`useStudents`, `useConvocatorias`) encapsulate loading/error/data
- **Cross-page data:** Passed via React Router `location.state` (convocatoria object, save results)
- **Caching:** `useStudents` uses `useRef` for in-memory group cache; PWA Workbox caches API responses (NetworkFirst, 10s timeout)

## Key Abstractions

**Dual-mode API pattern:**
- Purpose: App works offline/without backend using mock data, switches to live API when `VITE_API_URL` is set
- Guard: `isApiEnabled()` from `src/config/api.js` returns `false` when URL is empty
- All `src/services/api.js` functions return `null` when API is disabled
- Pages and hooks fall back to mock data from `src/config/teachers.js` and `src/hooks/useStudents.js` (MOCK_GROUPS)

**Convocatoria as routing context:**
- Purpose: The active convocatoria determines which students/data to load
- Passed via `location.state` from `LoginPage`/`ConvocatoriaPage` to `AttendancePage`
- Selected via `useConvocatorias` hook in `DashboardPage`
- All API calls require `convocatoria_id` as a parameter

**Attendance scheme (color coding):**
- Purpose: Consistent color semantics across all attendance percentages
- Implementation: `getAttendanceScheme()` in `src/config/teachers.js` and `getAttendanceColor()` in `src/components/features/StudentDetailPopup.jsx`
- Thresholds: >=80% success (green), 60-79% warning (orange), <60% error (red)

## Entry Points

**Browser entry:**
- Location: `index.html` -> `src/main.jsx`
- Renders: `StrictMode` > `ErrorBoundary` > `App`
- `App` (`src/App.jsx`) sets up `BrowserRouter` > `MobileContainer` > `Routes`

**Route definitions (in `src/App.jsx`):**
- `/` -> `LoginPage` (public)
- `/convocatorias` -> `ProtectedRoute(teacher)` > `ConvocatoriaPage`
- `/attendance` -> `ProtectedRoute(teacher)` > `AttendancePage`
- `/saved` -> `ProtectedRoute(teacher)` > `SavedPage`
- `/dashboard` -> `ProtectedRoute(ceo)` > `DashboardPage`

**PWA Service Worker:**
- Location: Auto-generated by `vite-plugin-pwa` (config in `vite.config.js`)
- Offline fallback: `public/offline.html`

## Error Handling

**Strategy:** Per-component error handling with a global ErrorBoundary safety net

**Patterns:**
- **Global ErrorBoundary** (`src/components/ErrorBoundary.jsx`): Class component wrapping the entire app in `src/main.jsx`. Catches render errors, shows recovery UI with reload button. In dev mode, displays error message.
- **API errors:** `src/services/api.js` throws `Error` when response has `status: 'error'`. Callers use try/catch in hooks and pages.
- **Login timeout:** `LoginPage` uses `Promise.race` with 8-second timeout on `getConvocatorias()` call.
- **Cancelled async operations:** Hooks (`useStudents`, `useConvocatorias`, `StudentDetailPopup`) use `cancelled` flag pattern in `useEffect` cleanup to prevent state updates on unmounted components.
- **Dashboard error state:** `DashboardPage` renders error UI with a "Reintentar" button that calls `reload()` from `useConvocatorias`.
- **Silent failures:** Prefetch calls in `useStudents` silently catch errors (`catch(() => {})`).

## Cross-Cutting Concerns

**Logging:** `console.error` only in `ErrorBoundary.componentDidCatch`. No structured logging framework.

**Validation:** Client-side only. Login validates against hardcoded user list. No form validation library.

**Authentication:** Hardcoded credentials in `src/config/users.js`. Session stored in `sessionStorage`. Route guards via `src/components/ProtectedRoute.jsx` which checks `sessionStorage` for user object and validates role.

**Mobile Container:** `src/components/MobileContainer.jsx` wraps all routes, constraining layout to 430px max-width with device-frame styling on desktop via a `<style>` block (exception to the no-inline-styles rule, documented in CLAUDE.md).

---

*Architecture analysis: 2026-03-30*
