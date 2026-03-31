# Domain Pitfalls — NovAttend v1.1 Hardening (A11Y, DOCS, SEC, TEST)

**Domain:** Adding accessibility, documentation, backend auth, and test coverage to an existing React 19 PWA with Google Apps Script backend
**Researched:** 2026-03-31
**Confidence:** HIGH — pitfalls grounded in actual codebase state (Código.js, TeacherCard.jsx, users.js reviewed), CORS behavior verified against official GAS docs and community reports, Vitest coverage config verified against official docs

---

## Critical Pitfalls

Mistakes that cause a rewrite, a broken deployment, or an unresolvable blocker.

---

### Pitfall 1: Sending an Authorization Header to Google Apps Script Triggers CORS Preflight That Never Resolves

**What goes wrong:**
The standard approach to "add server-side auth" is to send an `Authorization: Bearer <token>` header in every API request. For Google Apps Script Web Apps deployed as "Execute as me / Anyone can access," this header causes the browser to issue an OPTIONS preflight request before the real GET or POST. Google Apps Script does not handle the OPTIONS verb — it only responds to GET and POST. The preflight gets no `Access-Control-Allow-Origin` response and the browser blocks the real request. The API call fails entirely, not with an auth error, but with a CORS error.

**Why it happens:**
The CORS specification requires that any fetch with a non-simple header (e.g., `Authorization`, `X-API-Key`) must be preceded by a preflight OPTIONS request. GAS Web Apps have no mechanism to respond to OPTIONS. This is a documented, persistent limitation of the platform — it has not changed through 2025.

**How to avoid:**
Do NOT send auth tokens in HTTP headers to Apps Script. The two viable patterns for this codebase are:

Option A (recommended): Pass a shared secret as a URL query parameter on every request.
```js
// In apiGet — append to URL before fetch
url.searchParams.set('api_key', import.meta.env.VITE_API_KEY)
```
On the Apps Script side, validate in `doGet` and `doPost`:
```js
const API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY')
if (e.parameter.api_key !== API_KEY) return jsonError('No autorizado', 403)
```
Store the key in Script Properties (GAS console > Project Settings > Script Properties), never hardcode it in Code.gs.

Option B (fallback): Use a URL-embedded secret in the deployment URL itself (obscurity only, not true auth). Acceptable for this 8-user internal app but provides no meaningful security.

Cookies are not viable: GAS Web Apps do not set or read cookies across origins reliably.

**Warning signs:**
- `net::ERR_FAILED` or `CORS policy` errors in the browser console on every API call after adding the header.
- The error appears before any response is received (preflight failure, not an auth rejection).
- DevTools Network tab shows an OPTIONS request with no response.

**Phase to address:** SEC (Ola 4)

---

### Pitfall 2: The Shared Secret in VITE_API_KEY Is Exposed in the Browser Bundle

**What goes wrong:**
After implementing Option A above, `VITE_API_KEY` is embedded in the compiled JavaScript bundle. Anyone who opens DevTools > Sources or runs `strings dist/assets/main-*.js` can read the key. For a public-facing app, this is a fatal vulnerability. For a 8-user internal tool deployed on Vercel behind a known URL, the risk is lower but real: the Sheets data (student names, attendance) is not encrypted, and any person with access to the Vercel URL and DevTools can call the API directly.

**Why it happens:**
Vite's `import.meta.env.VITE_*` variables are statically substituted at build time — they are not runtime secrets. The `VITE_` prefix is specifically for values that are intentionally exposed to the client bundle.

**How to avoid:**
Accept this limitation explicitly and document it. The correct mitigation for an internal 8-user tool is:
1. Rotate the API key if it is leaked (update Script Properties + Vercel env var).
2. Use IP allowlisting on the Vercel deployment if the team uses a fixed office IP.
3. Do NOT add secret-looking key names that imply false security (`VITE_SECRET_TOKEN` reads as more secure than it is).

Do not attempt to "hide" the key using obfuscation or base64 encoding — these add complexity with zero actual security gain.

**Warning signs:**
- The key appears in plaintext when searching the production JS bundle.
- A developer assumes `import.meta.env` variables are server-side because they are "environment variables."

**Phase to address:** SEC (Ola 4) — document the limitation explicitly in the implementation plan.

---

### Pitfall 3: Passwords Are Stored in Plaintext in the Client Bundle (users.js)

