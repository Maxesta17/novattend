# Domain Pitfalls — NovAttend PWA Improvement Milestone

**Domain:** React 19 PWA — audit-driven bug fixes, performance optimization, architecture refactoring
**Researched:** 2026-03-30
**Overall confidence:** HIGH (pitfalls grounded in actual codebase state + official sources)

---

## Critical Pitfalls

Mistakes that cause regressions, broken offline behavior, or data loss.

---

### Pitfall 1: navigateFallback Pointing to a Non-Precached File

**What goes wrong:** `vite.config.js` currently sets `navigateFallback: '/offline.html'`, but `/offline.html` is not listed in `globPatterns` (`**/*.{js,css,html,png,svg,ico,woff2}`). Workbox only includes `index.html` in the precache manifest. The service worker intercepts all navigation requests and tries to serve `/offline.html` from cache — but it is not there. Result: all SPA navigation returns a service worker error instead of the app shell.

**Why it happens:** The Workbox `navigateFallback` option does not auto-add the target to the precache manifest. It assumes the file is already precached. If the path does not exist in the build output, the cache lookup silently fails or throws.

**Consequences:** PWA offline mode is completely broken. Every route after initial load may show the offline fallback or a browser error instead of the React app.

**Prevention:**
- Change `navigateFallback` to `'/index.html'` (the actual SPA entry point that Workbox does precache).
- Alternatively, create a real `public/offline.html` file so it lands in the build output and matches `globPatterns`.
- After the fix, verify with DevTools > Application > Cache Storage that `index.html` is listed in the precache manifest.

**Warning signs:**
- DevTools > Application > Service Workers shows "fetch failed" on navigation.
- Hard reload works; navigation between routes offline does not.
- Workbox log shows "no precache entry found for /offline.html".

**Phase:** Ola 1 (critical fix).

---

### Pitfall 2: API Runtime Cache Regex Missing Redirect Domain

**What goes wrong:** The current regex `/^https:\/\/script\.google\.com\/.*/i` does not match the actual URL that Google Apps Script redirects to: `script.googleusercontent.com`. Google Apps Script `doGet`/`doPost` responses come from `googleusercontent.com`, not `script.google.com`. The service worker's `NetworkFirst` handler for `api-cache` never matches, so API responses are never cached. Offline attendance loading fails silently.

**Why it happens:** The Google Apps Script Web App deployment returns a `302` redirect to `script.googleusercontent.com`. The browser follows the redirect transparently, but the service worker cache matching runs against the original request URL, not the final redirect URL.

**Consequences:** Offline mode for API data is non-functional. Teachers loading attendance data offline get nothing despite the app claiming PWA offline support.

**Prevention:**
- Add a second `urlPattern` entry for `script.googleusercontent.com`:
  ```js
  urlPattern: /^https:\/\/script\.googleusercontent\.com\/.*/i
  ```
- Or use a combined regex: `/^https:\/\/script\.(google|googleusercontent)\.com\/.*/i`
- Test with DevTools > Network > offline mode after visiting the page once online.

**Warning signs:**
- Cache Storage in DevTools shows `api-cache` bucket is always empty.
- Network tab shows requests to `googleusercontent.com` but no SW cache hits.

**Phase:** Ola 1 (critical fix).

---

### Pitfall 3: api.js Does Not Check res.ok Before Parsing JSON

**What goes wrong:** `apiGet` and `apiPost` in `src/services/api.js` call `res.json()` immediately without checking `res.ok`. If the network returns a 4xx or 5xx HTTP error (e.g., Apps Script quota exceeded, Vercel proxy timeout), `res.json()` may throw a SyntaxError (non-JSON error body) or silently parse an error HTML page as JSON. The thrown error message becomes `"Unexpected token < in JSON"` — meaningless to the user.

**Why it happens:** Google Apps Script occasionally returns HTML error pages (quota, deployment issues). Without `res.ok` guard, the fetch appears to succeed from the service worker's perspective, but the consumer crashes on JSON parse.

**Consequences:** Silent failures. Attendance data silently does not load. Error UI shows a cryptic message.

**Prevention:**
```js
const res = await fetch(url.toString())
if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
const json = await res.json()
```
Add this guard in both `apiGet` and `apiPost`.

**Warning signs:**
- Error messages containing "Unexpected token" or "JSON.parse" in the error boundary.
- Apps Script logs show 429 or 503 responses.

