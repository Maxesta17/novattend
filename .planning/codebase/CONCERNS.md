# Codebase Concerns

**Analysis Date:** 2026-03-30

## Tech Debt

**Hardcoded Credentials in Source Code:**
- Issue: All user credentials (usernames, passwords) are hardcoded in a committed JS file. Passwords follow a predictable pattern (`{username}2026`).
- Files: `src/config/users.js`
- Impact: Anyone with access to the repo or the built JS bundle can extract all credentials. No password hashing, no server-side auth validation. Authentication is entirely client-side.
- Fix approach: Move authentication to the Google Apps Script backend. Add a `login` endpoint that validates credentials server-side. Store credentials in a protected sheet or use Google Identity Services. Remove `src/config/users.js` from the repo.

**Large Mock Data File Committed:**
- Issue: `src/config/teachers.js` (144 lines) contains hardcoded mock data for the Dashboard. This data is bundled into production even when the API is enabled, inflating bundle size.
- Files: `src/config/teachers.js`
- Impact: Unnecessary code in production build. Mock data may drift from real API shape.
- Fix approach: Gate mock imports behind `isApiEnabled()` using dynamic imports, or move mock data to test fixtures only.

**Silent Error Swallowing:**
- Issue: Multiple `catch {}` blocks with no error handling — no logging, no user feedback, no retry mechanism. Errors are silently discarded.
- Files: `src/hooks/useStudents.js` (lines 69, 97, 110), `src/pages/LoginPage.jsx` (line 27), `src/pages/AttendancePage.jsx` (lines 23, 60), `src/components/features/StudentDetailPopup.jsx` (line 59)
- Impact: When API calls fail, users see empty states with no indication of what went wrong. In `AttendancePage.jsx` line 60, a failed save silently aborts — the teacher has no feedback that attendance was not saved.
- Fix approach: Add toast/notification system for user-facing errors. Log errors to console in development. At minimum, show an error message when save fails in `AttendancePage`.

**`max-w-[430px]` Repeated Across Pages:**
- Issue: The magic number `430px` is duplicated in every page component and `MobileContainer.jsx`, instead of being a single source of truth.
- Files: `src/pages/LoginPage.jsx`, `src/pages/AttendancePage.jsx`, `src/pages/DashboardPage.jsx`, `src/pages/ConvocatoriaPage.jsx`, `src/pages/SavedPage.jsx`, `src/components/ErrorBoundary.jsx`, `src/components/MobileContainer.jsx`
- Impact: Changing the mobile viewport width requires editing 7+ files. Risk of inconsistency.
- Fix approach: Define a Tailwind utility class (e.g., `max-w-mobile`) in `tailwind.config.js` under `extend.maxWidth` and use it everywhere.

**Inline CSS in MobileContainer:**
- Issue: `MobileContainer.jsx` uses a `<style>` tag with raw CSS for the desktop frame. This bypasses Tailwind and the "zero inline styles" rule.
- Files: `src/components/MobileContainer.jsx` (lines 12-30)
- Impact: Documented exception (media query on `#root` not possible in Tailwind), but the hardcoded hex `#111111` violates the design token rule.
- Fix approach: Move the hex to a Tailwind token (e.g., `desktop-bg`) and reference it in the style block, or extract to `src/styles/` as a separate CSS file.

**ESLint Dependency Array Suppressions:**
- Issue: Two `eslint-disable-line react-hooks/exhaustive-deps` comments suppress missing dependency warnings.
- Files: `src/hooks/useStudents.js` (line 116), `src/pages/DashboardPage.jsx` (line 79)
- Impact: Potential stale closure bugs if dependencies change. The `useStudents` hook runs its init effect only once, which is intentional but fragile if `convocatoria` or `profesorId` ever change during the component lifecycle.
- Fix approach: Refactor to include dependencies properly or extract the init logic into a stable callback.

## Security Considerations

**Client-Side Only Authentication:**
- Risk: Authentication is performed entirely in the browser by comparing input against `src/config/users.js`. There is no server-side session or token. Any user can bypass auth by manually setting `sessionStorage.setItem('user', JSON.stringify({role:'ceo'}))`.
- Files: `src/config/users.js`, `src/pages/LoginPage.jsx`, `src/components/ProtectedRoute.jsx`
- Current mitigation: The Google Apps Script API has no auth — it serves data to anyone who knows the URL. The sessionStorage guard only controls UI routing.
- Recommendations: Add API-level authentication (API key per user, or Google OAuth). At minimum, add a shared secret header to API requests.

**Credentials Exposed in Bundle:**
- Risk: Passwords in `src/config/users.js` are included in the production JS bundle. Anyone can extract them from browser DevTools or the network response.
- Files: `src/config/users.js`
- Current mitigation: None.
- Recommendations: Remove hardcoded passwords. Implement server-side authentication.

