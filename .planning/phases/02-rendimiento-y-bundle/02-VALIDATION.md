---
phase: 2
slug: rendimiento-y-bundle
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 |
| **Config file** | vite.config.js (seccion `test`) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

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
| 02-01-01 | 01 | 1 | PWA-04 | unit | `npm test -- --testPathPattern UpdateBanner` | No — W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | PWA-04 | unit | `npm test -- --testPathPattern UpdateBanner` | No — W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | PERF-01 | unit | `npm test -- --testPathPattern LoadingSpinner` | No — W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | PERF-01 | smoke | `npm run build` | ✅ | ⬜ pending |
| 02-03-01 | 03 | 2 | PERF-02 | unit | `npm test` | ✅ | ⬜ pending |
| 02-04-01 | 04 | 2 | PERF-03 | manual | Prueba visual en devtools | — | ⬜ pending |
| 02-05-01 | 05 | 2 | PERF-04 | smoke | `npm run build` | ✅ | ⬜ pending |
| 02-06-01 | 06 | 2 | PERF-05 | unit | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/tests/UpdateBanner.test.jsx` — stubs for PWA-04 (renderizado condicional + handler onUpdate)
- [ ] `src/tests/LoadingSpinner.test.jsx` — stubs for PERF-01 (renderizado del spinner y label)

*Tests existentes no requieren modificacion: `StudentRow.test.jsx` ya prueba el componente; envolver en memo no cambia la interfaz externa.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| searchResults no se recalcula en cada keystroke | PERF-03 | Debounce timing es dificil de unit-testear de forma confiable | Teclear rapido en campo busqueda Dashboard; verificar en React DevTools que no hay re-renders por cada keypress |
| Build genera chunks vendor-react y vendor-router | PERF-04 | Output de build verificable con grep en terminal | `npm run build && ls dist/assets/ \| grep vendor` |
| Promise.all en DashboardPage | PERF-05 | Paralelismo dificil de aislar en unit test | Verificar en Network tab que getProfesores y getResumen se disparan simultaneamente |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
