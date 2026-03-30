---
phase: 1
slug: estabilidad-critica
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 + @testing-library/react ^16.3.2 |
| **Config file** | vite.config.js (seccion `test:`) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npm run lint`
- **Before `/gsd:verify-work`:** `npm test && npm run lint && npm run build` — todo en verde
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01 | 01 | 1 | COMP-01 | unit | `npm test -- Button.test` | ✅ (ampliar) | ⬜ pending |
| 01-02 | 01 | 1 | COMP-02 | manual | Inspeccion index.html | N/A | ⬜ pending |
| 01-03 | 01 | 1 | COMP-03 | cli | `npm audit` | N/A | ⬜ pending |
| 02-01 | 02 | 1 | ERR-01 | unit | `npm test -- api.test` | ❌ W0 | ⬜ pending |
| 02-02 | 02 | 1 | ERR-02 | unit | `npm test -- ErrorBanner.test` | ❌ W0 | ⬜ pending |
| 02-03 | 02 | 1 | ERR-03 | unit | `npm test -- SavedPage.test` | ❌ W0 | ⬜ pending |
| 02-04 | 02 | 1 | ERR-04 | unit | `npm test -- NotFoundPage.test` | ❌ W0 | ⬜ pending |
| 03-01 | 03 | 2 | PWA-01 | manual | `npm run build && npm run preview` | N/A | ⬜ pending |
| 03-02 | 03 | 2 | PWA-02 | unit | `npm test` | ❌ W0 | ⬜ pending |
| 03-03 | 03 | 2 | PWA-03 | manual | `npm run build` + DevTools | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/tests/ErrorBanner.test.jsx` — stubs para ERR-02 (renders message, hides when null, calls onDismiss)
- [ ] `src/tests/SavedPage.test.jsx` — stubs para ERR-03 (no redirige cuando present===0)
- [ ] `src/tests/NotFoundPage.test.jsx` — stubs para ERR-04 (muestra "404", navega a /)
- [ ] Ampliar `src/tests/api.test.jsx` — stubs para ERR-01 (apiGet lanza cuando !res.ok)
- [ ] Ampliar `src/tests/Button.test.jsx` — stubs para COMP-01 (bg-disabled en variant disabled)

*Existing infrastructure covers framework — only test stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SPA navega offline | PWA-01 | Requiere build + preview + modo avion | 1. `npm run build && npm run preview` 2. Activar modo avion 3. Navegar a /attendance 4. Verificar que carga app shell |
| Manifest fields correctos | PWA-03 | Verificacion de DevTools | 1. `npm run build` 2. Abrir dist/manifest.webmanifest 3. Confirmar start_url, scope, lang |
| index.html lang="es" | COMP-02 | Inspeccion directa | Abrir index.html, verificar `<html lang="es">` |
| npm audit limpio | COMP-03 | CLI output | Ejecutar `npm audit` y confirmar 0 vulnerabilidades |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
