# Fase 3 — Login + gate de auth + autorizacion por handler (SUMMARY)

**Rama:** `feat/auth-real-appsscript`
**Archivo tocado:** `apps-script/Código.js` (SOLO ese archivo)
**Estado:** completado, `node --check` OK. NO se ejecuto nada contra prod.

## Commits

| # | Hash | Mensaje |
|---|------|---------|
| A | `d275017` | feat: login real + gate de auth por token (Fase 3 parte A) |
| B | `0ee6942` | feat: autorizacion por handler con identidad del token (Fase 3 parte B) |

---

## Commit A — Login, gate y helpers

### `jsonError(message, code, reason)`
Ampliado con un tercer argumento OPCIONAL `reason`. Retrocompatible: si no se
pasa, la clave no aparece en el JSON y las llamadas viejas `jsonError(msg, code)`
no cambian. El frontend (Fase 5, ya implementada) clasifica por `code`+`reason`.

### `lookupProfesor_(profesorId)`
Lee PROFESORES resolviendo columnas POR CABECERA. Devuelve
`{id,nombre,email,activo,rol,salt,password_hash,must_change_password,token_version}`
o `null`. Uso interno del backend: incluye secretos que NUNCA salen al cliente.

### `handleLogin(body)` — case `login`, EXENTO del gate
- **Rate-limit / lockout por usuario** con CacheService (`loginfail_<usuario>`):
  el contador sube en CADA fallo, exista o no el usuario (anti-enumeracion,
  red-team bruteforce #5). Tras `LOGIN_MAX_FAILS` (5) bloquea `LOGIN_LOCKOUT_SEG`
  (15 min) con code 429 reason `lockout`.
- **Timing constante**: si el usuario no existe / esta inactivo, se ejecuta
  igualmente `verifyPassword_` contra un hash dummy (`dummyLoginHash_()`,
  calculado LAZY para no penalizar PBKDF2 a TODOS los requests — Apps Script
  re-evalua el modulo en cada ejecucion).
- **Mensaje generico** `'Usuario o contrasena incorrectos'`, code 401, reason
  `credentials`. Nunca distingue usuario inexistente / inactivo / password malo.
- **Exito**: `exp = floor(Date.now()/1000) + TTL_LOGIN_SEG` (8h, en SEGUNDOS).
  `token = signToken_({v:1, profesor_id:id, rol, exp, ver:token_version})`.
  Devuelve el contrato exacto que espera el frontend:
  `{token, profesor_id, rol, nombre, exp, must_change_password}`.
- `id = (usuario==='admin') ? 'prof-admin' : 'prof-'+usuario`; rol del campo de
  la hoja, normalizado `trim().toLowerCase()`.

### `handleCambiarPassword(body, identity)` — case `cambiarPassword`, requiere token
- Politica de la nueva password: `length >= 10`, no contiene el usuario (parte
  tras `prof-`), no termina en `2026` (invalida los `<username>2026` del git
  history). Errores 400 reason `weak_password`.
- Regenera `salt` (UUID) + `password_hash` con `PBKDF2_ITER`, pone
  `must_change_password=false` e **incrementa `token_version`** (revoca tokens
  viejos). Invalida la clave de re-check `authprof_<id>`. Escribe la fila con un
  solo `setValues`. Lock para evitar concurrencia.
- **Nota de contrato**: el body usa `nueva_password` (con fallback a `password`).
  El frontend de cambio de password (Fase 6, pendiente) debe enviar
  `{action:'cambiarPassword', nueva_password}` + token.

### `requireAuth_(token, roles)` — SIN fallback api_key
1. `validateToken_(token)` (firma + tipos + exp). Si null -> 401 `token_invalid`.
2. Re-check de la FUENTE DE VERDAD con cache corto 60s (`cacheGet` directo, no
   `cachedGet`, para no contaminar el indice `_keys`): el profesor debe existir y
   estar `activo`, y `Number(token_version)` de la hoja debe coincidir con
   `id.ver` (revocacion). Si no -> 401.
3. `rol` VIGENTE de la hoja (`trim().toLowerCase()`), NO el del token. Si se
   exigen `roles` y el rol no esta -> 403 `forbidden`.
4. Devuelve `{identity:{profesor_id, rol}}`.

**CRITICO (red-team bruteforce #1 / cripto #4):** el api_key NUNCA concede
identidad, rol ceo ni escritura. Solo `validateApiKey` decide acceso legacy de
solo-lectura no sensible, y se invoca SOLO desde el camino de coexistencia.

### Gate en `doGet` / `doPost` — `resolveAuth_(action, token, apiKey)`
- `ping` y `login` -> EXENTOS.
- Si hay token -> `requireAuth_(token, null)` (identidad real).
- Sin token: solo se admite legacy si la accion esta en
  `LEGACY_READONLY_ACTIONS = ['getConvocatorias']` (solo-lectura no sensible),
  validando el api_key. Para CUALQUIER otra accion (getAlumnos / getAsistencia /
  getResumen / getProfesores y TODOS los doPost de escritura) -> 401, se EXIGE
  token. Esto implementa la coexistencia de la seccion 4 del plan.
- `auth.identity` se propaga a cada handler.
- `cambiarPassword` se anadio al switch de `doPost`.

### Constantes nuevas
`TTL_LOGIN_SEG` (8h en seg), `LOGIN_MAX_FAILS` (5), `LOGIN_LOCKOUT_SEG` (900s),
`LOGIN_FAIL_PREFIX`, `DUMMY_LOGIN_SALT`, `LEGACY_READONLY_ACTIONS`.

---

## Commit B — Autorizacion por handler

### `ownsAlumno_(alumnoId, profesorId)`
Compara la columna `profesor_id` de la fila del alumno en ALUMNOS. NO usa
pertenencia por grupo (red-team bruteforce #8). Devuelve false si el alumno no
existe.

### Lecturas
- **getAlumnos / getAsistencia**: profesor EFECTIVO derivado del token. ceo
  respeta el filtro recibido; teacher se FUERZA a su `profesor_id` y un
  `profesor_id` ajeno -> 403. **cacheKey derivada de la identidad efectiva**, no
  de `e.parameter` (red-team bruteforce #3: evita leer la entrada global
  `alu_<conv>__` / `asist_<conv>___`). En getAsistencia, un teacher que consulta
  por `alumno_id` concreto debe ser dueno (ownsAlumno_). `todos=true` de
  getAlumnos restringido a ceo.
- **getResumen**: teacher SIN su propio `profesor_id` -> 403 (el resumen global,
  profesor vacio, queda reservado al ceo). cacheKey desde identidad efectiva.
  Coherente con `warmCache`, que calienta la clave global `res_<conv>__`: ahora
  solo el ceo la consume.
- **getProfesores**: saneo EN LA FUENTE antes de cachear (`projectProfesorPublico_`
  proyecta `{id,nombre,email,activo,rol}`) en AMBAS ramas. `?todos=true`
  restringido a ceo. Namespace de cache cambiado a `prof_v2` (invalida lo viejo,
  que cacheaba secretos). NUNCA devuelve password_hash / salt /
  must_change_password / token_version.

### Escrituras
- **guardarAsistencia**: IGNORA `body.profesor_id`, usa `identity.profesor_id`.
  Verifica que TODOS los `alumno_id` del payload pertenecen al profesor (mapa
  alumno->profesor leido UNA vez, no ownsAlumno_ por alumno). Alguno ajeno ->
  403. writeLog con identity.
- **justificarFalta**: teacher debe ser dueno del alumno (ownsAlumno_); ceo
  libre. Usa `identity.profesor_id` para el log.
- **crearAlumno**: teacher fuerza `profesor_id=identity`; ceo puede crear bajo
  cualquier profesor. writeLog con identity.
- **actualizarAlumno**: SOLO ceo (403 a teacher). writeLog con identity, no
  `body.usuario`.

---

## Desviaciones del plan

- **Hash dummy LAZY** (no constante a nivel de modulo). El plan lo pseudocodifica
  como constante; calcularlo en la carga del modulo penalizaria con ~10000
  iteraciones HMAC a TODOS los endpoints porque Apps Script re-evalua el script
  por request. Se calcula solo cuando el login lo necesita. Mantiene el timing
  constante DENTRO del login. (Rule 1/3 — correccion de rendimiento.)
- **Re-check de auth con `cacheGet` directo** en vez de `cachedGet`: evita meter
  claves `authprof_*` en el indice `_keys` (que es para invalidacion de
  resumenes). El TTL de 60s se respeta igual.
- **`crearAlumno` para ceo**: el plan solo especifica el caso teacher; se permite
  al ceo crear bajo cualquier `profesor_id` (o el suyo por defecto), coherente
  con su rol administrativo.

## Contrato pendiente para el frontend (Fase 6)
- `cambiarPassword` espera `{action:'cambiarPassword', nueva_password, token}`.
- La coexistencia legacy solo cubre `getConvocatorias`; el resto exige token. El
  frontend debe haber obtenido token (Fases 4-5, ya implementadas) antes de
  llamar a getAlumnos/getAsistencia/getResumen/getProfesores y a las escrituras.

## Verificacion
- `node --check apps-script/Código.js` -> OK tras ambos commits.
- Identificadores en ingles, comentarios en espanol (CLAUDE.md).
- Solo se modifico `apps-script/Código.js`. No se cambio de rama ni se uso worktree.
- NO se ejecuto nada contra prod (clasp no invocado).
