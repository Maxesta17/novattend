# Architecture Research

**Domain:** React 19 PWA hardening — A11Y, DOCS, SEC, TEST
**Researched:** 2026-03-31
**Confidence:** HIGH (verified against live codebase, WCAG 2.1 patterns, Apps Script docs)

---

## System Overview

The hardening milestone touches four orthogonal concerns that each map onto a specific layer of the existing architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│  PAGES (src/pages/)                                              │
│  LoginPage  AttendancePage  DashboardPage  Saved  Convocatoria  │
│  [SEC affects LoginPage auth flow]                               │
│  [TEST: LoginPage.test, ConvocatoriaPage.test, SavedPage.test]  │
├─────────────────────────────────────────────────────────────────┤
│  FEATURE COMPONENTS (src/components/features/)                  │
│  TeacherCard  GroupTabs  StudentRow  StudentDetailPopup          │
│  AlertList  PageHeader  ConvocatoriaSelector                    │
│  [A11Y-01: TeacherCard + GroupSection keyboard + ARIA]          │
│  [A11Y-02: AlertList item role, StudentRow role]                │
│  [DOCS: all 7 features need JSDoc audit]                         │
├─────────────────────────────────────────────────────────────────┤
│  UI COMPONENTS (src/components/ui/)                              │
│  Button  StatCard  Avatar  Badge  Modal  ProgressBar             │
│  ToggleSwitch  SearchInput  ErrorBanner  UpdateBanner            │
│  [A11Y-02: StatCard onClick, ProgressBar aria-valuenow]         │
│  [DOCS: all 10 ui/ need JSDoc audit]                             │
│  [TEST: highest ROI — pure components, easy to test]            │
├─────────────────────────────────────────────────────────────────┤
│  HOOKS (src/hooks/)                                              │
│  useDashboard  useConvocatorias  useStudents                     │
│  useFocusTrap  useDebounce                                       │
│  [TEST: hook logic is isolated and high-value to cover]         │
├─────────────────────────────────────────────────────────────────┤
│  SERVICES + CONFIG (src/services/  src/config/)                  │
│  api.js  api-config.js  users.js  teachers.js                   │
│  [SEC: api.js needs token header injection after login]         │
├─────────────────────────────────────────────────────────────────┤
│  BACKEND (apps-script/Codigo.js)                                 │
│  doGet / doPost — no auth today, open to any caller             │
│  [SEC: add token validation in doGet + doPost entry points]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## A11Y-01: Keyboard Navigation in TeacherCard

### Current State

`TeacherCard` and its internal `GroupSection` sub-component use `<div onClick={...}>` for expand/collapse interactions. These are keyboard-inaccessible: no `tabIndex`, no `role`, no `onKeyDown`, no aria-expanded signal.

The `ChevronIcon` SVG has no accessible label. Student rows inside `GroupSection` are also plain `<div>` elements with click handlers.

`ToggleSwitch` (used in `StudentRow`) is already correctly implemented with `role="switch"`, `aria-checked`, and `focus-visible` styles. That is the reference pattern to follow.

### Integration Point: TeacherCard

**What needs to change:**
- The teacher header `<div onClick={onToggle}>` becomes a `<button>` (or keeps the div with `role="button"`, `tabIndex={0}`, `onKeyDown`)
- Add `aria-expanded={isExpanded}` on the trigger element
- Add `aria-controls` pointing to the expanded panel id
- `ChevronIcon` SVG: add `aria-hidden="true"` (decorative icon inside a labeled button)

**Pattern to use — button approach (preferred over div+role):**

```jsx
// TeacherCard teacher header trigger
<button
  type="button"
  onClick={onToggle}
  aria-expanded={isExpanded}
  aria-controls={`teacher-panel-${teacher.id}`}
  className="... focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
>
  ...
  <ChevronIcon rotated={isExpanded} aria-hidden />
</button>

// Expanded panel
<div id={`teacher-panel-${teacher.id}`} role="region" aria-label={teacher.name}>
  ...
</div>
```