**What goes wrong:**
`src/config/users.js` contains all 8 usernames and passwords in plaintext. These are included in the production bundle. The current passwords follow a predictable pattern (`nombre2026`). SEC-01 through SEC-06 address server-side auth for the API, but unless `users.js` is also addressed, the passwords remain readable by anyone with DevTools.

**Why it happens:**
The original design was a mock-first approach where auth was always going to be moved server-side later. The v1.0 milestone deferred backend changes. The v1.1 SEC work focuses on API-level auth, but `users.js` may be left behind.

**How to avoid:**
The scope of SEC in v1.1 must explicitly include whether to move credential verification server-side. Options:
- Move login validation to the Apps Script `doPost` with a `login` action that verifies credentials against a USERS sheet (not plaintext in the bundle). Return a session token stored in sessionStorage.
- If this is out of scope, document that `users.js` plaintext credentials are a known accepted risk for v1.1.

Do not address `users.js` and API auth independently — they are the same attack surface.

**Warning signs:**
- SEC phase is closed, but `users.js` still contains `{ password: "samuel2026" }` in plaintext.
- Running `strings dist/assets/main-*.js | grep 2026` reveals all passwords.

**Phase to address:** SEC (Ola 4) — must be a conscious scoping decision, not an oversight.

---

### Pitfall 4: Converting `<div onClick>` to `<button>` in TeacherCard Breaks the Nested Flex Layout

**What goes wrong:**
`TeacherCard.jsx` has three interactive `<div>` elements: the teacher card header, the group section header, and individual student rows. Converting them to `<button>` is the correct accessibility fix (native keyboard support, Enter/Space activation, correct ARIA semantics), but a `<button>` element is an inline element by default. Wrapping content that currently uses `flex items-center gap-3` inside a `<button>` requires adding `w-full flex` classes or the layout breaks — the chevron icon shifts, the Avatar loses its gap, and the card collapses to auto-width.

Additionally, `<button>` elements inside `<button>` elements are invalid HTML. If any wrapper div is also converted to a button, nesting creates an HTML validation error and unpredictable browser behavior.

**Why it happens:**
Developers convert the element tag and forget that `display: block; width: 100%` must be explicitly set. The Tailwind class `cursor-pointer` on the original `<div>` does nothing to preserve the layout when the element type changes.

**How to avoid:**
When converting, add these classes to the replacement `<button>`:
```jsx
<button
  type="button"
  onClick={onToggle}
  className="w-full flex items-center gap-3 bg-white border-[1.5px] border-border rounded-xl p-3 cursor-pointer transition-all duration-300 hover:bg-cream text-left"
>
```
Key additions: `w-full`, `flex`, `text-left` (buttons center text by default), `type="button"` (prevents accidental form submission).

Test each conversion in isolation before moving to the next. The student row conversion is independent of the teacher card header conversion.

**Warning signs:**
- After conversion, the Avatar/Badge/Chevron row collapses to a single column.
- The card width becomes `fit-content` instead of full-width.
- The chevron icon appears left-aligned instead of right.

**Phase to address:** A11Y (Ola 4)

---

## Moderate Pitfalls

Mistakes that create maintenance problems, false security, or degraded user experience without causing immediate breakage.

---

### Pitfall 5: Adding ARIA Attributes Without Updating Them Dynamically Breaks Screen Reader State

**What goes wrong:**
Adding `aria-expanded={false}` to the TeacherCard button header is step one. The common mistake is forgetting to wire the value to the actual `isExpanded` prop. A static `aria-expanded="false"` that never changes to `"true"` is worse than no ARIA at all — it tells screen readers the control never opens, making keyboard users think the feature is broken or disabled.

The same applies to `GroupSection`: each group row needs its own `aria-expanded` wired to `!!expandedGroups[group.id]`, and the `aria-controls` attribute must point to the `id` of the expandable content region. If two groups have the same `id` value on their content regions, `aria-controls` will point to the wrong element.

**Why it happens:**
ARIA attributes look like they "just add metadata" — developers add them in a single pass without tracing how the dynamic state flows. The static JSX makes it hard to see that `aria-expanded` needs to be a JSX expression, not a string literal.

