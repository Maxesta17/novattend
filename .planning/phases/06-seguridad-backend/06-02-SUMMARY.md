---
phase: 06-seguridad-backend
plan: 02
subsystem: api
tags: [security, api-key, env-vars, vite, google-apps-script, testing]

# Dependency graph
requires:
  - phase: 06-seguridad-backend/plan-01
    provides: validacion de api_key en el backend Apps Script (doGet/doPost)
provides:
  - export API_KEY desde config/api.js
  - inyeccion de api_key en apiGet (query param) y apiPost (body JSON)
  - warning D-09 en dev si API habilitada pero falta API_KEY
  - 4 tests nuevos cubriendo inyeccion de token SEC-03
affects: [deploy, vercel-env, apps-script-backend]

# Tech tracking
tech-stack:
  added: []
  patterns: [conditional-token-injection, env-var-guard, dev-only-warning]

key-files:
  created: []
  modified:
    - src/config/api.js
    - src/services/api.js
    - src/tests/api.test.jsx

key-decisions:
  - "api_key como query param en GET y body en POST (evita CORS preflight de headers Authorization)"
  - "Guard if(API_KEY) para no inyectar string vacio cuando la key no esta configurada"
  - "Warning D-09 usa import.meta.env.DEV nativo de Vite, solo se emite en desarrollo"

patterns-established:
  - "Inyeccion condicional de token: if (API_KEY) antes de agregar al request"
  - "Spread condicional en JSON body: ...(API_KEY ? { api_key: API_KEY } : {})"

requirements-completed: [SEC-03, SEC-05]

# Metrics
duration: 5min
completed: 2026-04-05
---

# Phase 06 Plan 02: Inyeccion Frontend de API Key Summary

**API key inyectada condicionalmente en apiGet (query param) y apiPost (body JSON) con 4 tests nuevos y warning D-09 en dev**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-05T18:21:58Z
- **Completed:** 2026-04-05T18:26:38Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- API_KEY exportada desde config/api.js leyendo import.meta.env.VITE_API_KEY
- apiGet agrega api_key como query param y apiPost lo incluye en body JSON, ambos condicionalmente
- Warning D-09 avisa en dev si la API esta habilitada pero falta VITE_API_KEY
- 4 tests nuevos cubren inyeccion de token en GET y POST (16 tests api.test.jsx, 59 total suite)

## Task Commits

Each task was committed atomically:

1. **Task 1: Exportar API_KEY en config/api.js y agregar warning D-09** - `34559e6` (feat)
2. **Task 2: Inyectar api_key en apiGet y apiPost de services/api.js** - `7c53bfb` (feat)
3. **Task 3: Ampliar tests de api.test.jsx para inyeccion de token SEC-03** - `86f86ac` (test)

## Files Created/Modified
- `src/config/api.js` - Exporta API_KEY + warning D-09 en dev si falta key
- `src/services/api.js` - Import API_KEY, inyeccion en apiGet (searchParams) y apiPost (body spread)
- `src/tests/api.test.jsx` - Mock actualizado con API_KEY, 4 tests nuevos de inyeccion de token
- `.env` - Agregada VITE_API_KEY (gitignored, no commiteada)

## Decisions Made
- api_key como query param en GET y body en POST para evitar CORS preflight que bloquea headers Authorization en Apps Script
- Guard condicional `if (API_KEY)` para no inyectar string vacio cuando la variable no esta configurada
- Warning D-09 usa `import.meta.env.DEV` nativo de Vite (true solo en npm run dev, eliminado en build)
- Tests usan mock estatico con key fija 'test-key-uuid-fake-12345' en vez de re-mock dinamico (evita problemas de ESM hoisting)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
**VITE_API_KEY debe configurarse como variable de entorno en Vercel** para produccion. En desarrollo local, se configura en `.env` (gitignored). El UUID real se genera y documenta en el deploy coordinado de Phase 06.

## Next Phase Readiness
- Frontend inyecta token en todos los requests a Apps Script
- Backend (Plan 01) valida el token en doGet/doPost
- Listo para deploy coordinado: configurar VITE_API_KEY en Vercel y re-deploy Apps Script
- Suite completa: 59 tests, 8 suites, 0 errores lint, build exitoso

## Self-Check: PASSED

- All 3 source files exist and verified
- All 3 task commits exist (34559e6, 7c53bfb, 86f86ac)
- SUMMARY.md created at expected path

---
*Phase: 06-seguridad-backend*
*Completed: 2026-04-05*