**Same pattern for `GroupSection` expand trigger.**

**Student rows in GroupSection:** Change `<div onClick={...}>` to `<button type="button">` or add `role="button"` + `tabIndex={0}` + `onKeyDown` for Enter/Space.

**Line count impact:** TeacherCard is 143 lines. After adding ARIA + keyboard, likely 155-165 lines. Under the 250-line limit — no split needed.

**Files to modify:**
- `src/components/features/TeacherCard.jsx` — modify TeacherCard, GroupSection, student div rows

---

## A11Y-02: ARIA Attributes on Key Components

### Audit Results

| Component | Missing ARIA | Priority |
|-----------|-------------|----------|
| `TeacherCard` (header div) | `role`, `aria-expanded`, `aria-controls` | HIGH — no keyboard access |
| `GroupSection` (header div) | `role`, `aria-expanded`, `aria-controls` | HIGH — same |
| Student row divs (in GroupSection) | `role="button"` or native button | HIGH |
| `AlertList` student items (divs) | `role="button"` or native button | HIGH |
| `StatCard` (when onClick present) | `role="button"`, `tabIndex`, keyboard | MEDIUM |
| `ProgressBar` | `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` | MEDIUM |
| `SearchInput` wrapper | `role="search"` on container | LOW |
| `AttendancePage` "Marcar todo" button | `aria-label` with context | LOW |
| `GroupTabs` tab buttons | `role="tablist"` + `role="tab"` + `aria-selected` | MEDIUM |

### Already Correct

- `Modal`: `role="dialog"`, `aria-modal="true"`, `aria-label` — done in Phase 03
- `ToggleSwitch`: `role="switch"`, `aria-checked` — already correct
- `Button`: native `<button>`, `disabled` — already correct
- `PageHeader` logout button: `aria-label="Cerrar sesion"` — already correct
- `SearchInput` clear button: `aria-label="Limpiar busqueda"` — already correct

### Integration Point: AlertList Student Items

`AlertList` renders student items as `<div onClick>`. Each item needs to be a `<button type="button">` or at minimum `role="button"` + `tabIndex={0}` + `onKeyDown`. The component is 43 lines — a direct change, no split needed.

**Files to modify:**
- `src/components/features/AlertList.jsx` — student item divs
- `src/components/ui/ProgressBar.jsx` — add progressbar ARIA
- `src/components/ui/StatCard.jsx` — conditional role/tabIndex when onClick is provided
- `src/components/features/GroupTabs.jsx` — add tablist/tab roles and aria-selected

---

## DOCS-01: JSDoc in 11 Missing Components

### Current JSDoc Coverage

Components already documented (JSDoc header present):

| Component | Status |
|-----------|--------|
| `TeacherCard` | DONE |
| `StudentDetailPopup` | DONE |
| `AlertList` | DONE |
| `PageHeader` | DONE |
| `ConvocatoriaSelector` | DONE |
| `StudentRow` | DONE |
| `GroupTabs` | DONE |
| `Modal` | DONE |
| `Button` | DONE |
| `StatCard` | DONE |
| `Avatar` | DONE |
| `ToggleSwitch` | DONE |
| `SearchInput` | DONE |
| `ProgressBar` | DONE |
| `Badge` | NOT VERIFIED — check |
| `ProtectedRoute` | DONE |
| `ErrorBoundary` | NOT VERIFIED — check |
| `MobileContainer` | NOT VERIFIED — check |
| `ErrorBanner` | NOT VERIFIED — check |
| `UpdateBanner` | NOT VERIFIED — check |
| `LoadingSpinner` | NOT VERIFIED — check |
| `DashboardSkeleton` | NOT VERIFIED — check |
| `useDashboard` | DONE |
| `useFocusTrap` | DONE |
| `useConvocatorias` | NOT VERIFIED — check |
| `useStudents` | NOT VERIFIED — check |
| `useDebounce` | NOT VERIFIED — check |
| `api.js` (service) | DONE — module JSDoc + function JSDoc |
| `buildTeachersHierarchy` | NOT VERIFIED — check |

