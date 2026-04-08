# External Integrations

**Analysis Date:** 2026-03-30

## APIs & External Services

**Google Apps Script Web App (Primary Backend):**
- Purpose: REST-like API for attendance data CRUD
- Client: Native `fetch` via `src/services/api.js`
- Base URL: Configured via `VITE_API_URL` env var
- Auth: None (Web App deployed as "Anyone, anonymous")
- Protocol: GET with `action` query param, POST with JSON body containing `action` field
- Response format: `{ status: "ok"|"error", data: {...}, error?: "..." }`
- Fallback: When `VITE_API_URL` is empty, app uses local mock data from `src/config/`

**API Endpoints (via `src/services/api.js`):**

| Function | Method | Action | Purpose |
|----------|--------|--------|---------|
| `getConvocatorias()` | GET | `getConvocatorias` | List active convocatorias |
| `getProfesores()` | GET | `getProfesores` | List active teachers |
| `getAlumnos(convId, profId?, grupo?)` | GET | `getAlumnos` | Students by convocatoria/group |
| `getAsistencia(convId, profId?, grupo?, fecha?)` | GET | `getAsistencia` | Attendance records |
| `getResumen(convId, profId?, grupo?)` | GET | `getResumen` | Attendance summary with percentages |
| `getAsistenciaAlumno(convId, alumnoId)` | GET | `getAsistencia` | Single student attendance history |
| `guardarAsistencia(data)` | POST | `guardarAsistencia` | Save group attendance |
| `crearAlumno(data)` | POST | `crearAlumno` | Create new student |
| `actualizarAlumno(id, campos)` | POST | `actualizarAlumno` | Update student data |

**API Helper Patterns (`src/services/api.js`):**
```javascript
// All API calls go through two base functions:
async function apiGet(action, params = {})   // GET with query params
async function apiPost(action, body = {})    // POST with JSON body

// Both check isApiEnabled() first — return null if no API URL configured
// Both throw Error on { status: "error" } response
```

## Data Storage

**Primary Database:**
- Google Sheets spreadsheet: "Control de Asistencia Global"
- Managed entirely via Google Apps Script backend
- No direct client access to Sheets

**System Sheets (in the spreadsheet):**
- `CONVOCATORIAS` - Convocatoria definitions with dates
- `PROFESORES` - Teacher registry
- `ALUMNOS` - Student registry with IDs
- `ASISTENCIA` - Attendance records
- `LOG` - System activity log

**Group Sheets (dynamically created):**
- Named as `PREFIX - TeacherName - GX` (e.g., `MAR26 - Samuel - G1`)
- Created by `crearConvocatoria()` in Apps Script
- Convocatoria ID derived from prefix: `conv-mar26`

**Client-Side Storage:**
- `sessionStorage` key `user` - JSON object with authenticated user data (role, name, groups)
- `useRef` cache in `src/hooks/useStudents.js` - In-memory cache of student data per group (avoids refetch on tab switch)
- No `localStorage` usage detected
- No IndexedDB usage

**File Storage:**
- Local filesystem only (static assets in `public/`)
- No cloud file storage integration

**Caching:**
- PWA Service Worker (Workbox) with runtime caching strategies:
  - Google Fonts CSS: CacheFirst, 365-day expiration, max 10 entries
  - Google Fonts WOFF2: CacheFirst, 365-day expiration, max 30 entries
  - Apps Script API: NetworkFirst, 10s timeout, 24h cache, max 50 entries
- Backend: Apps Script CacheService with 2-minute TTL on GET endpoints

## Authentication & Identity

**Auth Provider:** Custom (hardcoded user list)
- Implementation: Username/password matched against `src/config/users.js`
- 7 teacher accounts + 1 CEO admin account
- No external auth provider (no OAuth, no JWT)
- Session: JSON object stored in `sessionStorage` under key `user`
- Route protection: `src/components/ProtectedRoute.jsx` validates session existence and role

**Roles:**
- `teacher` - Access to `/convocatorias`, `/attendance`, `/saved`
- `ceo` - Access to `/dashboard`

**Security Note:** Credentials are hardcoded in `src/config/users.js` (client-side). The Apps Script Web App endpoint is publicly accessible (`ANYONE_ANONYMOUS` in `apps-script/appsscript.json`). No server-side authentication layer exists.

## Google Fonts (CDN)

**Loaded via `index.html`:**
- Cinzel: weights 400-900 (headings, branding)
- Montserrat: weights 300-800 (body text)
- Preconnect hints to `fonts.googleapis.com` and `fonts.gstatic.com`
- Cached by service worker (CacheFirst strategy)

## Monitoring & Observability

**Error Tracking:**
- `src/components/ErrorBoundary.jsx` - Global React error boundary (class component)
- No external error tracking service (no Sentry, no Datadog)

**Logs:**
- Backend: `LOG` sheet in Google Sheets (written by Apps Script)
- Frontend: No structured logging. Standard `console` usage only.

## CI/CD & Deployment

**Hosting:**
- Frontend: Vercel (based on project docs)
- Backend: Google Apps Script Web App (separate deploy via Apps Script editor)

**CI Pipeline:**
- None detected (no `.github/workflows/`, no CI config files)

**Build Output:**
- `dist/` directory (gitignored)
- Production JS bundle: ~269KB (per project docs)

## Apps Script Backend

**Files (in `apps-script/` directory):**
- `Código.js` - Main API router (`doGet`/`doPost`) with all CRUD endpoints
- `Gestion convocatorias.js` - Convocatoria lifecycle: creation (with color separator + 28 group sheets), student sync, statistics
- `appsscript.json` - Manifest: V8 runtime, Europe/Madrid timezone, anonymous access

**Backend Features:**
- Automatic convocatoria activation by date range
- Auto-sync of student names to ALUMNOS sheet with generated IDs
- Statistics auto-update after attendance save (`actualizarEstadisticasGrupo`)
- `onEdit` trigger and custom menu via `onOpen`
- CacheService for GET endpoint responses (2-min TTL)

## Environment Configuration

**Required env vars:**
- `VITE_API_URL` - Google Apps Script Web App deployment URL (without it, app runs in mock/offline mode)

**Env files:**
- `.env` present (contains `VITE_API_URL` value - not read for security)

**Configuration files:**
- `src/config/api.js` - Reads `VITE_API_URL`, exports `API_URL` and `isApiEnabled()`
- `src/config/users.js` - Hardcoded user credentials and roles
- `src/config/teachers.js` - Teacher display data

## Webhooks & Callbacks

**Incoming:**
- None (Apps Script Web App uses request/response, not webhooks)

**Outgoing:**
- None

## Mock Data System

When `VITE_API_URL` is not set, the app operates in mock mode:
- `src/config/users.js` - User credentials (always used, even with API)
- `src/hooks/useStudents.js` - Contains `MOCK_GROUPS` with 12 fake students per group (G1-G4)
- `src/hooks/useConvocatorias.js` - Returns empty array in mock mode
- `src/services/api.js` - All functions return `null` when API disabled

---

*Integration audit: 2026-03-30*
