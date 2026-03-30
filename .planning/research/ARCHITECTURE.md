# Architecture Patterns

**Project:** NovAttend — Mejoras Post-Auditoria (Olas 1-3)
**Domain:** React PWA refactoring — oversized page component decomposition + code splitting
**Researched:** 2026-03-30
**Confidence:** HIGH (verified against React 19 docs, Vite 7 build docs, vite-plugin-pwa official docs, current year articles)

---

## Problem Statement

`DashboardPage.jsx` is 272 lines with 14 import dependencies. It mixes three distinct concerns in a single file:
1. Data orchestration (two parallel API calls, convocatoria selection, cancellation tokens)
2. Derived calculations (totalStudents, globalAttendance, allStudents, alertStudents, searchResults — all `useMemo`)
3. Presentation (loading skeleton, error state, search results list, teacher list, two popups)

The fix is not cosmetic splitting — it is responsibility separation that makes each piece independently testable and replaceable.

---

## Recommended Architecture

### Pattern: Hook-First Decomposition

The modern React answer to "the container/presentational split" is to push all logic into a custom hook and keep the page as a thin orchestrator that wires together focused sub-components. This is the 2025 consensus pattern (verified: react.dev, patterns.dev, Robin Wieruch).

```
DashboardPage.jsx  (orchestrator, <80 lines after refactor)
  ├── hooks/useDashboard.js         (all state + data fetching + memos)
  ├── features/DashboardHeader.jsx  (PageHeader + ConvocatoriaSelector + StatCards)
  ├── features/DashboardSearch.jsx  (SearchInput + results dropdown)
  └── features/TeacherList.jsx      (h3 heading + TeacherCard map)
```

Popups (`StudentDetailPopup`, `AlertList`) stay in `DashboardPage.jsx` because they are already in `features/` and their open/close state is trivially two booleans that do not need extraction.

---

## Component Boundaries

### useDashboard.js (new hook)

**Responsibility:** Everything that is not JSX in the current DashboardPage.

| What it owns | Currently at |
|---|---|
| `teachers`, `loading`, `error` state | DashboardPage lines 28-34 |
| `loadConvData` async function | lines 37-43 |
| useEffect for initial load | lines 46-79 |
| `handleConvChange` handler | lines 82-95 |
| `totalStudents` useMemo | lines 97-100 |
| `globalAttendance` useMemo | lines 102-112 |
| `allStudents` useMemo | lines 114-126 |
| `alertStudents` useMemo | lines 128 |
| `searchQuery`, `searchResults` | lines 130-133 |
| `selectedStudent`, `expandedTeacher` | lines 31-33 |
| `showAlertPopup` | line 34 |

**Returns** a flat object (no nesting):
```js
{
  // convocatoria state (delegated to useConvocatorias)
  convocatorias, convocatoria, handleConvChange,
  // data
  teachers, loading, error, reload,
  // derived
  totalStudents, globalAttendance, alertStudents,
  // search
  searchQuery, setSearchQuery, searchResults,
  // UI toggles
  expandedTeacher, setExpandedTeacher,
  selectedStudent, setSelectedStudent,
  showAlertPopup, setShowAlertPopup,
}
```

**Communicates with:** `useConvocatorias` (delegates convocatoria list management), `getProfesores`, `getResumen` (direct API calls), `buildTeachersHierarchy` (pure util), `TEACHERS_DATA` (mock fallback).

**Does NOT communicate with:** any JSX component directly.

---

### DashboardHeader.jsx (new sub-component in features/)

**Responsibility:** The dark burgundy header section of the Dashboard.

**Receives as props:**
```jsx
<DashboardHeader
  convocatorias={convocatorias}
  convocatoria={convocatoria}
  onConvChange={handleConvChange}
  totalStudents={totalStudents}
  globalAttendance={globalAttendance}
  alertCount={alertStudents.length}
  onAlertClick={() => setShowAlertPopup(true)}
  onLogout={...}
/>
```