**Components most likely lacking JSDoc (the 11 mentioned in PROJECT.md):** The unverified entries above — primarily the smaller ui/ components and newer hooks. Each needs a JSDoc header following the existing pattern:

```javascript
/**
 * [One-line description].
 * @param {object} props
 * @param {Type} props.propName - Description
 * @returns {JSX.Element}
 */
```

**Architecture rule:** JSDoc goes at the top of the file, immediately before the function definition. No separate docs/ files for component-level documentation. The JSDoc comment IS the documentation.

**Files where JSDoc is likely missing (verify before adding):**
- `src/components/ui/Badge.jsx`
- `src/components/ui/ProgressBar.jsx` (might have partial)
- `src/components/ui/ErrorBanner.jsx`
- `src/components/ui/UpdateBanner.jsx`
- `src/components/ui/LoadingSpinner.jsx`
- `src/components/features/DashboardSkeleton.jsx`
- `src/components/ErrorBoundary.jsx`
- `src/components/MobileContainer.jsx`
- `src/hooks/useConvocatorias.js`
- `src/hooks/useStudents.js`
- `src/hooks/useDebounce.js`
- `src/utils/buildTeachersHierarchy.js`

No new files required. All changes are in-place additions to existing files.

---

## SEC-01 to SEC-06: Server-side Auth in Apps Script

### Current Auth Architecture

```
LoginPage
    |
    ├─ Client-side credential check (USERS array in users.js)
    |   └─ Passwords stored in plaintext in src/config/users.js
    |
    ├─ sessionStorage.setItem('user', JSON.stringify(found))
    |
    └─ Navigate to /attendance or /dashboard

ProtectedRoute
    └─ sessionStorage.getItem('user') → role check only

api.js (apiGet / apiPost)
    └─ Fetches VITE_API_URL with no auth header
    └─ Apps Script Web App: access = "Anyone" — no auth check
```

**Security gap:** Any caller who discovers the Apps Script URL can read all data (getConvocatorias, getProfesores, getAlumnos, getResumen) and write attendance records (guardarAsistencia) without any credentials.

### Target Auth Architecture (SEC)

```
LoginPage
    |
    ├─ Client-side credential check (same USERS array)
    |
    ├─ On success: derive a shared-secret HMAC token
    |   └─ token = HMAC-SHA256(username + timestamp, SHARED_SECRET)
    |   └─ Or simpler: a static per-user token stored in users.js
    |
    ├─ sessionStorage.setItem('user', JSON.stringify({...user, token}))
    |
    └─ Navigate to route

api.js (apiGet / apiPost)
    └─ Read token from sessionStorage
    └─ Attach as query param: ?token=xxx (GET) or body field (POST)
    └─ Apps Script validates token before processing any action
```

### Apps Script Token Validation Pattern

The simplest safe approach for an internal 8-user app: static token whitelist in Script Properties (not in code):

```javascript
// In Codigo.js — doGet and doPost entry points

function validateToken(token) {
  const validTokens = PropertiesService.getScriptProperties()
    .getProperty('VALID_TOKENS');
  if (!validTokens) return false;
  const tokens = JSON.parse(validTokens);
  return tokens.includes(token);
}

function doGet(e) {
  if (!validateToken(e.parameter.token)) {
    return jsonError('No autorizado', 401);
  }
  // ... existing switch
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (!validateToken(body.token)) {
    return jsonError('No autorizado', 401);
  }
  // ... existing switch
}
```

**VALID_TOKENS** is a JSON array stored in Script Properties (not in code), set via Apps Script UI. Each user has a unique token. Adding/revoking access requires only updating the Script Property.

### Integration Points: api.js Changes

`apiGet` and `apiPost` need to inject the token transparently. The token comes from sessionStorage:

