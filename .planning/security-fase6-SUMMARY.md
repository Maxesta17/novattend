# FASE 6 — Frontend: consumir auth real — SUMMARY

**Branch:** `feat/auth-real-appsscript`
**Alcance:** solo `src/` + `index.html`. CODIGO SOLO (sin deploy, sin tocar `apps-script/`).
**Estado:** completado. `npm test` y `npm run lint` en verde.

## One-liner

LoginPage deja de validar credenciales en cliente (`users.js` fuera del bundle) y consume `useAuth().login` real; sesion gestionada por `rol` con compat a `role`, cambio de password forzado (`must_change_password`), redireccion global por `auth:expired` deduplicada, y `meta referrer=no-referrer` para no filtrar el token.

## Commits (3 atomicos)

| # | Hash | Mensaje |
|---|------|---------|
| 1 | `87dadf5` | feat: login consume auth real + cambio password forzado |
| 2 | `7e24174` | feat: migracion role->rol, guard por sesion y manejo de sesion expirada |
| 3 | `b6e90a7` | feat: elimina users.js de prod, referrer no-referrer y ajusta tests |

## Cambios por item del encargo

1. **LoginPage** (`src/pages/LoginPage.jsx`): elimina `import USERS` y el matching client-side. Usa `useAuth().login(username, password)`. Ramifica por `sess.rol ?? sess.role` (ceo→`/dashboard`; teacher→`getConvocatorias` con timeout 8s → `/attendance` o `/convocatorias`). Errores diferenciados: 401 credenciales → "Usuario o contraseña incorrectos"; 401 `reason='lockout'` → mensaje de bloqueo; red/timeout → mensaje distinto; 403 → "Acceso no permitido".

2. **Cambio de password forzado** (`src/components/features/ChangePasswordForm.jsx`): si el login devuelve `must_change_password:true`, no se navega; se muestra el formulario dentro de LoginPage. Llama `cambiarPassword(nueva)` (nuevo export en `api.js`, `apiPost('cambiarPassword',{nueva_password})`). Tras OK: limpia sesion y vuelve al login con "Contraseña actualizada, inicia sesión con tu nueva contraseña". Validacion de cliente para UX (`passwordPolicy.js`: len>=10, no contiene usuario, no termina en 2026); el backend es la autoridad.

3. **Rename `role`→`rol` ATOMICO** (commit 2): migrados ProtectedRoute, AttendancePage, App/AuthExpiredListener no aplica, DashboardPage (logout). Compat `session.rol ?? session.role` en todos los lectores para no romper sesiones en transicion.

4. **ProtectedRoute** (`src/components/ProtectedRoute.jsx`): lee `getSession()`, expulsa si no hay sesion, si hay token y `isExpired()`, o si el rol no coincide. Sigue siendo guard de UI (autoridad = backend).

5. **App.jsx** + **AuthExpiredListener** (`src/components/AuthExpiredListener.jsx`): listener global de `auth:expired` → `navigate('/',{state:{expired:true}})` deduplicado con `useRef` (varios 401 en paralelo no disparan N navegaciones). LoginPage lee `location.state.expired` y muestra "Tu sesión expiró, vuelve a entrar".

6. **DashboardPage / useDashboard** (`src/hooks/useDashboard.js`): un `AuthError` (401) de `getProfesores`/`getResumen` se trata como sesion expirada (el listener redirige), NO como pantalla de "sin datos"/error.

7. **users.js**: eliminado de produccion (`src/config/users.js` borrado; nadie lo importaba ya). Fixture mock sin passwords en `src/tests/fixtures/users.js`. Modo mock sigue funcionando: `useAuth.buildMockSession` acepta cualquier credencial y deriva `rol` por `username==='admin'`.

8. **index.html**: añadido `<meta name="referrer" content="no-referrer">` en `<head>`.