**Contains:** `PageHeader`, `Badge`, `ConvocatoriaSelector`, three `StatCard` instances.

**Does NOT own:** state, data fetching, event side effects. Pure renderer.

**Line count estimate:** ~55 lines.

---

### DashboardSearch.jsx (new sub-component in features/)

**Responsibility:** The search bar + results dropdown.

**Receives as props:**
```jsx
<DashboardSearch
  searchQuery={searchQuery}
  onChange={setSearchQuery}
  onClear={() => setSearchQuery('')}
  searchResults={searchResults}
  onStudentSelect={(student) => { setSelectedStudent(student); setSearchQuery('') }}
/>
```

**Contains:** `SearchInput`, conditional results list with click handlers.

**Does NOT own:** state, filtering logic (receives pre-filtered `searchResults` from hook).

**Line count estimate:** ~45 lines.

---

### TeacherList.jsx (new sub-component in features/)

**Responsibility:** Section heading + teacher card list.

**Receives as props:**
```jsx
<TeacherList
  teachers={teachers}
  expandedTeacher={expandedTeacher}
  onToggle={(id) => setExpandedTeacher(...)}
  onStudentClick={setSelectedStudent}
/>
```

**Contains:** `h3` heading, `teachers.map(...)` with `TeacherCard`.

**Does NOT own:** state, data.

**Line count estimate:** ~25 lines.

---

### DashboardPage.jsx (refactored orchestrator)

After extraction, the page becomes:

```jsx
export default function DashboardPage() {
  const dash = useDashboard()

  if (dash.loading) return <DashboardSkeleton />
  if (dash.error) return <DashboardError error={dash.error} onRetry={dash.reload} />

  return (
    <>
      <div className="...">
        <DashboardHeader ... />
        <DashboardSearch ... />
        <TeacherList ... />
      </div>
      <StudentDetailPopup ... />
      {dash.showAlertPopup && <AlertList ... />}
    </>
  )
}
```

**Line count estimate:** ~65 lines. Well under the 250-line limit.

**Note on DashboardSkeleton and DashboardError:** These are currently inline JSX blocks (lines 136-177). They should become named functions or small components inside the same `DashboardPage.jsx` file, or split to `features/DashboardSkeleton.jsx` if reuse is anticipated. For now, keeping them co-located in `DashboardPage.jsx` is fine since they are purely presentational and small (~40 lines each).

---

## Data Flow

```
Google Apps Script API
        |
        v
  services/api.js  (getProfesores, getResumen — parallel Promise.all)
        |
        v
  useDashboard.js  (owns all state, memos, handlers)
        |
        v
  DashboardPage.jsx  (reads hook return, distributes to children via props)
       /|\
      / | \
     /  |  \
DashboardHeader  DashboardSearch  TeacherList
(pure render)    (pure render)    (pure render)
```

Data flows **downward only** via props. No context needed — the hook is called once at the page level and props are drilled one level. At this scale (3 sub-components, 1 level of depth) prop drilling is the right choice. Context would add complexity with no benefit.

The `useConvocatorias` hook remains independent and is composed inside `useDashboard`. This preserves its reuse in `LoginPage` (which also fetches convocatorias post-login).

---

## Code Splitting Architecture

### React.lazy Integration with react-router-dom v7

The current `App.jsx` imports all 5 pages statically, producing a single 271KB bundle. The fix is three lines per route.

**Pattern (verified: Robin Wieruch, Mykola Aleksandrov 2025):**