```javascript
function getAuthToken() {
  try {
    const raw = sessionStorage.getItem('user')
    if (!raw) return null
    return JSON.parse(raw).token || null
  } catch {
    return null
  }
}

async function apiGet(action, params = {}) {
  if (!isApiEnabled()) return null
  const token = getAuthToken()

  const url = new URL(API_URL)
  url.searchParams.set('action', action)
  if (token) url.searchParams.set('token', token)
  // ... rest unchanged
}

async function apiPost(action, body = {}) {
  if (!isApiEnabled()) return null
  const token = getAuthToken()

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token, ...body })
  })
  // ... rest unchanged
}
```

### LoginPage Changes

After successful credential check, `LoginPage` writes the user's token to sessionStorage:

```javascript
// users.js gains a token field per user
{ username: "samuel", password: "samuel2026", token: "tk-samuel-xxxx", name: "Samuel", role: "teacher" }

// LoginPage: no logic change needed — JSON.stringify(found) already
// captures the token field if present in the USERS array
sessionStorage.setItem('user', JSON.stringify(found))
```

**Alternatively** (higher security): derive the token from username + a client-side salt, and validate server-side against the same derivation. But for 8 internal users, static tokens in Script Properties is the right tradeoff.

### Data Flow After SEC Changes

```
Login success
    ↓
sessionStorage: { username, name, role, token: "tk-samuel-xxx" }
    ↓
Any API call via api.js
    ├─ apiGet: ?action=getAlumnos&token=tk-samuel-xxx&...
    └─ apiPost: body { action: "guardarAsistencia", token: "tk-samuel-xxx", ...data }
    ↓
Apps Script doGet/doPost
    ├─ validateToken(token) → check against Script Properties
    ├─ PASS: continue to action handler
    └─ FAIL: return jsonError('No autorizado', 401)
    ↓
api.js receives 200 with { status: 'error', code: 401 } or a proper 401
    └─ throws Error('No autorizado') → caught by hook/page error state
```

**ProtectedRoute** does not need changes — it guards routes by role, not by API auth.

**Files to modify:**
- `src/config/users.js` — add `token` field per user
- `src/services/api.js` — inject token in apiGet and apiPost
- `apps-script/Codigo.js` — add validateToken + call in doGet + doPost

**New files:** None. Token storage uses the existing Script Properties mechanism.

---

## TEST-01 to TEST-03: Expanding to 60% Coverage

### Current Test State

- **89 tests, 16 suites** across these files:
  - `Button.test.jsx`, `Badge.test.jsx`, `StatCard.test.jsx` — ui components
  - `ProtectedRoute.test.jsx`, `LoginPage.test.jsx` — auth layer
  - `StudentRow.test.jsx` — feature component
  - `api.test.jsx` — service layer
  - `ErrorBanner.test.jsx`, `UpdateBanner.test.jsx`, `LoadingSpinner.test.jsx` — ui feedback
  - `SavedPage.test.jsx`, `NotFoundPage.test.jsx` — pages
  - `ConvocatoriaPage.test.jsx` — page
  - `Modal.test.jsx`, `useDashboard.test.jsx`, `useFocusTrap.test.jsx` — critical components

### Gap Analysis: What Is Not Tested

| Component/Module | Est. Lines | Test Exists | Priority |
|-----------------|-----------|-------------|----------|
| `TeacherCard` | 143 | NO | HIGH — complex expand/collapse + A11Y changes |
| `GroupTabs` | 29 | NO | HIGH — will gain ARIA in A11Y-02 |
| `AlertList` | 43 | NO | HIGH — A11Y changes + Modal composition |
| `StudentDetailPopup` | 152 | NO | MEDIUM — API integration, Modal composition |
| `ConvocatoriaSelector` | 37 | NO | LOW — simple dropdown |
| `DashboardSkeleton` | ~40 | NO | LOW — pure render |
| `PageHeader` | 67 | NO | MEDIUM — logout handler, aria-label |
| `Avatar` | 43 | NO | LOW — pure render |
| `ProgressBar` | ~30 | NO | MEDIUM — will gain ARIA in A11Y-02 |
| `useStudents` | ~150 | NO | HIGH — core attendance logic |
| `useConvocatorias` | ~80 | NO | MEDIUM — fetch + state |
| `buildTeachersHierarchy` | ~60 | NO | HIGH — pure function, easy to test |
| `AttendancePage` | 182 | PARTIAL | MEDIUM — main teacher flow |
| `DashboardPage` | 127 | NO | LOW — thin orchestrator, hook tested |

