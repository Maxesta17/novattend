# Fases 4 y 5 — Auth Real Frontend: Modulo de Sesion + Inyeccion de Token

**Rama:** `feat/auth-real-appsscript`
**Commits:**
- `8dbe6fa` — feat: fase 4 -- modulo de sesion y hook useAuth
- `486bc07` — feat: fase 5 -- inyeccion de token y clasificacion de errores auth en api.js

---

## Objetivo

Implementar la infraestructura frontend de autenticacion real (Fases 4 y 5 del plan v1.2) de forma **aditiva**: sin romper el login actual (que sigue usando `users.js` hasta Fase 6).

---

## Archivos creados / modificados

| Archivo | Estado | Descripcion |
|---|---|---|
| `src/config/session.js` | NUEVO | Modulo de sesion: getSession/setSession/getToken/isExpired/clearSession |
| `src/hooks/useAuth.js` | NUEVO | Hook useAuth con login() para modo real y mock |
| `src/services/api.js` | MODIFICADO | Inyeccion de token + AuthError/PermissionError + loginRequest |

---

## Fase 4: `src/config/session.js` + `src/hooks/useAuth.js`

### session.js
- `getSession()` / `setSession(data)`: lectura/escritura en `sessionStorage['user']` con try/catch.
- `getToken()`: devuelve `session.token` o `null`.
- `isExpired()`: compara `Math.floor(Date.now() / 1000)` contra `session.exp` (en SEGUNDOS). Sin exp = expirado.
- `clearSession()`: elimina clave y emite `window.dispatchEvent(new Event('auth:expired'))`. Idempotente.
- **Sin importar nada de `api.js`** — evita ciclo de dependencias.

### useAuth.js
- `login(username, password)`: modo mock construye token con prefijo `mock-` + exp 8h en segundos; modo API real llama `loginRequest` via import dinamico.
- En mock, el token NUNCA llega al backend (guard `isApiEnabled()` en api.js).
- Persiste sesion via `setSession()` en login exitoso.
- Expone `{ login, loading, error }`.

---

## Fase 5: `src/services/api.js`

### Inyeccion de token (aditivo)
- `apiGet`: `if (token) url.searchParams.set('token', token)` — el `api_key` legacy coexiste sin cambios.
- `apiPost`: `...(token ? { token } : {})` en el body — igual que `api_key`, no interfiere si es null.
- Sin sesion activa (`token === null`), el comportamiento es **identico al anterior**.

### Clasificacion de errores por code numerico
- `throwApiError(json)`: lee `json.code` (numero) y `json.reason`. No usa regex de mensaje.
- `AuthError` (code 401): llama `clearSession()` + lanza error. Unicamente ante 401 de auth.
- `PermissionError` (code 403): lanza error SIN limpiar sesion.
- Timeout / error de red: `AbortError` nunca pasa por `throwApiError` — sesion intacta.

### loginRequest
- POST a `action: 'login'` con AbortController propio (10 segundos — coste PBKDF2).
- 401 en login NO llama `clearSession()` (no hay sesion que limpiar aun).
- AbortError se convierte en mensaje amigable en espanol.

---

## Verificacion

- `npm run lint` — 0 errores (warning pre-existente en `coverage/` no es del proyecto).
- `npm test` — **181 tests pasan, 29 suites**. Ningun test roto.
- Los tests de `api.test.jsx` verifican api_key legacy — siguen pasando porque el token es `null` cuando no hay sesion (jsdom no tiene sessionStorage con datos pre-cargados).

---

## Invariantes preservados

- El login actual via `users.js` (`LoginPage`) sigue funcionando sin cambios.
- `ProtectedRoute`, paginas, y hooks existentes no fueron tocados.
- La logica de fallback mock (sin `VITE_API_URL`) es completamente transparente.
- Los endpoints existentes (`getConvocatorias`, `guardarAsistencia`, etc.) no cambian su firma ni comportamiento cuando no hay token.

---

## Siguiente paso (Fase 6)

Conectar `LoginPage` con `useAuth`, migrar `role` → `rol`, y anadir el listener global `auth:expired` en `App.jsx`. Ver plan v1.2, Fase 6.
