# Codebase Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
novattend/
├── apps-script/                # Google Apps Script source (clasp-managed)
│   ├── .clasp.json             # clasp config
│   ├── appsscript.json         # Apps Script manifest
│   ├── Código.js               # API REST (doGet/doPost)
│   └── Gestion convocatorias.js # Convocatoria management
├── docs/                       # Documentation & specs
│   ├── apps-script/            # Reference copies of backend scripts
│   ├── auditoria/              # Code audit reports
│   ├── plans/                  # Design documents & phase plans
│   ├── progress.md             # Session relay document
│   └── *.md                    # Setup guides, user manuals
├── public/                     # Static assets (served at root)
│   ├── logova1.png             # App logo / PWA icon
│   ├── offline.html            # PWA offline fallback page
│   └── vite.svg                # Default Vite favicon
├── src/                        # Application source code
│   ├── assets/                 # Bundled assets (unused, default Vite)
│   ├── components/
│   │   ├── ui/                 # Atomic/pure UI components (8 files)
│   │   ├── features/           # Business-logic components (7 files)
│   │   ├── ErrorBoundary.jsx   # Global error boundary (class component)
│   │   ├── MobileContainer.jsx # Mobile-first viewport wrapper
│   │   └── ProtectedRoute.jsx  # Auth + role route guard
│   ├── config/                 # Static data & configuration
│   │   ├── api.js              # API URL + isApiEnabled()
│   │   ├── users.js            # Hardcoded user credentials
│   │   └── teachers.js         # Mock teacher/student data + getAttendanceScheme()
│   ├── hooks/                  # Custom React hooks
│   │   ├── useStudents.js      # Student loading, caching, attendance state
│   │   └── useConvocatorias.js # Convocatoria fetching & selection
│   ├── pages/                  # Route-level view components (5 files)
│   │   ├── LoginPage.jsx
│   │   ├── ConvocatoriaPage.jsx
│   │   ├── AttendancePage.jsx
│   │   ├── SavedPage.jsx
│   │   └── DashboardPage.jsx
│   ├── services/
│   │   └── api.js              # API client (all Google Apps Script calls)
│   ├── styles/
│   │   └── animations.css      # Custom CSS keyframes (fadeUp, slideUp, etc.)
│   ├── tests/                  # Unit tests (Vitest + Testing Library)
│   │   ├── setup.js            # Test environment setup
│   │   └── *.test.jsx          # Test files (7 suites)
│   ├── utils/
│   │   └── buildTeachersHierarchy.js  # API data transformer
│   ├── main.jsx                # App entry point (ReactDOM.createRoot)
│   ├── App.jsx                 # Router + route definitions
│   ├── App.css                 # Minimal global styles
│   └── index.css               # Tailwind directives + base styles
├── .planning/codebase/         # GSD codebase analysis docs
├── index.html                  # HTML shell (Vite entry)
├── vite.config.js              # Vite + PWA + Vitest config
├── tailwind.config.js          # Tailwind theme (colors, fonts, extend)
├── postcss.config.js           # PostCSS (Tailwind + autoprefixer)
├── eslint.config.js            # ESLint flat config
├── package.json                # Dependencies & scripts
└── CLAUDE.md                   # AI agent instructions & project rules
```

## Directory Purposes

**`src/components/ui/`:**
- Purpose: Pure, stateless presentation components. No business logic, no API calls.
- Contains: 8 atomic components
- Key files:
  - `Button.jsx` (71 lines) - Primary action button with loading/disabled/icon variants
  - `StatCard.jsx` (60 lines) - Numeric stat display with icon and color
  - `Badge.jsx` (30 lines) - Status/label badge
  - `Avatar.jsx` (43 lines) - Initials avatar with size/color variants
  - `Modal.jsx` (35 lines) - Overlay modal wrapper
  - `ProgressBar.jsx` (40 lines) - Percentage bar with dynamic width
  - `SearchInput.jsx` (51 lines) - Search field with clear button
  - `ToggleSwitch.jsx` (36 lines) - Boolean toggle switch

**`src/components/features/`:**
- Purpose: Components that contain business logic, handle events, call services
- Contains: 7 feature components
- Key files:
  - `TeacherCard.jsx` (143 lines) - Expandable teacher card with nested groups/students
  - `StudentDetailPopup.jsx` (152 lines) - Student detail modal with API-loaded absences
  - `PageHeader.jsx` (67 lines) - Sticky header with logo, title, badge, logout, children slot
  - `StudentRow.jsx` (59 lines) - Attendance toggle row for a student
  - `GroupTabs.jsx` (30 lines) - G1/G2/G3/G4 tab selector
  - `AlertList.jsx` (43 lines) - Alert popup listing students below attendance threshold
  - `ConvocatoriaSelector.jsx` (37 lines) - Dropdown selector for active convocatorias

**`src/components/` (root):**
- Purpose: Special structural components that don't fit ui/ or features/
- `ErrorBoundary.jsx` (53 lines) - Class component, global error catch
- `MobileContainer.jsx` (36 lines) - Mobile viewport wrapper with desktop frame
- `ProtectedRoute.jsx` (17 lines) - Route guard checking sessionStorage + role

**`src/pages/`:**
- Purpose: Route-level orchestrator views. Compose features/ui, manage page-level state.
- Keep pages lightweight; extract logic to hooks.
- Key files:
  - `DashboardPage.jsx` (272 lines) - Largest file, CEO analytics view
  - `AttendancePage.jsx` (170 lines) - Teacher attendance marking
  - `LoginPage.jsx` (144 lines) - Authentication with convocatoria preloading
  - `ConvocatoriaPage.jsx` (72 lines) - Convocatoria selector page
  - `SavedPage.jsx` (65 lines) - Post-save confirmation

**`src/hooks/`:**
- Purpose: Reusable stateful logic extracted from pages
- `useStudents.js` (156 lines) - Manages student list per group, caching, toggle, stats
- `useConvocatorias.js` (68 lines) - Fetches and manages convocatoria selection

**`src/services/`:**
- Purpose: API client layer. Single file with all backend communication.
- `api.js` (160 lines) - GET/POST wrappers + named endpoint functions

**`src/config/`:**
- Purpose: Static configuration and mock data
- `api.js` (7 lines) - API URL from env, `isApiEnabled()` guard
- `users.js` (10 lines) - Hardcoded user credential array
- `teachers.js` (144 lines) - Mock teacher/student hierarchy + `getAttendanceScheme()`

**`src/utils/`:**
- Purpose: Pure transformation functions with no side effects
- `buildTeachersHierarchy.js` (31 lines) - Reshapes flat API data into nested tree

**`src/tests/`:**
- Purpose: Unit tests co-located in a single directory
- `setup.js` - Vitest setup (jsdom, jest-dom matchers)
- 7 test files: `ProtectedRoute.test.jsx`, `Button.test.jsx`, `Badge.test.jsx`, `StatCard.test.jsx`, `StudentRow.test.jsx`, `LoginPage.test.jsx`, `ConvocatoriaPage.test.jsx`, `api.test.jsx`

**`apps-script/`:**
- Purpose: Backend source managed via clasp. Deployed as Google Apps Script Web App.
- NOT bundled with the frontend. Deployed independently to Google.

**`docs/`:**
- Purpose: Project documentation, audit reports, design plans, progress tracking
- `progress.md` is the session relay document (mandatory per CLAUDE.md)

## Key File Locations

**Entry Points:**
- `index.html`: HTML shell with Google Fonts preconnect, loads `src/main.jsx`
- `src/main.jsx`: React root render with StrictMode + ErrorBoundary
- `src/App.jsx`: BrowserRouter + all route definitions

**Configuration:**
- `vite.config.js`: Vite build config + PWA manifest + Workbox caching rules + Vitest config
- `tailwind.config.js`: Design system tokens (colors, fonts, extends)
- `postcss.config.js`: PostCSS plugins (tailwind + autoprefixer)
- `eslint.config.js`: ESLint flat config
- `src/config/api.js`: Runtime API URL configuration

**Core Logic:**
- `src/services/api.js`: All backend API communication
- `src/hooks/useStudents.js`: Student data management + attendance state
- `src/hooks/useConvocatorias.js`: Convocatoria data management
- `src/utils/buildTeachersHierarchy.js`: API response transformer

**Styling:**
- `src/index.css`: Tailwind directives (@tailwind base/components/utilities)
- `src/styles/animations.css`: Custom CSS keyframes (fadeUp, slideUp, popIn, shake)
- `src/App.css`: Minimal global overrides

## Naming Conventions

**Files:**
- Components: `PascalCase.jsx` (e.g., `StudentRow.jsx`, `PageHeader.jsx`)
- Hooks: `camelCase.js` with `use` prefix (e.g., `useStudents.js`)
- Utils: `camelCase.js` (e.g., `buildTeachersHierarchy.js`)
- Config: `camelCase.js` (e.g., `api.js`, `users.js`)
- Tests: `PascalCase.test.jsx` matching the component name (e.g., `Button.test.jsx`)
- CSS: `camelCase.css` (e.g., `animations.css`)

**Directories:**
- Lowercase, plural where appropriate: `pages/`, `hooks/`, `components/`, `tests/`
- Component subdirs use category names: `ui/`, `features/`

## Where to Add New Code

**New Page (route):**
- Create component in `src/pages/NewPage.jsx`
- Add `<Route>` in `src/App.jsx` (wrap with `<ProtectedRoute>` if auth required)
- Page should be an orchestrator: compose features/ui, delegate logic to hooks

**New UI Component (pure/atomic):**
- Add to `src/components/ui/NewComponent.jsx`
- Must be stateless or only use internal UI state
- No API calls, no business logic
- Add JSDoc header documenting props

**New Feature Component (with business logic):**
- Add to `src/components/features/NewFeature.jsx`
- May import from `src/components/ui/`, `src/services/api.js`, `src/config/`
- Add JSDoc header documenting props

**New Hook:**
- Add to `src/hooks/useNewHook.js`
- Follow pattern from `useStudents.js`: export default function, return object with state + actions
- Handle `isApiEnabled()` guard for mock/live dual-mode

**New API Endpoint:**
- Add named export function in `src/services/api.js`
- Use `apiGet()` or `apiPost()` base functions
- Add JSDoc with param types

**New Utility Function:**
- Add to `src/utils/newUtil.js`
- Must be a pure function (no side effects, no imports from React/services)

**New Test:**
- Add to `src/tests/ComponentName.test.jsx`
- Use Vitest + @testing-library/react (see `src/tests/setup.js` for environment)

**New Mock Data:**
- Add to `src/config/` as a new file or extend existing ones

## Special Directories

**`apps-script/`:**
- Purpose: Google Apps Script backend source (clasp project)
- Generated: No (manually written)
- Committed: Not yet committed (shown as untracked in git status)
- Deploy: Via `clasp push` independently from frontend

**`public/`:**
- Purpose: Static assets served at root URL (not processed by Vite)
- Generated: No
- Committed: Yes
- Note: `offline.html` is the PWA fallback page

**`dist/`:**
- Purpose: Production build output from `npm run build`
- Generated: Yes (by Vite)
- Committed: No (in .gitignore)

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents
- Generated: By Claude Code mapping
- Committed: Depends on workflow

**`docs/auditoria/`:**
- Purpose: Code audit reports (6 documents covering errors, deps, perf, PWA, security, quality)
- Generated: No (authored analysis)
- Committed: Not yet committed

---

*Structure analysis: 2026-03-30*