### High-ROI Test Targets (to reach 60%)

**Tier 1 — New test files that add most coverage:**

1. `src/tests/TeacherCard.test.jsx`
   - Tests: render teacher name, toggle expand on click, toggle expand on Enter/Space (A11Y), aria-expanded state, group section expand, student click fires onStudentClick
   - Dependencies: mock `teacher` object with groups and students

2. `src/tests/buildTeachersHierarchy.test.js`
   - Tests: pure function with various flat API inputs, handles empty arrays, handles mismatched IDs
   - Dependencies: none (pure function)

3. `src/tests/GroupTabs.test.jsx`
   - Tests: renders all groups, selected group has aria-selected=true, onChange fires with correct group number
   - Dependencies: none

4. `src/tests/AlertList.test.jsx`
   - Tests: renders student names, click fires onStudentClick, keyboard triggers onStudentClick, onClose wired
   - Dependencies: mock students array

5. `src/tests/useStudents.test.jsx`
   - Tests: initial state, toggleStudent flips presence, toggleAll sets all present/absent, presentCount/absentCount computed correctly
   - Dependencies: mock convocatoria + useStudents exports (MOCK_GROUPS used when API disabled)

**Tier 2 — Additions to existing tests:**

6. `src/tests/api.test.jsx` — add tests for token injection once SEC is implemented
7. `src/tests/LoginPage.test.jsx` — add test that token field is written to sessionStorage
8. `src/tests/ProgressBar.test.jsx` — add ARIA attribute assertions

### Test Architecture Pattern

All existing tests follow this structure — new tests must match:

```javascript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ComponentName from '../components/[layer]/ComponentName'

describe('ComponentName', () => {
  const defaultProps = { /* ... */ }

  it('renderiza [algo visible]', () => {
    render(<ComponentName {...defaultProps} />)
    expect(screen.getByText('...')).toBeInTheDocument()
  })
})
```

For hooks, use `renderHook` from `@testing-library/react`. For pages needing Router context, wrap with `MemoryRouter`.

---

## Recommended Project Structure (After Hardening)

No new directories needed. All changes are modifications to or additions within existing folders:

```
src/
├── components/
│   ├── features/
│   │   ├── TeacherCard.jsx         [MODIFY — A11Y-01 keyboard + ARIA]
│   │   ├── GroupTabs.jsx           [MODIFY — A11Y-02 tablist/tab ARIA]
│   │   ├── AlertList.jsx           [MODIFY — A11Y-02 button role]
│   │   ├── StudentDetailPopup.jsx  [no A11Y changes needed]
│   │   ├── PageHeader.jsx          [no changes needed]
│   │   ├── ConvocatoriaSelector.jsx [DOCS only if JSDoc missing]
│   │   └── DashboardSkeleton.jsx   [DOCS if JSDoc missing]
│   ├── ui/
│   │   ├── ProgressBar.jsx         [MODIFY — A11Y-02 progressbar ARIA]
│   │   ├── StatCard.jsx            [MODIFY — A11Y-02 conditional role]
│   │   ├── Badge.jsx               [DOCS if JSDoc missing]
│   │   ├── ErrorBanner.jsx         [DOCS if JSDoc missing]
│   │   ├── UpdateBanner.jsx        [DOCS if JSDoc missing]
│   │   ├── LoadingSpinner.jsx      [DOCS if JSDoc missing]
│   │   └── Modal.jsx               [no changes — already A11Y compliant]
│   ├── ErrorBoundary.jsx           [DOCS if JSDoc missing]
│   └── MobileContainer.jsx         [DOCS if JSDoc missing]
├── hooks/
│   ├── useConvocatorias.js         [DOCS if JSDoc missing]
│   ├── useStudents.js              [DOCS if JSDoc missing]
│   └── useDebounce.js              [DOCS if JSDoc missing]
├── services/
│   └── api.js                      [MODIFY — SEC token injection]
├── config/
│   └── users.js                    [MODIFY — SEC add token fields]
├── utils/
│   └── buildTeachersHierarchy.js   [DOCS if JSDoc missing]
└── tests/
    ├── TeacherCard.test.jsx         [NEW — A11Y + logic coverage]
    ├── GroupTabs.test.jsx           [NEW — A11Y + tab behavior]
    ├── AlertList.test.jsx           [NEW — A11Y + student click]
    ├── buildTeachersHierarchy.test.js [NEW — pure function]
    └── useStudents.test.jsx         [NEW — hook logic]

apps-script/
└── Codigo.js                        [MODIFY — SEC validateToken]
```