```jsx
// App.jsx — after refactor
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MobileContainer from './components/MobileContainer'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'  // NOT lazy — first render path

const ConvocatoriaPage = lazy(() => import('./pages/ConvocatoriaPage'))
const AttendancePage   = lazy(() => import('./pages/AttendancePage'))
const SavedPage        = lazy(() => import('./pages/SavedPage'))
const DashboardPage    = lazy(() => import('./pages/DashboardPage'))

const PageFallback = <div className="min-h-dvh min-h-screen bg-off-white" />

function App() {
  return (
    <BrowserRouter>
      <MobileContainer>
        <Suspense fallback={PageFallback}>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/convocatorias" element={
              <ProtectedRoute allowedRole="teacher"><ConvocatoriaPage /></ProtectedRoute>
            } />
            <Route path="/attendance" element={
              <ProtectedRoute allowedRole="teacher"><AttendancePage /></ProtectedRoute>
            } />
            <Route path="/saved" element={
              <ProtectedRoute allowedRole="teacher"><SavedPage /></ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRole="ceo"><DashboardPage /></ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </MobileContainer>
    </BrowserRouter>
  )
}
```

**Why `LoginPage` is NOT lazy:** It is the first page every user hits. Lazy-loading it adds a waterfall request with zero benefit. The app shell loads, the service worker precaches, and LoginPage renders — all synchronous. Making it lazy would cause a visible flash on first load.

**Single Suspense boundary vs per-route:** One boundary at the `Routes` level is sufficient for a 5-page SPA. Per-route boundaries add boilerplate with no real benefit since transitions are instant after the first load (PWA precaches everything).

**Fallback UI:** Use a solid-color div matching `bg-off-white` instead of a spinner. This prevents layout shift and feels like an instant transition on subsequent visits (chunks are already precached by the service worker).

---

### Vite manualChunks for This SPA

**Verified configuration (Mykola Aleksandrov 2025, soledadpenades.com 2025):**

```js
// vite.config.js — build section addition
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (!id.includes('node_modules')) return  // app code → route chunks via lazy()
        if (id.includes('react-dom') || id.includes('react/'))
          return 'vendor-react'
        if (id.includes('react-router'))
          return 'vendor-router'
        return 'vendor'  // vite-plugin-pwa, workbox, etc.
      }
    }
  }
}
```

**Why this chunk structure for NovAttend:**

| Chunk | Contents | Why separate |
|---|---|---|
| `vendor-react` | react, react-dom | Never changes between deploys. Largest single dependency. Cache hit rate is near 100% after first load. |
| `vendor-router` | react-router-dom | Changes on react-router upgrades only, independent of React version bumps. |
| `vendor` | vite-plugin-pwa, workbox-* | Groups remaining node_modules. These rarely change. |
| `index` (main) | App.jsx, MobileContainer, ProtectedRoute, LoginPage | The minimum needed to paint the first screen. |
| Route chunks | ConvocatoriaPage, AttendancePage, SavedPage, DashboardPage + their features/ imports | Each teacher flow loads only its own chunk. CEO dashboard (~30KB after split) loads only when a CEO logs in. |

**Expected bundle result after splitting:**
- `vendor-react`: ~140KB (React 19 + ReactDOM) — cached long-term
- `vendor-router`: ~25KB — cached long-term
- `index`: ~30KB (down from 271KB) — changes with UI updates
- Route chunks: ~15-25KB each

Teachers never download the Dashboard chunk. CEOs never download AttendancePage/ConvocatoriaPage chunks.

---

### Service Worker Caching with Split Chunks

**Key finding (vite-pwa-org official docs, HIGH confidence):** When `globPatterns` includes `**/*.{js,css,html}`, the service worker **automatically precaches all generated chunks**, including lazy-loaded ones. No additional configuration needed.

The workbox precache manifest is regenerated on every `npm run build`. Each chunk gets a content hash. When only `DashboardPage` changes, only its chunk has a new hash — the `vendor-react` chunk cache entry remains valid and is not re-downloaded.

**Current vite.config.js `workbox.globPatterns`:**
```js
globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}']
```
This already covers `.js` files, so all split chunks will be precached automatically. No change required to the workbox configuration when adding code splitting.

