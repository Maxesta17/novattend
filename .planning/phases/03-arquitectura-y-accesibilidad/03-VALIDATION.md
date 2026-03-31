---
phase: 03
slug: arquitectura-y-accesibilidad
status: draft
nyquist_compliant: true
wave_0_complete: false
wave_0_plan: 03-00
created: 2026-03-31
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 + @testing-library/react ^16.3.2 |
| **Config file** | `vite.config.js` (seccion `test:`) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~6 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-00-01 | 00 | 0 | ARCH-01, ARCH-02 | stub | `npm test` | Creates them | pending |
| 03-01-01 | 01 | 1 | ARCH-01 | unit | `npm test -- useDashboard` | Yes (W0) | pending |
| 03-01-02 | 01 | 1 | ARCH-01 | smoke | `npm test` | Yes (existing suite) | pending |
| 03-02-01 | 02 | 1 | ARCH-02 | unit | `npm test -- useFocusTrap` | Yes (W0) | pending |
| 03-02-02 | 02 | 1 | ARCH-02 | unit | `npm test -- Modal` | Yes (W0) | pending |
| 03-02-03 | 02 | 1 | SC3 | regression | `npm test` | Yes (existing suite) | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Addressed by **03-00-PLAN.md** (Wave 0):

- [ ] `src/tests/useDashboard.test.jsx` — stubs for ARCH-01 (hook returns expected interface)
- [ ] `src/tests/useFocusTrap.test.jsx` — stubs for ARCH-02 (Tab trap + Escape)
- [ ] `src/tests/Modal.test.jsx` — stubs for ARCH-02 (role="dialog", aria-modal, ariaLabel prop)

*Note: `renderHook` from `@testing-library/react` already available — no new installs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Focus trap feels natural in browser | ARCH-02 | jsdom cannot fully simulate Tab navigation between elements | Open Modal in browser, press Tab repeatedly — focus should cycle within modal |
| Focus restoration on modal close | ARCH-02 | Optional enhancement, requires real browser | Open modal, close with Escape — focus should return to trigger element |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (plan 03-00)
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