---

## Build Order: Why This Sequence

The hardening work has a dependency constraint: SEC changes affect api.js, which affects the tests for api.js and LoginPage.

```
DOCS-01 (JSDoc additions)
    ↓  (independent — safe to do first, zero behavior change)

A11Y-01 (TeacherCard keyboard)
    ↓  (independent of SEC, but A11Y tests come after)

A11Y-02 (ARIA attributes)
    ↓  (independent of SEC, clears ARIA debt before tests verify it)

TEST: TeacherCard + GroupTabs + AlertList + buildTeachersHierarchy
    ↓  (tests written AFTER A11Y changes — verifies the new contracts)

SEC-01 to SEC-06 (Apps Script auth)
    ↓  (changes api.js + users.js + Codigo.js together)

TEST: api.test additions + LoginPage.test token assertions
    ↓  (tests for SEC written AFTER SEC is implemented — prevents red tests mid-sec)

TEST: useStudents + remaining coverage push to 60%
```

**Rationale:**
- DOCS first: zero risk, zero behavior change, unblocks everything
- A11Y before their tests: test contracts must reflect the final ARIA structure
- SEC last before its tests: api.js changes would break existing api.test.jsx if written before SEC validates cleanly
- useStudents tests last: most complex, depends on stable api.js

---

## Architectural Patterns

### Pattern 1: Accessible Interactive Div → Button Conversion

**What:** Replace `<div onClick>` with `<button type="button">` for any element that has a click handler and is the primary interaction point.
**When to use:** Every time. Native button elements get keyboard focus, Enter/Space handling, role, and cursor for free. Divs require manual `role`, `tabIndex`, `onKeyDown` to match — more code, more risk of missing something.
**Trade-offs:** Converting divs to buttons may affect layout if the parent expects a div. Use `className="w-full text-left bg-transparent border-0 p-0"` to reset button defaults while keeping existing visual structure.

### Pattern 2: aria-expanded + aria-controls for Disclosure Widgets

**What:** Any element that shows/hides content on click must signal its state to AT (screen readers, switch access).
**When to use:** TeacherCard teacher header, GroupSection group header — both are disclosure widgets per ARIA Authoring Practices Guide.
**Implementation:**
```jsx
// Trigger
<button
  aria-expanded={isExpanded}
  aria-controls="panel-id"
>

// Panel
<div id="panel-id">
```
The `aria-controls` id must be unique per instance. Use `teacher.id` or `group.id` as suffix.

### Pattern 3: Token Injection at the Service Boundary

**What:** Auth tokens are read from sessionStorage once per request inside api.js, not threaded through as function parameters.
**When to use:** When auth state lives in sessionStorage and all API calls go through a single service module.
**Trade-offs:** Couples api.js to sessionStorage. Acceptable here because this pattern is already used (ProtectedRoute reads sessionStorage directly). Alternative would be a React Context for auth state — overkill for 8 users.

