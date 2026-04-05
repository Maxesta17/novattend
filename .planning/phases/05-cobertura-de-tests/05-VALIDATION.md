---
phase: 5
slug: cobertura-de-tests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.18 + @vitest/coverage-v8 4.0.18 |
| **Config file** | `vite.config.js` (test section) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run test:coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run test:coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | TEST-01 | infra | `npm run test:coverage` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | TEST-04 | unit | `npx vitest run src/tests/buildTeachersHierarchy.test.js` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | TEST-04 | unit | `npx vitest run src/tests/useStudents.test.jsx` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | TEST-03 | unit+aria | `npx vitest run src/tests/GroupTabs.test.jsx` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | TEST-03 | unit+aria | `npx vitest run src/tests/TeacherCard.test.jsx` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | TEST-02 | integration | `npx vitest run src/tests/AttendancePage.test.jsx` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 2 | TEST-02 | integration | `npx vitest run src/tests/DashboardPage.test.jsx` | ❌ W0 | ⬜ pending |
| 05-03-03 | 03 | 2 | TEST-05 | coverage | `npm run test:coverage` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `@vitest/coverage-v8@4.0.18` — install coverage provider as devDependency
- [ ] `vite.config.js` — add `test.coverage` config with provider 'v8' and thresholds at 60%
- [ ] `package.json` — add `test:coverage` script

*Existing test infrastructure (vitest, testing-library, setup.js) covers base requirements.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