9. **PWA / SW**: `vite.config.js` ya tenia `skipWaiting:true` + `clientsClaim:true` (Fase 5). El bundle nuevo trata una sesion sin token como invalida: `ProtectedRoute` exige `rol` y, si hay token, `exp` vigente; `getSession()` devuelve el objeto crudo y los lectores usan compat.

## Separacion logout vs sesion expirada (decision)

`session.js` ahora expone dos funciones:
- **`logout()`** — limpia sesion SIN evento. Uso: cierre de sesion intencional (botones de logout, post-cambio de password).
- **`clearSession()`** — limpia sesion Y emite `auth:expired`. Uso: revocacion/expiracion detectada en un 401 (lo invoca `api.js`).

Esto evita que un logout intencional (o el flujo post-cambio de password) muestre "Tu sesión expiró".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Separacion logout/clearSession para evitar mensaje de expiracion erroneo**
- **Found during:** Tarea 2 (logout de paginas) y flujo post-cambio de password.
- **Issue:** El encargo proponia usar `clearSession()` tanto en logout como tras el cambio de password. Pero `clearSession()` emite `auth:expired`, que dispara el `AuthExpiredListener` y navega a `/` con `{expired:true}` mostrando "Tu sesión expiró" — UX incorrecta para un cierre de sesion voluntario o un cambio de password exitoso (ademas de competir con el mensaje de exito).
- **Fix:** Añadida `logout()` (sin evento) en `session.js`; logout de AttendancePage/DashboardPage y `ChangePasswordForm.onSuccess` la usan. `clearSession()` queda reservada al 401 real (api.js).
- **Files modified:** `src/config/session.js`, `src/pages/AttendancePage.jsx`, `src/pages/DashboardPage.jsx`, `src/components/features/ChangePasswordForm.jsx`.
- **Commit:** `7e24174` (y ajuste del import en ChangePasswordForm).

**2. [Rule 2 - Critico] Tests nuevos para modulos sin cobertura**
- Añadidos `passwordPolicy.test.jsx` y `session.test.jsx` para cubrir la nueva logica de politica de password y la distincion logout/clearSession (la regresion mas peligrosa de esta fase).
- **Commit:** `b6e90a7`.

### Refactor menor (DRY)

Extraido `PasswordInput` (ui) reutilizado por LoginPage y ChangePasswordForm, evitando duplicar el toggle mostrar/ocultar y manteniendo ambos archivos < 250 lineas.

## CLAUDE.md compliance

- Cero estilos inline: todo con tokens Tailwind. Verificado.
- Archivos < 250 lineas: LoginPage 214, ChangePasswordForm ~90, PasswordInput 42, AuthExpiredListener ~32, passwordPolicy 38. OK.
- UI/comentarios en español, codigo en ingles. OK.
- `apps-script/` intacto. Sin deploy.

## Known Stubs

Ninguno funcional. En modo mock (`isApiEnabled()===false`) el login acepta cualquier credencial por diseño (desarrollo sin backend); `useAuth.buildMockSession` ya existia (Fase 4). No es un stub que bloquee el objetivo: en produccion `VITE_API_URL` esta definida y se usa el login real.

## Threat Flags

Ninguna nueva superficie introducida en frontend. El token viaja por el mismo canal definido en Fase 5 (query en GET, body en POST). `meta referrer=no-referrer` reduce la fuga del token por `Referer`.

## Verificacion

- `npm test`: **198 passed / 198** (31 suites).
- `npm run lint`: **0 errores** (1 warning en `coverage/block-navigation.js`, artefacto generado y gitignored, fuera de alcance).
- `npm run build`: OK. Bundle de prod NO contiene `*2026`/`lingnova2026` (passwords verificados ausentes). `index.html` build incluye el `meta referrer`.

## Self-Check: PASSED

- Archivos creados presentes: PasswordInput, ChangePasswordForm, AuthExpiredListener, passwordPolicy, fixtures/users — todos FOUND.
- `src/config/users.js` REMOVED.
- Commits `87dadf5`, `7e24174`, `b6e90a7` presentes en el log.