### Pattern 4: Script Properties for Secrets in Apps Script

**What:** Sensitive values (token whitelist, config) go in `PropertiesService.getScriptProperties()`, never in script code.
**When to use:** Always for Apps Script secrets. Script code is visible to any editor of the script. Script Properties are editor-visible but not exposed in URL or response.
**Trade-offs:** Requires manual setup in the Apps Script UI after each clean deploy. Document the setup step explicitly.

---

## Anti-Patterns

### Anti-Pattern 1: Adding aria-* to a div When a button Would Work

**What people do:** `<div role="button" tabIndex={0} onKeyDown={...} onClick={...}>` — four attributes to simulate what a native button provides for free.
**Why it's wrong:** Misses edge cases (Enter vs Space behavior differs between role=button and native button in some AT), adds maintenance burden, violates progressive enhancement.
**Do this instead:** `<button type="button" className="...reset styles...">` — single element, full keyboard behavior, correct semantics.

### Anti-Pattern 2: Putting Auth Tokens in URL Parameters Long-term

**What people do:** `?token=xyz` in GET requests — simple to implement.
**Why it's wrong:** Tokens appear in server logs, browser history, Referer headers, and can be shoulder-surfed. For a production-grade app this would be unacceptable.
**Context for NovAttend:** For an internal 8-user PWA with no sensitive personal data beyond attendance percentages, this is an acceptable short-term tradeoff. The Apps Script Web App URL is already a shared secret. Flag this as MEDIUM risk, not critical.
**Do this instead (future):** Move token to a POST body or custom header. Apps Script does support reading request headers in newer runtimes.

### Anti-Pattern 3: Testing A11Y Changes Before They Are Implemented

**What people do:** Write `expect(button).toHaveAttribute('aria-expanded', 'false')` tests before adding aria-expanded to the component, then add the ARIA alongside the test.
**Why it's problematic:** With TDD this is intentional (RED-GREEN). But in this codebase, the A11Y changes are architectural modifications, not TDD additions. Writing tests first creates red tests in the suite that block `npm test` and cause confusion.
**Do this instead:** Complete A11Y modifications first (GREEN), then write tests that verify the new contracts. This matches how the existing test suite was built.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google Apps Script Web App | REST over HTTPS, JSON response | After SEC: add token param. CORS is handled by Apps Script (`Access-Control-Allow-Origin: *`). |
| Google Fonts | PWA CacheFirst (Workbox) | No changes needed. |
| Vercel | Static hosting, no SSR | No changes needed. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `LoginPage` → `sessionStorage` | Direct write via `sessionStorage.setItem` | After SEC: token field added to stored user object |
| `ProtectedRoute` → `sessionStorage` | Direct read for role check | No changes — role check is separate from API auth |
| `api.js` → `sessionStorage` | NEW after SEC: read token per request | Coupling is acceptable for this scale |
| `TeacherCard` → `DashboardPage` | Props: teacher object, isExpanded, onToggle, onStudentClick | After A11Y: no prop interface change, only internal DOM structure |
| `Modal` → `useFocusTrap` | Hook returns containerRef, attaches keydown listener | Already complete. AlertList and StudentDetailPopup consume Modal without changes |
| `useDashboard` → `useDashboard.test.jsx` | renderHook contract test (23 keys) | After any useDashboard changes, contract test will catch interface drift |

---

## Sources

- WCAG 2.1 — Keyboard Accessible (2.1.1): https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html
- ARIA Authoring Practices Guide — Disclosure pattern: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
- ARIA Authoring Practices Guide — Tabs pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- Google Apps Script — PropertiesService: https://developers.google.com/apps-script/reference/properties
- Live codebase audit (2026-03-31) — HIGH confidence, verified against actual file contents

---
*Architecture research for: NovAttend v1.1 Hardening (A11Y, DOCS, SEC, TEST)*
*Researched: 2026-03-31*
