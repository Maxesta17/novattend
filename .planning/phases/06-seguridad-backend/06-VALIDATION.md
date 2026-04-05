---
phase: 6
slug: seguridad-backend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vite.config.js` (seccion `test`) |
| **Quick run command** | `npm test -- src/tests/api.test.jsx` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/tests/api.test.jsx`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | SEC-01 | manual | test manual en editor Apps Script | N/A | ⬜ pending |
| 06-01-02 | 01 | 1 | SEC-02 | inspeccion | `grep -r "api_key\|API_KEY" apps-script/` | N/A | ⬜ pending |
| 06-01-03 | 01 | 1 | SEC-04 | manual | test manual en editor Apps Script | N/A | ⬜ pending |
| 06-01-04 | 01 | 1 | SEC-06 | manual | test manual en editor Apps Script | N/A | ⬜ pending |
| 06-02-01 | 02 | 1 | SEC-03 | unit | `npm test -- src/tests/api.test.jsx` | ✅ (ampliar) | ⬜ pending |
| 06-02-02 | 02 | 1 | SEC-05 | unit | `npm test -- src/tests/api.test.jsx` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 1 | SEC-03 | unit | `npm test -- src/tests/api.test.jsx` | ✅ (ampliar) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/tests/api.test.jsx` — ampliar con tests SEC-03 (inyeccion api_key en GET y POST, caso sin key, API deshabilitada)
- [ ] Test de `src/config/api.js` — verificar que `API_KEY` se exporta correctamente desde `import.meta.env.VITE_API_KEY`

*Existing infrastructure covers automated requirements. Wave 0 adds SEC-03/SEC-05 test stubs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Backend rechaza request sin token | SEC-01, SEC-04 | Apps Script no testeable con Vitest | 1. Abrir endpoint sin `?api_key=` 2. Verificar respuesta `{ status: 'error', code: 401 }` |
| console.warn en rechazo | SEC-06 | Solo visible en Stackdriver/Cloud Logging | 1. Enviar request sin token 2. Ver Ejecuciones en editor Apps Script 3. Confirmar log AUTH_REJECTED |
| API key en Script Properties | SEC-02 | Config manual en editor Apps Script | 1. Abrir Propiedades del script 2. Verificar clave `API_KEY` con UUID v4 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
