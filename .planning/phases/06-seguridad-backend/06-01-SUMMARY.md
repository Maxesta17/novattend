---
phase: 06-seguridad-backend
plan: 01
subsystem: api
tags: [google-apps-script, shared-secret, api-key, PropertiesService, security]

# Dependency graph
requires:
  - phase: none
    provides: none (primer plan de seguridad backend)
provides:
  - validateApiKey() helper en Codigo.js que rechaza requests sin token valido
  - setApiKey() y checkApiKey() funciones de configuracion manual
  - Documento de deploy 3-capas y rotacion de key
affects: [06-02 (frontend debe inyectar api_key en requests)]

# Tech tracking
tech-stack:
  added: [PropertiesService (Google Apps Script nativa)]
  patterns: [shared-secret validation antes del switch en doGet/doPost, console.warn para rechazos auth]

key-files:
  created:
    - docs/deploy-sec-06.md
  modified:
    - apps-script/Código.js
    - eslint.config.js

key-decisions:
  - "IP omitida de console.warn AUTH_REJECTED — disponibilidad de x-forwarded-for no confirmada en Apps Script"
  - "Nombre de Script Property: API_KEY — simple y descriptivo"
  - "apps-script/ excluido de ESLint — usa globals de Google Apps Script no disponibles en browser"

patterns-established:
  - "Validacion centralizada: validateApiKey() se llama antes del switch en doGet/doPost, no dentro de cada case"
  - "Secretos server-side: PropertiesService.getScriptProperties() para almacenar API_KEY"
  - "Funciones de setup manual: setApiKey()/checkApiKey() para configurar sin tocar Script Properties directamente"

requirements-completed: [SEC-01, SEC-02, SEC-04, SEC-06]

# Metrics
duration: 4min
completed: 2026-04-05
---

# Phase 06 Plan 01: Seguridad Backend Summary

**Validacion shared secret en Apps Script con PropertiesService — doGet/doPost rechazan requests sin api_key valido antes de ejecutar cualquier action**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-05T18:22:07Z
- **Completed:** 2026-04-05T18:26:08Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- doGet y doPost validan api_key ANTES de ejecutar cualquier action via validateApiKey() helper
- API key se lee de PropertiesService.getScriptProperties() — no hardcodeada en el codigo
- Documento completo de deploy 3-capas (Apps Script -> .env -> Vercel) con procedimiento de rotacion

## Task Commits

Each task was committed atomically:

1. **Task 1: Implementar validateApiKey y funciones de setup en Codigo.js** - `0d48feb` (feat)
2. **Task 2: Crear documento de deploy y rotacion de key** - `496c1ae` (docs)

## Files Created/Modified
- `apps-script/Código.js` - validateApiKey() helper + integracion en doGet/doPost + setApiKey/checkApiKey
- `docs/deploy-sec-06.md` - Procedimiento paso-a-paso de deploy 3-capas y rotacion de key
- `eslint.config.js` - Excluir apps-script/ de ESLint (globals Google Apps Script)

## Decisions Made
- IP omitida de console.warn AUTH_REJECTED: la investigacion (06-RESEARCH.md Open Questions #3) indica que `e.parameter['x-forwarded-for']` puede no estar disponible. Se registra timestamp + action. Si se confirma disponibilidad de IP, se puede agregar.
- apps-script/ excluido de ESLint: el directorio usa globals de Google Apps Script (SpreadsheetApp, CacheService, etc.) que no existen en browser/node. Agregar a globalIgnores evita 45 errores falsos.
- Nombre de Script Property: `API_KEY` — simple y sin ambiguedad.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Excluir apps-script/ de ESLint globalIgnores**
- **Found during:** Task 1 (validacion lint)
- **Issue:** Al agregar apps-script/Codigo.js al repo, ESLint reporta 45 errores por globals de Google Apps Script (SpreadsheetApp, CacheService, PropertiesService, etc.) no definidos en browser
- **Fix:** Agregar 'apps-script' a globalIgnores en eslint.config.js
- **Files modified:** eslint.config.js
- **Verification:** `npm run lint` pasa con 0 errores (1 warning pre-existente)
- **Committed in:** 0d48feb (parte del commit de Task 1)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necesario para que lint pase. Sin impacto en scope.

## Issues Encountered
None

## User Setup Required

El deploy de seguridad requiere configuracion manual de 3 capas. Ver `docs/deploy-sec-06.md` para:
- Generar UUID v4 y configurar Script Property en Apps Script
- Agregar VITE_API_KEY a .env local y Vercel
- Deploy de Apps Script y frontend en orden correcto
- Procedimiento de rotacion de key si se compromete

## Known Stubs
None - todo el codigo es funcional y listo para produccion tras el setup manual.

## Next Phase Readiness
- Backend listo para rechazar requests sin token
- Plan 06-02 (frontend) puede proceder: inyectar api_key en apiGet/apiPost de src/services/api.js
- Requiere que el dev ejecute el procedimiento de docs/deploy-sec-06.md tras completar 06-02

---
## Self-Check: PASSED

- FOUND: apps-script/Código.js
- FOUND: docs/deploy-sec-06.md
- FOUND: eslint.config.js
- FOUND: commit 0d48feb
- FOUND: commit 496c1ae

---
*Phase: 06-seguridad-backend*
*Completed: 2026-04-05*