**One concern:** The current `navigateFallback: '/offline.html'` points to a file that may not exist (listed as an Ola 1 fix in PROJECT.md). This must be corrected to `'/index.html'` before adding lazy loading, or offline navigation will silently fail when a user tries to navigate to `/dashboard` while offline.

---

## File Organization (features/ vs ui/ vs hooks/)

**Rule applied to this project:**

| Directory | What belongs there | Decision criteria |
|---|---|---|
| `src/hooks/` | State + side effects + derived data with NO JSX | Would this be unit-testable without rendering? Yes → hooks/ |
| `src/components/features/` | Components with domain knowledge or business rules in JSX | Does it know what "teacher" or "convocatoria" means? → features/ |
| `src/components/ui/` | Components that could exist in any app (StatCard, Button, Badge) | Could it ship in a design system? → ui/ |
| `src/pages/` | Route entry points — thin orchestrators | Does it map to a URL? → pages/ |

**Applied to the Dashboard refactor:**

- `useDashboard.js` → `src/hooks/` (pure logic, no JSX, unit-testable in isolation)
- `DashboardHeader.jsx` → `src/components/features/` (knows what a "convocatoria" is, contains domain-specific badge/labels)
- `DashboardSearch.jsx` → `src/components/features/` (knows about "alumnos", renders teacher + group metadata)
- `TeacherList.jsx` → `src/components/features/` (domain-specific list, renders teacher hierarchy)
- `DashboardPage.jsx` → `src/pages/` (stays, now thin orchestrator)

**What does NOT move:**
- `TeacherCard.jsx` — already in features/, already at 143 lines, well-structured
- `StudentDetailPopup.jsx` — already in features/
- `AlertList.jsx` — already in features/
- `useConvocatorias.js` — already in hooks/, already extracted correctly

---

## Build Order for Implementation

Dependencies between components determine the correct implementation sequence. Building in wrong order causes import errors or requires refactoring twice.

### Phase A — Extract useDashboard hook (Ola 3, Step 1)
**Build first.** The hook has no JSX dependencies. It can be written and tested before any sub-component exists. DashboardPage temporarily uses the hook while keeping its own JSX intact — this validates the hook's interface before committing to sub-components.

**Depends on:** useConvocatorias (already exists), services/api.js (already exists), buildTeachersHierarchy (already exists)
**Output:** `src/hooks/useDashboard.js`

### Phase B — Extract sub-components (Ola 3, Step 2)
Build after useDashboard exists so prop interfaces are known.

Order within Phase B is flexible (independent):
1. `TeacherList.jsx` — simplest, just a list render
2. `DashboardSearch.jsx` — contains conditional rendering of search results
3. `DashboardHeader.jsx` — most complex, composes 5 existing components

**Depends on:** useDashboard (for prop types), existing ui/ and features/ components

### Phase C — Refactor DashboardPage.jsx (Ola 3, Step 3)
Replace inline logic and inline sections with hook + sub-components.

**Depends on:** useDashboard, DashboardHeader, DashboardSearch, TeacherList

### Phase D — Code splitting in App.jsx (Ola 2, separate from Ola 3)
**Independent of Phase A-C.** Can be done before or after Dashboard refactor. The lazy() conversion does not care about DashboardPage's internal structure.

**Depends on:** react (lazy, Suspense), react-router-dom (already installed)

### Phase E — manualChunks in vite.config.js (Ola 2)
**Depends on:** Phase D (React.lazy must exist for chunk splitting to matter). Without lazy routes, manualChunks only separates vendor code — still useful, but the route chunk benefit requires lazy loading.

**Order:** D then E, or both in the same commit since they are in different files.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Splitting too many times
**What:** Creating `DashboardLoadingState.jsx` and `DashboardErrorState.jsx` as separate files.
**Why bad:** The loading and error states are ~15 lines each. Separate files add navigation overhead with zero reuse benefit. Keep them as named functions inside `DashboardPage.jsx` (allowed by the 250-line rule since the file ends up ~120 lines total).