**How to avoid:**
For every `aria-expanded`, immediately write the corresponding dynamic value:
```jsx
<button
  type="button"
  aria-expanded={isExpanded}
  aria-controls={`teacher-content-${teacher.id}`}
  onClick={onToggle}
>
```
And the controlled region must have a matching `id`:
```jsx
{isExpanded && (
  <div id={`teacher-content-${teacher.id}`}>
```
Use unique IDs derived from actual data IDs, never hardcoded strings. Test with keyboard Tab + Enter and verify the `aria-expanded` value flips in the Accessibility panel of DevTools.

**Warning signs:**
- DevTools Accessibility panel shows `aria-expanded: false` even when the card is visually open.
- `aria-controls` points to an element that does not exist in the DOM (because the content is conditionally rendered with `&&` and the `id` only exists when visible).

**Phase to address:** A11Y (Ola 4)

---

### Pitfall 6: aria-controls Points to Conditionally Rendered Content That Does Not Exist in the DOM

**What goes wrong:**
`aria-controls="teacher-content-1"` is only meaningful if an element with `id="teacher-content-1"` exists in the DOM. When `isExpanded` is `false`, the content region is not rendered (using `&&` short-circuit). The ARIA reference is broken: screen readers that follow `aria-controls` find nothing. This is a known WCAG violation (ARIA in HTML, Requirement 5).

**Why it happens:**
The `&&` conditional rendering pattern removes elements from the DOM entirely, unlike `visibility: hidden` or `display: none`. ARIA references do not survive this — they require the target element to exist, even if visually hidden.

**How to avoid:**
Two valid approaches:
1. Use `aria-expanded` alone (without `aria-controls`) for disclosure buttons. Screen readers announce "button, collapsed" / "button, expanded" from `aria-expanded` — `aria-controls` is supplementary and optional.
2. Render the content region always but toggle visibility: `<div id="..." hidden={!isExpanded}>`. This keeps the element in the DOM for `aria-controls` to reference.

For this codebase, approach 1 is simpler and sufficient for 8 users. Do not add `aria-controls` if the content is conditionally rendered with `&&`.

**Warning signs:**
- axe DevTools or browser accessibility checker reports "ARIA attribute references element that does not exist."
- The collapsible content region disappears from the DOM when closed (check Elements panel — it should not be present).

**Phase to address:** A11Y (Ola 4)

---

### Pitfall 7: JSDoc Comments That Describe Props Already Visible From the Component Signature Add Zero Value

**What goes wrong:**
The 11 components missing JSDoc will receive comments that duplicate what the code already says. Example:
```js
/**
 * @param {boolean} isPresent - Si el alumno esta presente
 * @param {function} onToggle - Funcion al hacer toggle
 */
```
This adds zero value — a developer reading `StudentRow.jsx` can see `isPresent` and `onToggle` in the function signature. Worse, when the prop is renamed or its type changes, the JSDoc gets stale instantly and actively misleads future developers.

**Why it happens:**
JSDoc tasks are treated as "fill in the template" exercises. Developers copy the prop names from the signature into `@param` tags and consider the task done.

**How to avoid:**
Useful JSDoc for this codebase answers questions the signature cannot. For each component, document:
1. **Why** — what business rule or UX contract does this component enforce?
2. **Non-obvious constraints** — e.g., `animationDelay` must be between 0–500ms or the CSS animation breaks; `ariaLabel` is required when the modal has no visible heading.
3. **Side effects** — does the component call `sessionStorage`? Does it navigate?
4. **Data shape for complex objects** — `teacher.groups[].students[].monthly` is not obvious from `{object} teacher`.

The test: if a new developer could infer everything in the JSDoc comment from reading the 5 lines of function signature, the comment adds no value.

**Warning signs:**
- Every `@param` entry mirrors the prop name with an obvious description.
- The JSDoc block is longer than the component body.
- After a prop rename, the old name still appears in the JSDoc with no error.

**Phase to address:** DOCS (Ola 4)

---

### Pitfall 8: Writing Tests to Hit 60% Line Coverage Rather Than to Prevent Regressions

**What goes wrong:**
The current target is "raise coverage to 60%." Without guidance, developers will add tests that execute code paths cheaply: rendering a component with default props, checking it does not throw, checking a heading text. These tests pass, add lines to the coverage count, and provide zero regression protection. Example: `expect(screen.getByText('Grupos')).toBeInTheDocument()` confirms text renders but will not catch a broken `onToggle` handler, a missing `aria-expanded`, or a crashed `getAttendanceScheme` call.