**Phase:** Ola 1 (critical fix).

---

### Pitfall 4: autoUpdate registerType Silently Swaps Code Under Active Users

**What goes wrong:** `registerType: 'autoUpdate'` tells the service worker to call `skipWaiting()` immediately when a new version is found, without any user prompt. If a teacher is mid-attendance (students listed, toggles in progress), the service worker activates the new version, the page may reload or get a `ChunkLoadError` on dynamic import, and the attendance state (held in React state only) is lost.

**Why it happens:** `autoUpdate` prioritizes freshness over stability. When new chunks are deployed, old chunk URLs become invalid. A running app that lazily loads a route chunk after a SW update will get a network error because the old hashed chunk URL no longer exists on Vercel.

**Consequences:** Data loss on mid-session teacher workflow. Invisible to developers during testing (easy to miss in local dev).

**Prevention:**
- For Ola 2 (when code-splitting is added), switch to `registerType: 'prompt'` and implement a visible "Nueva version disponible — recargar" toast using `useRegisterSW`.
- If keeping `autoUpdate`, guard against `ChunkLoadError` in the error boundary and handle it with a page reload prompt.
- Attendance state should persist to `sessionStorage` on every toggle so it survives an unexpected reload.

**Warning signs:**
- After deploying with code-splitting, teachers report blank screens mid-session.
- Sentry/console shows `ChunkLoadError: Loading chunk X failed`.

**Phase:** Ola 2 (must address before shipping code-splitting).

---

## Moderate Pitfalls

Mistakes that degrade performance or create subtle bugs without causing immediate failures.

---

### Pitfall 5: React.memo on Components With Inline Object/Function Props

**What goes wrong:** Adding `React.memo` to `StudentRow`, `TeacherCard`, or `StatCard` will have zero effect if the parent passes inline objects or arrow functions as props. In `AttendancePage`, each `StudentRow` receives `onToggle={() => toggleStudent(idx)}` — a new function reference on every render. In `DashboardPage`, `TeacherCard` receives `onToggle={() => setExpandedTeacher(...)}` and `onStudentClick={setSelectedStudent}`. `React.memo` does a shallow comparison; a new arrow function always fails the equality check, so the component re-renders anyway.

**Why it happens:** `React.memo` uses `Object.is` comparison. Arrow functions are not stable references unless wrapped in `useCallback`. Arrays and plain objects passed as props (e.g., `teacher={teacher}` where `teacher` is rebuilt each render) also fail.

**Consequences:** `React.memo` adds comparison overhead with zero savings. Worse, if memoization is incorrectly assumed to work, it can mask debugging effort around performance issues.

**Prevention:**
- Wrap handler props in `useCallback` before memoizing the child:
  ```js
  const handleToggle = useCallback((idx) => toggleStudent(idx), [toggleStudent])
  ```
- Only apply `React.memo` to components where the parent re-renders frequently AND props are demonstrably stable.
- `StatCard` (pure display, primitive value props) is the best candidate — no callback, no object shape.
- `StudentRow` needs `useCallback` for `onToggle` first, otherwise memo is wasted.
- `TeacherCard` receives `teacher` object from the `teachers` array; if `teachers` is rebuilt by `buildTeachersHierarchy` on every convocatoria load, memo will not help until the array reference stabilizes.

**Warning signs:**
- React DevTools Profiler shows `StudentRow` and `TeacherCard` re-rendering on every keystroke in the search input, even with `React.memo` applied.

**Phase:** Ola 2.

---

### Pitfall 6: Code-Splitting Breaks the Workbox Precache Manifest

**What goes wrong:** When `React.lazy()` is added for routes (Ola 2), Vite generates new hashed chunk filenames (e.g., `DashboardPage-BX3k9.js`). These chunks must be added to the Workbox precache manifest or they will not be available offline. If the `globPatterns` configuration does not capture them (currently `**/*.{js,css,...}`), offline navigation to `/dashboard` after a fresh install will fail with a network error when the chunk cannot be fetched.

**Why it happens:** Workbox's `globPatterns` does pick up JS files by default, so this is usually fine — but `manualChunks` splitting can produce chunk files that land in unexpected output paths or have names that do not match if the pattern is too restrictive.

