# Hardening Auth Fase 3 — SUMMARY

**Rama:** `feat/auth-real-appsscript`
**Archivo tocado (unico):** `apps-script/Código.js`
**Commit:** `231af2b` — `fix: hardening de auth Fase 3 (must_change server-side, lockout durable, no cachear nulls)`
**Verificacion:** `node --check apps-script/Código.js` → OK.

Solo codigo, nada ejecutado contra prod. No se tocaron otros archivos ni la logica
de auth ya correcta (cacheKeys, ownsAlumno_, projectProfesorPublico_, autorizacion
por handler).

---

## Hallazgos arreglados

### IMPORTANTE-1 — must_change_password forzado en el BACKEND
- `requireAuth_`: ahora devuelve `identity.must_change_password` (valor VIGENTE de
  la hoja via `isTruthy(prof.must_change_password)`), ademas de `profesor_id` y `rol`.
- `resolveAuth_` (que conoce la `action`): tras `requireAuth_`, si
  `identity.must_change_password === true` Y `action !== 'cambiarPassword'` →
  devuelve `jsonError('Debe cambiar la contrasena antes de continuar', 403,
  'must_change_password')`. `login`/`ping` ya salen exentos antes.
- Verificado: la accion `cambiarPassword` EXISTE como case en `doPost` (L~1251) y NO
  esta exenta del gate (solo `ping`/`login` lo estan), por lo que un usuario con
  `must_change` llega a ella con su token. `handleCambiarPassword` no re-bloquea por
  el flag; solo valida la politica de la nueva password.
- Resultado: un token temporal (password expuesta en git history) solo sirve para
  cambiar la contrasena; cualquier otra accion rebota 403.

### IMPORTANTE-2 — Lockout de login DURABLE
- Reemplazado el contador solo-CacheService por estado durable en
  `PropertiesService.getScriptProperties()`, clave `loginfail_<usuario>`, valor JSON
  `{ count, until }` (`until` = epoch ms de fin de lockout).
- Nuevos helpers: `loginFailState_` (lee Properties, con cache rapido delante),
  `loginIsLocked_` (`now < until`), `loginRegisterFail_` (incrementa count; al llegar
  a `LOGIN_MAX_FAILS=5` fija `until = now + 15min`), `loginClearFail_` (limpia
  Properties + cache en login OK). Eliminado el viejo `loginFailCount_`.
- `handleLogin`: el chequeo de bloqueo usa `loginIsLocked_`; el incremento sigue
  ocurriendo en CADA fallo (exista o no el usuario, anti-enumeracion), con el
  `verifyPassword_` contra hash dummy intacto; el login OK usa `loginClearFail_`.
- CacheService se mantiene como cache de lectura rapida; la fuente de verdad es
  durable (no evictable). Cuota irrelevante (11 usuarios).

### IMPORTANTE-3 — requireAuth_ no cachea nulls
- Sustituido `cacheGet('authprof_'+id, ()=>lookupProfesor_(id), 60)` por lectura
  manual del cache (`cache_.get`): si hay valor cacheado se parsea; si no, se llama
  a `lookupProfesor_` y SOLO se cachea (60s) cuando el resultado es truthy. Un `null`
  ya no se cachea, asi que un profesor recien creado/reactivado no rebota 401 hasta
  60s. Se mantiene sin usar `cachedGet` (no contamina el indice `_keys`).

### OPCIONAL-1 — guardarAsistencia valida array
- En `handleGuardarAsistencia`, el guard `!alumnos` se separo y se anadio, antes de
  iterar: `if (!Array.isArray(alumnos) || alumnos.length === 0) → jsonError('alumnos
  debe ser una lista no vacia', 400)`. Evita que `{}` u objetos raros pasen, y que un
  array vacio supere el ownership trivialmente sin guardar nada.

### OPCIONAL-2 — validateToken_ valida tipo de ver
- Anadido, antes del return: `if (typeof pl.ver !== 'number') return null;`
  (defensa en profundidad para el re-check `Number(prof.token_version) !==
  Number(id.ver)`).

---

## Fuera de alcance (no tocado)
- `cacheKeys` / derivacion de cacheKey por identidad — ya correcto.
- `ownsAlumno_`, `projectProfesorPublico_`, autorizacion por handler — sin cambios.
- Ningun otro archivo (frontend, hoja, deploy).

## Notas
- Identificadores en ingles, comentarios en espanol (CLAUDE.md).
- Nada ejecutado contra prod; pendiente de `clasp push` + `clasp version` +
  `clasp redeploy` cuando se decida desplegar (fuera de este alcance).