**Why it happens:**
Coverage percentage is a proxy metric that is easy to game. Testing-to-coverage is a common failure mode when the metric is the goal rather than the means.

**How to avoid:**
Before writing any new test, write down one sentence: "This test will catch the regression if [specific thing] breaks." If the sentence is vague or empty, the test is a vanity test.

Prioritize tests that cover:
1. **User interaction paths**: toggle a teacher card open, verify the group list appears. Toggle it closed, verify it disappears.
2. **Error states**: pass malformed data to `buildTeachersHierarchy`, verify it does not throw but returns an empty array.
3. **Auth guard behavior**: navigate to `/dashboard` without CEO session, verify redirect to `/`.
4. **API failure states**: mock `getConvocatorias` to throw, verify `LoginPage` shows the error message.

Meaningful coverage at 50% (branch + interaction paths) beats vanity coverage at 70% (just renders and text content).

**Warning signs:**
- All new tests use only `render` and `screen.getByText`.
- No test uses `userEvent.click`, `userEvent.type`, or `waitFor`.
- Coverage percentage increased but no failing test was found during the sprint.

**Phase to address:** TEST (Ola 5)

---

### Pitfall 9: Adding Coverage Reporting Without Installing the Coverage Provider First

**What goes wrong:**
Vitest does not include a coverage provider by default. Running `vitest run --coverage` without `@vitest/coverage-v8` or `@vitest/coverage-istanbul` installed throws: `Error: Failed to load coverage provider "v8"`. This is a one-line fix, but it will block the TEST phase if not included in the setup step.

Additionally, without configuring coverage thresholds in `vite.config.js`, there is no enforcement — the CI/CD pipeline will not fail if coverage drops below 60% after a future code change. The coverage target becomes meaningless without a threshold.

**Why it happens:**
Coverage is treated as a one-time measurement ("check what we have") rather than a maintained gate. The threshold configuration step is forgotten because coverage "just works" on the first run.

**How to avoid:**
Install the provider:
```bash
npm install -D @vitest/coverage-v8
```

Configure threshold enforcement in `vite.config.js`:
```js
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    thresholds: {
      lines: 60,
      functions: 60,
      branches: 50,
    },
    exclude: ['src/tests/**', 'src/config/users.js', 'apps-script/**']
  }
}
```

Exclude `src/config/users.js` from coverage — it is static data, not logic. Excluding it prevents inflating branch coverage with trivial object literal paths.

**Warning signs:**
- `npm test` does not run coverage unless `--coverage` flag is passed.
- No coverage report appears in CI output.
- Coverage percentage is never mentioned in a PR review.

**Phase to address:** TEST (Ola 5)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Query param API key instead of bearer token | Avoids CORS preflight, works immediately | Key is visible in browser network tab and server logs | Acceptable for this 8-user internal tool; document the tradeoff explicitly |
| JSDoc on all components in one batch commit | Completes the DOCS task fast | Docs go stale instantly if not enforced in review; no linter checks JSDoc accuracy | Never — better to document 4 complex components thoroughly than 11 shallowly |
| Keeping `users.js` plaintext passwords for v1.1 | Avoids scope creep into full auth rearchitecture | Passwords exposed in bundle; any JS bundle inspector reads them | Acceptable only if explicitly documented as v1.2 scope with a tracking issue |
| Adding `aria-expanded` to existing `<div onClick>` without converting to `<button>` | Faster than layout refactor | `<div role="button">` requires manual `tabIndex`, `onKeyDown`, `onKeyUp` — more code, more fragile | Never — the button conversion takes 10 minutes; the div workaround takes 30 and stays fragile |
| Writing render-only tests to hit 60% | Coverage metric met quickly | Provides false confidence; regressions in interaction paths are not caught | Never for interaction logic; acceptable only for pure display components |

---

## Integration Gotchas