**No CSRF or Request Signing:**
- Risk: The API endpoints on Google Apps Script accept any POST request without authentication tokens. An attacker who discovers the API URL can submit fake attendance data.
- Files: `src/services/api.js`
- Current mitigation: The API URL is in a `.env` file (not committed), providing obscurity but not security.
- Recommendations: Add a shared secret or API key to requests. Validate teacher identity on the server side.

**No Input Sanitization:**
- Risk: User input (search queries, student names) is rendered directly in React JSX, which is safe from XSS by default. However, data from the API is also rendered without validation.
- Files: `src/pages/DashboardPage.jsx` (search results), `src/components/features/StudentDetailPopup.jsx`
- Current mitigation: React's JSX escaping prevents XSS. No `dangerouslySetInnerHTML` usage detected.
- Recommendations: Low priority — React's default behavior provides adequate protection.

**`.env` File Present but Gitignored:**
- Risk: The `.env` file exists and is properly gitignored (lines 30-31 of `.gitignore`). No risk of accidental commit.
- Files: `.env`, `.gitignore`
- Current mitigation: Adequate.
- Recommendations: None needed.

## Performance Bottlenecks

**No Route-Level Code Splitting:**
- Problem: All pages (Login, Attendance, Dashboard, Convocatoria, Saved) are eagerly imported in `App.jsx`. The Dashboard with its complex data processing loads even for teacher users who never see it.
- Files: `src/App.jsx`
- Cause: Static imports for all page components.
- Improvement path: Use `React.lazy()` + `Suspense` for route-level code splitting. Prioritize `DashboardPage` (largest component at 273 lines) and `AttendancePage`.

**Dashboard Recalculates on Every Render:**
- Problem: `globalAttendance` computation in `DashboardPage` iterates all teachers, groups, and students with nested reduces. This runs on every render.
- Files: `src/pages/DashboardPage.jsx` (lines 102-112)
- Cause: `useMemo` depends on `[teachers]` which is adequate, but the calculation itself is O(teachers * groups * students).
- Improvement path: Acceptable for current scale (~7 teachers, 4 groups each). Monitor if data grows.

**Prefetch of All Groups on Mount:**
- Problem: `useStudents` prefetches G2, G3, G4 data immediately after loading G1, making 4 API calls on every attendance page load.
- Files: `src/hooks/useStudents.js` (lines 104-111)
- Cause: Intentional optimization for instant tab switching.
- Improvement path: Acceptable trade-off. Consider aborting prefetch on unmount (currently errors are caught but requests continue).

## Fragile Areas

**Navigation State Dependency:**
- Files: `src/pages/AttendancePage.jsx` (line 17), `src/pages/ConvocatoriaPage.jsx` (line 13), `src/pages/SavedPage.jsx` (line 9)
- Why fragile: These pages rely on `location.state` passed via `navigate()`. If a user bookmarks or refreshes the page, `location.state` is `null`, and the page either shows no data or redirects.
- Safe modification: Always check for `null` state and redirect to login or re-fetch data.
- Test coverage: `ConvocatoriaPage.test.jsx` exists but does not test the null-state scenario.

**SessionStorage JSON Parsing:**
- Files: `src/components/ProtectedRoute.jsx` (line 13), `src/pages/AttendancePage.jsx` (lines 21-24)
- Why fragile: `JSON.parse(raw)` can throw if sessionStorage contains malformed data. `ProtectedRoute` does not wrap in try/catch (only `AttendancePage` does).
- Safe modification: Always wrap `JSON.parse` in try/catch in `ProtectedRoute.jsx`.
- Test coverage: `ProtectedRoute.test.jsx` exists but may not test malformed JSON.

**DashboardPage Size:**
- Files: `src/pages/DashboardPage.jsx` (273 lines)
- Why fragile: Exceeds the 250-line rule from CLAUDE.md. Contains data loading, state management, computed values, search logic, and rendering all in one file.
- Safe modification: Extract data loading into a `useDashboardData` hook. Extract the search results section into a component.
- Test coverage: No test file exists for `DashboardPage`.

## Accessibility Gaps

**Missing ARIA Attributes:**
- Problem: Most interactive elements lack proper accessibility attributes.
- Files:
  - `src/components/ui/Button.jsx`: No `aria-disabled` when variant is `disabled` (only native `disabled` is set).
  - `src/components/ui/Modal.jsx`: No `role="dialog"`, no `aria-modal="true"`, no focus trap. Clicking overlay closes it but there is no Escape key handler.
  - `src/components/features/GroupTabs.jsx`: No `role="tablist"` / `role="tab"` / `aria-selected`.
  - `src/pages/LoginPage.jsx`: No `<form>` element wrapping inputs — Enter key does not submit.
  - `src/components/features/StudentRow.jsx`: No `aria-label` describing the toggle action.