**Prevention:**
- After adding code-splitting, verify the generated `sw.js` precache manifest includes all route chunk filenames.
- Check `dist/` after build: every `.js` file there should appear in the SW precache list.
- Do not restrict `globPatterns` to specific directories; keep `**/*.{js,css,html}`.

**Warning signs:**
- After adding lazy routes and deploying, DevTools offline mode shows `TypeError: Failed to fetch` on navigation.
- Workbox debug log: "no precache entry found for /assets/DashboardPage-*.js".

**Phase:** Ola 2.

---

### Pitfall 7: Vite manualChunks Circular Dependency Runtime Error

**What goes wrong:** When splitting vendor code with `build.rollupOptions.output.manualChunks`, moving shared utilities (e.g., the `buildTeachersHierarchy` util, `config/teachers.js`) into a separate chunk can create circular imports at the chunk level even when there are no circular imports in the source. Rollup resolves module boundaries differently from the source graph, so a `vendor` chunk may end up depending on an `app` chunk, causing the `vendor` chunk to fail to execute if the `app` chunk loads first.

**Why it happens:** The `manualChunks` function assigns modules to chunks by name, but Rollup still needs to resolve cross-chunk dependencies. If a utility is shared between two chunks and assigned to only one, the other chunk gets an implicit dependency on a chunk that may not yet be loaded.

**Consequences:** Runtime `ReferenceError` or blank screen on first load. Intermittent depending on module execution order.

**Prevention:**
- Keep `manualChunks` strictly to true third-party vendor code (`node_modules` only):
  ```js
  manualChunks(id) {
    if (id.includes('node_modules')) return 'vendor'
  }
  ```
- Do NOT manually chunk internal app modules (`src/utils`, `src/config`, `src/hooks`). Let Rollup manage internal splitting automatically via `React.lazy`.
- After adding `manualChunks`, run `npm run build` and check the build output for circular dependency warnings.

**Warning signs:**
- Vite build emits `"circular dependency"` warnings in the console.
- Blank screen in production but not in `npm run dev`.
- Browser console shows `ReferenceError: [module] is not defined` on first paint.

**Phase:** Ola 2.

---

### Pitfall 8: DashboardPage Refactor Breaks the useEffect Dependency Array

**What goes wrong:** `DashboardPage.jsx` has a commented `// eslint-disable-line react-hooks/exhaustive-deps` on the `useEffect` that loads convocatoria data. This suppression hides that `loadConvData` is used inside the effect but not listed as a dependency. When `DashboardPage` is split into hooks and subcomponents (Ola 3), moving `loadConvData` to a custom hook or changing its signature will invalidate the existing suppression. A naive refactor may re-enable the exhaustive-deps rule and cause an infinite fetch loop if `loadConvData` is recreated on every render.

**Why it happens:** The `loadConvData` function is defined inline in the component body without `useCallback`. Moving it into a custom hook without stabilizing it with `useCallback` will cause the effect to re-run every render.

**Consequences:** Infinite API call loop to Google Apps Script. Could exhaust the quota for the entire LingNova account.

**Prevention:**
- Before extracting `loadConvData`, wrap it in `useCallback` with explicit deps `[convocatoria]`.
- Remove the `eslint-disable` comment only after the dependency array is correct.
- The extracted custom hook (e.g., `useDashboardData`) should return a stable `loadConvData` reference.
- After refactoring, verify in React DevTools Profiler that the effect fires only once per convocatoria change.

**Warning signs:**
- Network tab shows repeated GET requests to `script.google.com` with no user interaction.
- Apps Script execution log shows hundreds of calls per session.

**Phase:** Ola 3.

---

### Pitfall 9: Modal Component Missing Focus Trap and Escape Handler

**What goes wrong:** The current `Modal.jsx` has no focus trap and no keyboard `Escape` handler. When `StudentDetailPopup` or `AlertList` opens, keyboard focus remains on the triggering element or the last focused element in the background. On mobile iOS Safari, this means VoiceOver can navigate outside the modal. On desktop, Tab key skips past the modal content back into the background teacher list.

**Why it happens:** The modal is implemented as a pure positional overlay (no `role="dialog"`, no `aria-modal`, no focus lock). The `onClick={onClose}` on the overlay handles mouse-only dismissal.