Common mistakes when connecting to or modifying external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google Apps Script auth | Sending `Authorization` header → CORS preflight failure | Pass shared secret as URL query param; validate in `doGet`/`doPost` against `PropertiesService` |
| Google Apps Script auth | Storing API key in `Code.gs` as a constant | Store in Script Properties (GAS console) and retrieve with `PropertiesService.getScriptProperties().getProperty('API_KEY')` |
| Vercel + GAS | Setting `VITE_API_KEY` and assuming it is server-side secret | `VITE_*` vars are baked into the JS bundle; document this explicitly; rotate if compromised |
| Google Apps Script cache | Adding auth check AFTER cache lookup | Auth check must be FIRST in `doGet`/`doPost` — before `cachedGet()` is called, or unauthenticated requests read cached data |
| Vitest coverage | Running `vitest --coverage` without installing provider | Install `@vitest/coverage-v8` first; configure in `vite.config.js` `test.coverage` block |
| Testing Library + React.memo | Testing a memoized component and getting stale renders | Wrap component in `MemoryRouter` if it uses navigation; `vi.mock` must be hoisted before imports |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Adding API key auth to Apps Script but leaving `users.js` plaintext credentials in bundle | Attackers can read all 8 passwords from DevTools Sources | Explicitly scope or defer `users.js` migration; never treat it as already secure |
| Using `console.log` during SEC implementation to debug auth flow | Token values appear in browser console and may be captured in error tracking tools (if Sentry is added later) | Remove all auth-related `console.log` before merging SEC phase |
| Validating API key with `===` string comparison in Apps Script — vulnerable to timing attacks | Negligible risk for internal tool; mentioned for completeness | For internal 8-user tool, `===` is acceptable; `PropertiesService` value is already server-side |
| Sending API key in URL query param — appears in Apps Script execution logs | Any co-admin of the Google Workspace can read the key from logs | Acceptable for this tool; if logs are a concern, use `PropertiesService.getScriptProperties()` for a rotating key |
| Adding `role="button"` + `tabIndex={0}` to `<div>` and forgetting `onKeyDown` | Keyboard users can Tab to the element but Enter/Space does nothing — worse than before (raises expectations, then fails them) | Always convert to `<button type="button">` instead; never use `role="button"` on a div in this codebase |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Focus trap steals focus from the expand button when the teacher card opens (not a modal) | Teacher using keyboard Tab is sent to an unexpected location after toggling a card | Focus trap is ONLY for modals (StudentDetailPopup). TeacherCard is a disclosure widget — no focus trap, just `aria-expanded` + natural tab flow |
| Adding visible focus ring only to converted `<button>` elements but not to `<input>` fields | Inconsistent focus visibility creates confusion for keyboard users | Apply consistent `focus:outline-none focus:ring-2 focus:ring-gold` to ALL interactive elements, not just newly converted ones |
| Announcing dynamic content updates (e.g., "3 alumnos presentes") via `aria-live` on AttendancePage | Attendance marking is rapid — every toggle fires a screen reader announcement, creating noise | Do not add `aria-live` to the attendance counter unless explicitly requested; the toggle state (`aria-pressed` on ToggleSwitch) is sufficient feedback |
| JSDoc `@deprecated` tag on props that are still in use | IDE shows strikethrough on props that work fine, confusing developers | Never use `@deprecated` in JSDoc unless the prop is actively being removed in the same PR |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **A11Y TeacherCard:** `aria-expanded` added — verify the value is a JSX expression `{isExpanded}` not a static string `"false"`. Check DevTools Accessibility panel with card open and closed.
- [ ] **A11Y button conversion:** `type="button"` attribute present — without it, a `<button>` inside any ancestor `<form>` submits the form on Enter. There is no `<form>` in TeacherCard today, but defensive hygiene matters.
- [ ] **A11Y aria-controls:** Only add if the controlled region is always in the DOM. If using `&&` conditional rendering, omit `aria-controls` — `aria-expanded` alone is sufficient.
- [ ] **SEC API key:** Validation in Apps Script is BEFORE cache lookup — check `doGet` and `doPost` call order in `Código.js`.
- [ ] **SEC API key in .env:** `VITE_API_KEY` must be added to Vercel environment variables — a `.env.local` key does not deploy automatically.
- [ ] **DOCS JSDoc:** All `@param` entries for complex object props (e.g., `teacher`, `student`) document the shape of nested properties, not just `{object} teacher - Datos del profesor`.
- [ ] **TEST coverage provider:** `@vitest/coverage-v8` is in `devDependencies` in `package.json`, not just installed locally.
- [ ] **TEST coverage threshold:** `vite.config.js` has `thresholds` configured — running `npm test` fails the build if coverage drops below 60%.
- [ ] **TEST meaningful tests:** At least 3 new tests use `userEvent` (click, type, keyboard interaction) — not just `render` + `getByText`.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| CORS error after adding Authorization header | LOW | Remove the header; switch to query param approach; no GAS redeploy needed if `doGet`/`doPost` already checks `e.parameter.api_key` |
| API key exposed in bundle | LOW | Rotate: update Script Properties in GAS console + update Vercel env var + redeploy; old key becomes invalid immediately |
| Layout broken after div-to-button conversion | LOW | Add `w-full flex text-left` to the button className; revert to `<div>` temporarily if layout investigation is needed |
| `aria-expanded` stuck at false | LOW | Find the prop threading — confirm `isExpanded` is passed as a JSX expression, not a hardcoded string in JSX |
| Coverage threshold enforcement missing | LOW | Add `thresholds` to `vite.config.js`; rerun `npm test -- --coverage` to verify |
| JSDoc blocks are stale after a prop rename | MEDIUM | Run a lint pass; consider adding `eslint-plugin-jsdoc` to ESLint config so mismatches surface as warnings |
| Passwords in `users.js` leak via bundle | HIGH | Rotate all passwords immediately; implement server-side credential verification (moves out of scope for v1.1 — becomes emergency v1.2 work) |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Authorization header triggers CORS preflight in GAS | SEC (Ola 4) | All API calls succeed after adding key; no CORS errors in DevTools console |
| API key visible in JS bundle | SEC (Ola 4) | Document explicitly in implementation plan; do not claim it is a server secret |
| users.js plaintext passwords | SEC (Ola 4) — scoping decision | Decision documented in implementation; either migrated or explicitly deferred |
| Auth check must precede cache lookup in GAS | SEC (Ola 4) | Code review: `doGet`/`doPost` validates `api_key` on first line |
| div-to-button breaks flex layout | A11Y (Ola 4) | Visual regression check after each component conversion |
| aria-expanded not wired dynamically | A11Y (Ola 4) | Test with keyboard Tab+Enter and DevTools Accessibility panel |
| aria-controls references non-existent DOM element | A11Y (Ola 4) | axe DevTools browser extension scan on Dashboard page |
| JSDoc duplicates prop names without adding context | DOCS (Ola 4) | Peer review criterion: "Does this comment answer a question the signature cannot?" |
| Coverage gaming (render-only tests) | TEST (Ola 5) | PR review: at least N new tests must use `userEvent`; coverage report shows branch coverage, not just line coverage |
| Coverage provider not installed | TEST (Ola 5) | `npm test -- --coverage` runs and produces a report in CI without extra setup |
| Coverage threshold not enforced | TEST (Ola 5) | Deliberately delete a tested function and verify `npm test -- --coverage` fails the build |