### Anti-Pattern 2: Splitting at the wrong boundary
**What:** Moving `searchQuery` state into `DashboardSearch.jsx` to make it "self-contained."
**Why bad:** `searchQuery` feeds `searchResults` which is a `useMemo` that also depends on `allStudents` (which comes from the API response). Splitting state ownership across the hook and a sub-component creates two-way data flow that React's unidirectional model is designed to prevent.
**Rule:** State lives at the lowest common ancestor. `searchQuery` affects both `DashboardSearch` and the results list. Both are children of `DashboardPage`. Therefore `searchQuery` belongs in `useDashboard`, passed down as props.

### Anti-Pattern 3: Lazy-loading LoginPage
**What:** Adding `const LoginPage = lazy(() => import('./pages/LoginPage'))` for consistency.
**Why bad:** LoginPage is the cold-start entry point. Lazy-loading it means the first render requires a dynamic import resolution — adding latency at the moment when users are most impatient. It also breaks PWA first-load painting since the app shell would render an empty Suspense fallback before showing the login form.

### Anti-Pattern 4: Per-route Suspense wrappers
**What:** Wrapping each `<Route element>` in its own `<Suspense>`.
**Why bad:** Creates 4 redundant Suspense boundaries. For a PWA that precaches all chunks, the loading state is shown for <100ms on first load and never again. The added complexity is not worth it.

### Anti-Pattern 5: Aggressive manualChunks fragmentation
**What:** Creating a separate chunk for every library (tailwindcss runtime, vite-plugin-pwa, etc.)
**Why bad:** HTTP/2 multiplexing reduces the cost of multiple small requests, but the service worker precache overhead increases with more chunk entries. For a 5-page SPA, 3-4 chunks (`vendor-react`, `vendor-router`, `vendor`, `index`) plus route chunks is the sweet spot.

---

## Scalability Considerations

This SPA serves 7 teachers and 1 CEO — scale is not a concern. Architecture decisions here are driven by **maintainability** and **constraint compliance** (250-line rule), not performance headroom.

| Concern | Current (271KB monolith) | After refactor |
|---|---|---|
| First load JS for teacher | 271KB parsed + executed | ~195KB (vendor cached) + ~25KB index + route chunk on demand |
| Dashboard load for CEO | Same as above | Deferred until `/dashboard` route — ~25KB extra chunk |
| Adding a new page | Opens DashboardPage.jsx to understand | Reads useDashboard.js (logic) OR features/ (UI) independently |
| Writing unit tests | Must render DashboardPage to test calculations | `useDashboard` testable with `renderHook` — no DOM needed |

---

## Sources

- React documentation — Custom Hooks: https://react.dev/learn/reusing-logic-with-custom-hooks (HIGH confidence)
- Robin Wieruch — React Router v7 Lazy Loading: https://www.robinwieruch.de/react-router-lazy-loading/ (HIGH confidence, current)
- Mykola Aleksandrov — React.lazy + Suspense + Vite manualChunks (2025): http://www.mykolaaleksandrov.dev/posts/2025/10/react-lazy-suspense-vite-manualchunks/ (MEDIUM confidence, unverified author but current year, consistent with official Vite docs)
- Soledad Penades — manualChunks for dependency caching (2025): https://soledadpenades.com/posts/2025/use-manual-chunks-with-vite-to-facilitate-dependency-caching/ (MEDIUM confidence, current year)
- vite-plugin-pwa official docs — Service Worker Precache: https://vite-pwa-org.netlify.app/guide/service-worker-precache (HIGH confidence, official)
- patterns.dev — Container/Presentational Pattern: https://www.patterns.dev/react/presentational-container-pattern/ (HIGH confidence)
- Vite official docs — Building for Production: https://v3.vitejs.dev/guide/build (HIGH confidence)