**Consequences:**
- Accessibility score impact (current score 5.0/10).
- iOS Safari focus trap implementation is particularly tricky: even `focus-trap-react` has documented issues where Safari VoiceOver can escape via virtual cursor navigation.
- Adding a focus trap naively with `autoFocus` on the modal container can scroll the mobile viewport to the top, breaking the visible layout context.

**Prevention:**
- Add `role="dialog"` and `aria-modal="true"` to the inner container.
- Add `aria-labelledby` pointing to the modal's heading element.
- Implement Escape key handler:
  ```js
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])
  ```
- For focus trap: use `focus-trap-react` or manual `querySelectorAll('[tabindex], button, input, a'[href])` approach. Set `initialFocus` to the close button, not the container div, to avoid iOS scroll-to-top.
- Do NOT add `height: 100vh` to the modal overlay — iOS Safari interprets this as the full viewport without accounting for the virtual keyboard, causing layout breaks when an input inside the modal is focused.

**Warning signs:**
- Tab key while modal is open moves focus to background elements.
- iOS VoiceOver swipe navigates outside modal content.
- Opening a modal with an input field causes the page to scroll up on iOS.

**Phase:** Ola 3.

---

### Pitfall 10: StudentRow Tests Rely on className Assertions (Implementation-Detail Tests)

**What goes wrong:** The existing `StudentRow.test.jsx` has two tests that assert `container.firstChild.className.toContain('bg-burgundy-soft')` and `'bg-white'`. These tests will break if the Tailwind class names change during a Ola 3 refactor (e.g., renaming a design token, adding a conditional class to a wrapper div, or splitting the component). They test CSS class names rather than user-visible behavior.

**Why it happens:** This pattern is common when there is no accessible role or text to query for visual state. It seems convenient but creates brittle coupling to the component's internal class structure.

**Consequences:** Ola 3 refactoring of `StudentRow` will cause test failures that are false negatives (the behavior is correct, the implementation changed). Developers may be tempted to skip or delete the tests rather than fix them.

**Prevention:**
- Replace className assertions with `data-testid` attributes or ARIA state queries:
  ```js
  // Instead of asserting on class names:
  expect(container.firstChild.className).toContain('bg-burgundy-soft')

  // Assert on ARIA or data attributes:
  expect(screen.getByRole('checkbox', { name: /presente/i })).toBeChecked()
  ```
- Add a `data-testid="student-row"` and `data-present={isPresent}` to `StudentRow` for test queries.
- The `animationDelay` inline style test (`container.firstChild.style.animationDelay`) will also break if the style is moved to a child element — same mitigation applies.

**Warning signs:**
- During Ola 3 refactor, tests fail with class name mismatches despite no behavior change.

**Phase:** Ola 3 (fix tests before or during refactor, not after).

---

## Minor Pitfalls

Low severity, but worth addressing to avoid confusion.

---

### Pitfall 11: searchQuery Debounce With useMemo Creates Double Computation

**What goes wrong:** The plan for Ola 2 is to add debounce to `searchQuery`. The current implementation uses `useMemo` to filter `allStudents` on `searchQuery`. If debounce is applied at the `setSearchQuery` call site (event handler) rather than at the `useMemo` input, the `useMemo` will still recompute on every keystroke during the debounce window because the state update is deferred but `allStudents` is always available. This is harmless but creates a confusing pattern.

**Prevention:** Apply debounce by introducing a separate `debouncedQuery` state via `useEffect` + `setTimeout`, and use that in the `useMemo`. Do not debounce the `setSearchQuery` directly since the SearchInput shows the raw (undelayed) value.

**Phase:** Ola 2.

---

### Pitfall 12: React.lazy Default Export Requirement

**What goes wrong:** `React.lazy()` requires the imported module to have a `default` export. All five page components currently use `export default` — so this is not an active bug. But if a future developer converts a page to a named export (e.g., `export function DashboardPage`), `React.lazy` will silently return `undefined` and the Suspense boundary will hang indefinitely without a useful error message.

**Prevention:** Document in code comments that page components MUST use `export default` because of `React.lazy`. Add an `ErrorBoundary` around each `Suspense` so that `ChunkLoadError` and missing-default-export errors produce visible UI rather than a blank screen.

**Phase:** Ola 2 (add ErrorBoundary around Suspense when implementing lazy loading).

---

### Pitfall 13: ARIA Overuse on Non-Interactive Div Elements