---

## Sources

- [Google Apps Script Web Apps — Official documentation](https://developers.google.com/apps-script/guides/web)
- [Taking Advantage of Web Apps with GAS — tanaikech](https://github.com/tanaikech/taking-advantage-of-Web-Apps-with-google-apps-script/blob/master/README.md)
- [CORS issues with GAS — community discussion](https://groups.google.com/g/google-apps-script-community/c/zJpevovcFLA)
- [CORS fix for GAS — Lambda IITH](https://iith.dev/blog/app-script-cors/)
- [Secure Secrets in Google Apps Script](https://justin.poehnelt.com/posts/secure-secrets-google-apps-script/)
- [PropertiesService — Official GAS docs](https://developers.google.com/apps-script/reference/properties/properties-service)
- [Vitest Coverage configuration — Official docs](https://vitest.dev/guide/coverage)
- [Vitest coverage thresholds](https://vitest.dev/config/coverage)
- [Accessible Accordion — Aditus patterns](https://www.aditus.io/patterns/accordion/)
- [aria-expanded without aria-controls — DEV Community](https://dev.to/eevajonnapanula/expand-the-content-inclusively-building-an-accessible-accordion-with-react-2ded)
- [Mastering ARIA — common beginner mistakes](https://medium.com/@askParamSingh/mastering-aria-fixing-common-beginner-mistakes-9a9e51248ca9)
- [React Accessibility docs — official](https://legacy.reactjs.org/docs/accessibility.html)
- [JSDoc for React components — best practices](https://plainenglish.io/blog/best-practices-for-documenting-react-components)

---
*Pitfalls research for: NovAttend v1.1 — A11Y, DOCS, SEC, TEST hardening of existing React 19 PWA + Google Apps Script backend*
*Researched: 2026-03-31*