- Impact: Screen readers cannot navigate the app effectively. Keyboard-only users cannot use the modal or submit login.
- Fix approach: Add ARIA roles and keyboard handlers to Modal (focus trap + Escape), wrap login in `<form>`, add tab roles to GroupTabs.

**No Skip Navigation or Landmarks:**
- Problem: No `<main>`, `<nav>`, `<header>` semantic HTML elements used anywhere. All layouts use `<div>`.
- Files: All page components in `src/pages/`.
- Impact: Screen readers cannot identify page regions.
- Fix approach: Add semantic HTML landmarks to page layouts.

**Color Contrast for Status Text:**
- Problem: Text colors for attendance status use `text-white/55`, `text-white/20`, `text-white/30` which may not meet WCAG AA contrast ratios against the burgundy background.
- Files: `src/pages/LoginPage.jsx` (lines 80, 87, 121)
- Impact: Low-vision users may not be able to read secondary text.
- Fix approach: Verify contrast ratios and adjust opacity values or use higher-contrast alternatives.

## Test Coverage Gaps

**Pages Without Tests:**
- What's not tested: `DashboardPage`, `AttendancePage`, `SavedPage` have no dedicated test files.
- Files: `src/pages/DashboardPage.jsx`, `src/pages/AttendancePage.jsx`, `src/pages/SavedPage.jsx`
- Risk: The most complex pages (Dashboard: data aggregation; Attendance: save flow) have zero test coverage.
- Priority: High — `AttendancePage` handles the core business flow (saving attendance).

**Hooks Without Tests:**
- What's not tested: `useStudents` and `useConvocatorias` hooks contain critical data-fetching and caching logic with no tests.
- Files: `src/hooks/useStudents.js`, `src/hooks/useConvocatorias.js`
- Risk: Cache invalidation bugs, stale data, and error handling regressions would go unnoticed.
- Priority: High — these hooks are the data layer for the two main user flows.

**Feature Components Without Tests:**
- What's not tested: `TeacherCard`, `PageHeader`, `AlertList`, `StudentDetailPopup`, `GroupTabs`, `ConvocatoriaSelector` have no tests.
- Files: All files in `src/components/features/`
- Risk: UI regressions in data display components. `StudentDetailPopup` has conditional API fetching logic that is untested.
- Priority: Medium.

**Current Coverage:** 8 test files covering 4 UI components (`Button`, `Badge`, `StatCard`, `StudentRow`), 2 pages (`LoginPage`, `ConvocatoriaPage`), 1 route guard (`ProtectedRoute`), and 1 service (`api`). Total: 19 tests across 8 suites. No integration or E2E tests.

## Missing Critical Features

**No Offline Data Persistence:**
- Problem: The PWA has an `offline.html` fallback and Workbox caching for static assets and API responses (NetworkFirst), but there is no mechanism to queue attendance submissions when offline. If a teacher submits attendance without connectivity, the save fails silently.
- Files: `vite.config.js` (workbox config), `src/pages/AttendancePage.jsx` (handleSave)
- Blocks: Reliable offline usage in areas with spotty connectivity.

**No Duplicate Submission Prevention:**
- Problem: There is no check for whether attendance has already been recorded for a given group/date/convocatoria. A teacher can submit the same group's attendance multiple times.
- Files: `src/pages/AttendancePage.jsx`, `src/services/api.js` (guardarAsistencia)
- Blocks: Data integrity — duplicate records may accumulate in the spreadsheet.

**No Session Expiry:**
- Problem: The sessionStorage-based auth has no expiration. A session persists until the tab/browser is closed. There is no timeout or token refresh mechanism.
- Files: `src/components/ProtectedRoute.jsx`, `src/pages/LoginPage.jsx`
- Blocks: Security best practice. Low impact given the app's scope.

## Dependencies at Risk

**Google Apps Script as Backend:**
- Risk: Google Apps Script has execution time limits (6 minutes), concurrent user limits, and quotas. The spreadsheet-based data model does not scale beyond ~50 concurrent users.
- Impact: Performance degrades as data grows. No database indexes, no connection pooling.
- Migration plan: For scale, migrate to a proper backend (Supabase, Firebase, or a Node.js API) with a relational database.

**No Lock File Committed:**
- Risk: `package-lock.json` may or may not be committed (not visible in git status untracked). Without a lockfile, `npm install` on different machines can produce different dependency trees.
- Impact: "Works on my machine" issues, potential breaking changes from minor version bumps.
- Migration plan: Ensure `package-lock.json` is committed.

---

*Concerns audit: 2026-03-30*