**What goes wrong:** Several interactive elements use `div` with `onClick` instead of native `button` elements (e.g., the teacher card expand toggle in `TeacherCard.jsx`, student rows in `TeacherCard`'s `GroupSection`, search result items in `DashboardPage`). Adding ARIA roles retroactively to `div` elements (e.g., `role="button"`) is fragile: it adds semantic meaning without native keyboard behavior (`Enter`/`Space` handlers must be added manually).

**Prevention:**
- When adding keyboard support to `TeacherCard` (Ola 3), convert `<div onClick={onToggle}>` to `<button onClick={onToggle}>` and style with `appearance-none`. This is simpler than managing `role="button"` + `tabIndex` + `onKeyDown`.
- Do not add `role="button"` to a `div` unless converting to `<button>` is genuinely impossible (e.g., a flex container that cannot be a button due to HTML constraints).
- Check that adding `<button>` inside the `<div className="mb-3">` teacher card wrapper does not break the existing Tailwind flex layout.

**Phase:** Ola 3.

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|---------------|------------|
| Ola 1 | navigateFallback fix | Wrong target path breaks all SW navigation | Change to `/index.html`, verify in DevTools offline mode |
| Ola 1 | API cache regex | `script.google.com` redirect to `googleusercontent.com` never cached | Add second regex entry for `googleusercontent.com` |
| Ola 1 | res.ok guard | Non-200 responses throw SyntaxError instead of clean message | Add `if (!res.ok) throw` before `res.json()` in both `apiGet` and `apiPost` |
| Ola 2 | React.memo | Inline handler props defeat memoization entirely | Wrap handlers in `useCallback` before applying `memo` |
| Ola 2 | autoUpdate + code-splitting | Mid-session SW activation causes ChunkLoadError and data loss | Switch to `prompt` registerType or persist attendance state to sessionStorage |
| Ola 2 | manualChunks | Internal app modules in manualChunks create circular chunk deps | Restrict manualChunks to `node_modules` only |
| Ola 3 | DashboardPage refactor | Extracted loadConvData without useCallback causes infinite fetch loop | Stabilize with useCallback, remove eslint-disable, verify in Profiler |
| Ola 3 | Modal accessibility | Focus trap on iOS Safari can escape via VoiceOver virtual cursor | Use `focus-trap-react` with `initialFocus` on close button, not container |
| Ola 3 | StudentRow tests | className assertions break on any class rename | Replace with data-testid or ARIA state queries before refactoring |
| Ola 3 | div-to-button conversion | `<button>` inside flex `<div>` may break layout | Test layout after conversion; use `type="button"` to prevent form submit |

---

## Sources

- [vite-pwa navigateFallbackAllowlist issue](https://github.com/vite-pwa/vite-plugin-pwa/issues/139)
- [vite-pwa URL parameters + navigateFallback issue](https://github.com/vite-pwa/vite-plugin-pwa/issues/653)
- [Workbox: handling service worker updates](https://developer.chrome.com/docs/workbox/handling-service-worker-updates)
- [skipWaiting + StaleWhileRevalidate pitfall](https://allanchain.github.io/blog/post/pwa-skipwaiting/)
- [React.memo — official documentation](https://react.dev/reference/react/memo)
- [The Uphill Battle of Memoization — tkdodo](https://tkdodo.eu/blog/the-uphill-battle-of-memoization)
- [React.memo always rerenders with array props — GitHub Issue](https://github.com/facebook/react/issues/17184)
- [Vite manualChunks breaking code-splitting — Issue #12209](https://github.com/vitejs/vite/issues/12209)
- [Vite unexpected circular dependencies — Issue #20202](https://github.com/vitejs/vite/issues/20202)
- [Hydration sabotages lazy loading — builder.io](https://www.builder.io/blog/hydration-sabotages-lazy-loading)
- [Accessible modals — A11Y Collective](https://www.a11y-collective.com/blog/modal-accessibility/)
- [iOS Safari focus trap escaping modal — react-modal issue](https://github.com/reactjs/react-modal/issues/713)
- [iOS keyboard obscures input in modal — react-spectrum issue](https://github.com/adobe/react-spectrum/issues/7972)
- [Fixing memoization-breaking re-renders — Sentry blog](https://blog.sentry.io/fixing-memoization-breaking-re-renders-in-react/)
- [CORS and runtime caching — vite-pwa issue #626](https://github.com/vite-pwa/vite-plugin-pwa/issues/626)
