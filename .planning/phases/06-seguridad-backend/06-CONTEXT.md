# Phase 6: Seguridad Backend - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

El endpoint de Google Apps Script rechaza cualquier request sin token valido, con el shared secret almacenado fuera del codigo fuente y el token inyectado transparentemente por api.js. Cubre SEC-01 a SEC-06.

</domain>

<decisions>
## Implementation Decisions

### Mecanismo de token (prior decision)
- **D-01:** Token via **query param** (`?api_key=`) en GET y campo en **body** en POST. Headers Authorization provocan CORS preflight fatal en Apps Script — descartado (decision de STATE.md).
- **D-02:** API key almacenada en **Script Properties** server-side (SEC-02) y en **VITE_API_KEY** (.env + Vercel) client-side (SEC-05).
- **D-03:** Formato del API key: **UUID v4** (ej: `550e8400-e29b-41d4-a716-446655440000`). Generado manualmente por el dev.

### Estrategia de rollout
- **D-04:** **Corte duro** — sin periodo de gracia. Deploy en orden: 1) Apps Script (validacion + key en Script Properties) → 2) VITE_API_KEY en .env y Vercel → 3) Redeploy frontend. Downtime breve (<5 min) aceptable para 8 usuarios internos.
- **D-05:** Documentar el paso-a-paso de deploy como parte del plan para que el dev lo ejecute manualmente.

### Logging de rechazos
- **D-06:** Requests rechazados se registran solo con **console.warn** en Apps Script (visible en Stackdriver/Cloud Logging). La hoja LOG se reserva para acciones legitimas de negocio.
- **D-07:** Datos en el console.warn: **timestamp + action + IP** del request. Formato: `console.warn('AUTH_REJECTED', { action, ip, timestamp })`.

### Modo mock/local
- **D-08:** Si `isApiEnabled()` es false (no hay VITE_API_URL), el token se **ignora completamente**. No se inyecta, no se valida. El flujo mock sigue igual que hoy.
- **D-09:** Si hay VITE_API_URL pero NO hay VITE_API_KEY: **console.warn** en desarrollo avisando que falta la key. Los requests salen sin token y el backend los rechazara. No rompe el build.

### Rotacion de key
- **D-10:** Rotacion **manual sin automatizar**. Si se compromete: generar nuevo UUID, actualizar Script Properties, actualizar Vercel env, redeploy. Documentar como procedimiento en el plan.

### Claude's Discretion
- Ubicacion exacta del check de validacion en doGet/doPost (funcion helper vs inline)
- Nombre de la Script Property para el API key (ej: `API_KEY`, `AUTH_TOKEN`)
- Estructura exacta del JSON de error 401-equivalente
- Orden de modificacion de archivos dentro de cada plan

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — SEC-01..SEC-06: validacion shared secret, Script Properties, inyeccion token, error 401, VITE_API_KEY, logging rechazos

### Backend actual
- `apps-script/Codigo.js` — doGet/doPost actuales sin auth, jsonResponse/jsonError helpers, writeLog, CacheService
- `apps-script/appsscript.json` — Manifest: V8 runtime, Europe/Madrid timezone, ANYONE_ANONYMOUS access

### Frontend actual
- `src/services/api.js` — apiGet/apiPost base functions donde se inyectara el token
- `src/config/api.js` — API_URL + isApiEnabled(), donde se exportara API_KEY

### Integraciones
- `.planning/codebase/INTEGRATIONS.md` — Mapa completo de endpoints, auth actual (ninguna), env vars, deploy

### Decisiones previas
- `.planning/STATE.md` — "Token via query param GET, body POST — Authorization headers provocan CORS preflight fatal"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `jsonError(message, code)` en Codigo.js: helper de respuesta de error ya existente — reutilizar para respuestas 401-equiv
- `writeLog(usuario, accion, detalle)` en Codigo.js: helper de logging a hoja LOG — NO usar para rechazos (decision D-06)
- `isApiEnabled()` en config/api.js: guard existente que controla si hay API — extender logica para API key

### Established Patterns
- `apiGet(action, params)` y `apiPost(action, body)` son los dos unicos puntos de entrada a la API — la inyeccion de token se centraliza aqui
- Todas las funciones de api.js devuelven `null` si `isApiEnabled()` es false — el token sigue esta misma guarda
- `import.meta.env.VITE_*` para variables de entorno en Vite — patron ya establecido con VITE_API_URL

### Integration Points
- `apps-script/Codigo.js` doGet/doPost — agregar validacion de token antes del switch de actions
- `src/services/api.js` apiGet/apiPost — inyectar token en params/body
- `src/config/api.js` — exportar API_KEY desde VITE_API_KEY
- `.env` — agregar VITE_API_KEY
- Vercel — configurar VITE_API_KEY en Environment Variables
- Apps Script — configurar API key en Script Properties via editor

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. El foco es que sea simple, funcional y documentado para que el dev pueda ejecutar el deploy manualmente.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-seguridad-backend*
*Context gathered: 2026-04-05*
