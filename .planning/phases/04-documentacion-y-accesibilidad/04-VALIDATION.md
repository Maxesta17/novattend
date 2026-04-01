---
phase: 4
slug: documentacion-y-accesibilidad
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| **Config file** | `vite.config.js` (seccion `test`) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm test && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | A11Y-01 | unit | `npm test -- --reporter verbose` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | A11Y-02 | unit | `npm test -- --reporter verbose` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | A11Y-02 | unit | `npm test -- --reporter verbose` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | A11Y-03 | manual-only | Inspeccion visual en navegador | — | ⬜ pending |
| 04-01-05 | 01 | 1 | A11Y-04 | unit | `npm test -- --reporter verbose` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | DOCS-01 | lint | `npm run lint` | — | ⬜ pending |
| 04-02-02 | 02 | 1 | DOCS-02 | lint | `npm run lint` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/tests/TeacherCard.test.jsx` — stubs for A11Y-01 (keyboard Enter/Space/Escape + ARIA attrs)
- [ ] `src/tests/GroupTabs.test.jsx` — stubs for A11Y-02 (tablist/tab/aria-selected, arrow keys)
- [ ] `src/tests/ProgressBar.test.jsx` — stubs for A11Y-02 (role=progressbar, aria-value*)
- [ ] `src/tests/A11Y-SVGs.test.jsx` — stubs for A11Y-04 (aria-hidden en SVGs decorativos)

**Nota:** A11Y-03 (focus ring) es CSS puro — verificacion visual, no automatizable con Testing Library.
**Nota:** Tests ARIA en TeacherCard/GroupTabs son stubs RED — Phase 5 (TEST-03) los completa con jest-axe.