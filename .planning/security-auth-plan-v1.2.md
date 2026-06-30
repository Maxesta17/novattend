I have enough verified context. The mapas, diseños and red-team are detailed and I've confirmed the key load-bearing facts directly: `validateApiKey` (L294-304) is the single gate, identity comes from `e.parameter`/body, `handleGetProfesores` (L361-371) has two unsanitized paths including `?todos=true`, and `api.js` injects `api_key` via query (L21) and body (L52). Now I'll synthesize the implementation plan.

---

# PLAN DE IMPLEMENTACION — Opcion A: Auth Real en Apps Script (NovAttend v1.2)

**SOLO DISEÑO.** Nada se edita hasta tu aprobacion. Verificado contra los archivos reales.

---

## 1) Resumen del enfoque

Reemplazar el unico `API_KEY` compartido (`validateApiKey` L294-304) por **autenticacion real**: el login valida credenciales contra la hoja `PROFESORES` (passwords con PBKDF2-HMAC-SHA256 + salt por usuario), emite un **token de sesion firmado con HMAC-SHA256** (`{profesor_id, rol, exp, v, ver}`), y **cada handler deriva identidad+rol DEL TOKEN**, nunca del body/query. El token viaja por el mismo canal que hoy el `api_key` (query en GET, body en POST — jamas en header, por el preflight CORS). El backend autoriza por propiedad real (un teacher solo lee/escribe SUS alumnos; el CEO ve global). El frontend deja de conocer passwords y de fabricar `prof-${username}`. Los fixes del red-team estan **integrados en el diseño** (no como apendice): se elimina el peligroso fallback `api_key→ceo`, se fuerza cambio de passwords publicos, se sanea `getProfesores` en la fuente antes de cachear, se re-valida `activo`/rol/version por request cacheado, y se fija una unica unidad de `exp`.

---

## 2) Modelo de amenaza cubierto

| Amenaza original | Cierre | Residual aceptado |
|---|---|---|
| **(a) Passwords en claro en bundle + login client-side** (`users.js`, `LoginPage` L22-31) | **CERRADO.** Login pasa a red contra hash en backend; `users.js` sale del bundle de prod. | Passwords `<username>2026` siguen en git history → **se invalidan** generando passwords nuevos en la migracion + `must_change_password` bloqueante. |
| **(b) Identidad fabricada / IDOR** (`prof-${username}` AttendancePage L36; handlers confian en `e.parameter.profesor_id`/body) | **CERRADO.** Identidad y rol derivan del token firmado; ownership por-alumno en escrituras; `getResumen` global reservado a `ceo`; `actualizarAlumno` solo `ceo`. | Token vive hasta `exp` aunque se desactive al profesor → mitigado con re-check de `activo`+`token_version` (TTL corto) en handlers sensibles. |
| **(c) `ProtectedRoute` confia en `user.role` sin firma** (L9-17) | **PARCIAL por diseño.** El guard cliente sigue siendo solo-UX (inevitable en SPA); la **autoridad real es el backend** que rechaza tokens forjados. | Render efimero de pagina protegida con sesion fabricada → sin token valido no obtiene datos y el primer fetch lo expulsa. |

**Riesgos estructurales declarados (no resolubles en plataforma):**
- `SESSION_SECRET` vive en ScriptProperties → cualquier **editor del proyecto Apps Script** puede leerlo y forjar tokens `ceo`. **Mitigacion bloqueante:** Aurora debe tener acceso al **Sheet (datos)** pero NO al **proyecto de script**. Documentar que todo editor del script es de-facto superadmin.
- Token en query (GET) aparece en logs de Apps Script. Mitigado con `exp` corto + `Referrer-Policy: no-referrer`.
- PBKDF2 manual no es bcrypt. Aceptable para 8 usuarios internos SOLO con passwords fuertes (condicionado a `must_change_password`).

---

## 3) Fases de implementacion

> Frontera marcada por icono: **[HOJA]** Google Sheets · **[BE]** apps-script/Código.js · **[FE]** src/ · **[DEPLOY]** clasp/Vercel.

### FASE 0 — Precondiciones y decisiones (sin codigo) · **[HOJA/DEPLOY]**
**Objetivo:** desbloquear ambiguedades antes de tocar nada.
- Resolver las decisiones de la seccion 5 (exp, CEO en PROFESORES, lista real de profesores, coexistencia).
- `clasp deployments` → anotar el `deployId` real (@17) y **verificar que coincide con el host de `VITE_API_URL`** (red-team deploy #8). Si `VITE_API_URL` resuelve a `/exec` (latest) en vez de un deployId fijo, aclarar a que apunta.
- Separar permisos: confirmar que Aurora NO es editor del proyecto Apps Script.
**Verificacion:** las 7 open-questions tienen respuesta escrita; `deployId` confirmado contra `VITE_API_URL`.

---

### FASE 1 — Primitivas cripto en backend · **[BE]**
**Objetivo:** hashing, firma y validacion de token, sin tocar aun los handlers.
**Archivos:** `apps-script/Código.js` (funciones nuevas junto a `setApiKey` L1319).

Pasos (pseudocodigo):
```js
// Comparacion en tiempo constante (sin early-return por longitud; hashear ambos lados)
function constantEq_(a, b){
  var ha = Utilities.computeDigest(SHA_256, a), hb = Utilities.computeDigest(SHA_256, b)
  var r = 0; for (var i=0;i<ha.length;i++) r |= ha[i]^hb[i]; return r===0
}
// PBKDF2 manual (N iteraciones HMAC-SHA256). N a fijar midiendo latencia (Fase 0).
function pbkdf2_(pwd, salt, iter){
  var b = Utilities.newBlob(salt+pwd).getBytes()
  for (var i=0;i<iter;i++) b = Utilities.computeHmacSha256Signature(b, salt)
  return Utilities.base64Encode(b)
}
function verifyPassword_(plain, salt, storedHash, iter){
  if (!salt || !storedHash) return false              // red-team deploy #6: rechazo explicito
  return constantEq_(pbkdf2_(plain, salt, iter), storedHash)
}
// Token: payload.exp en SEGUNDOS (red-team cripto #9). v=version esquema, ver=token_version global.
function signToken_(payload){
  var sec = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET')
  if (!sec || sec === 'REEMPLAZAR') throw new Error('SESSION_SECRET no configurado')
  var p = Utilities.base64EncodeWebSafe(JSON.stringify(payload))
  return p + '.' + Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature('novattend.v1.'+p, sec))
}
function validateToken_(token){
  if (!token || typeof token!=='string') return null
  var parts = token.split('.'); if (parts.length!==2) return null
  var sec = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET')
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature('novattend.v1.'+parts[0], sec))
  if (!constantEq_(sig, parts[1])) return null
  var pl; try { pl = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString()) } catch(e){ return null }
  // Validacion ESTRICTA de tipos (red-team cripto #1): forja alg=none / campos arbitrarios
  if (pl.v !== 1) return null
  if (typeof pl.profesor_id!=='string' || !/^prof-[a-z0-9._-]+$/.test(pl.profesor_id)) return null
  if (pl.rol!=='teacher' && pl.rol!=='ceo') return null
  var now = Math.floor(Date.now()/1000)
  if (typeof pl.exp!=='number' || pl.exp<=now || pl.exp > now + MAX_TTL_SEG) return null
  return { profesor_id: pl.profesor_id, rol: pl.rol, ver: pl.ver }
}
function setSessionSecret(){ /* idempotente: si ya existe y !=placeholder, NO regenerar (red-team deploy #5) */ }
```
**Verificacion:** test manual desde editor — `validateToken_(signToken_({v:1,profesor_id:'prof-x',rol:'teacher',exp:now+3600,ver:1}))` devuelve la identidad; un token con `exp` pasado, firma alterada, o `rol:'admin'` devuelve `null`.

---

### FASE 2 — Esquema PROFESORES + migracion de credenciales · **[HOJA] + [BE]**
**Objetivo:** columnas nuevas y credenciales hasheadas, con CEO incluido.
**Archivos:** `apps-script/Código.js` (`setupSheets` L1196; nueva `migrarPasswordsProfesores`), hoja PROFESORES (owner).

Pasos:
1. **[BE]** Nuevo esquema, columnas **AL FINAL** (los indices posicionales `data[i][0/1/3]` de `Gestion convocatorias.js` no se rompen):
   ```js
   'PROFESORES': ['id','nombre','email','activo','password_hash','salt','rol','must_change_password','token_version']
   ```
2. **[HOJA]** ALTER manual de cabeceras E1..I1 por **owner** (preferido sobre re-ejecutar `setupSheets` para no disparar el alert UI ni re-tocar validaciones — red-team deploy #6).
3. **[BE]** `migrarPasswordsProfesores()` (ejecutable una vez desde editor, NO via web):
   - **NO copiar los `<username>2026`** (red-team cripto #5 / deploy #3): genera **password temporal aleatorio** por profesor, `salt=Utilities.getUuid()`, `password_hash=pbkdf2_(tempPwd,salt,N)`, `must_change_password=true`, `token_version=1`, `rol` segun mapa.
   - Crea fila CEO si no existe (`id='prof-admin'`, `rol='ceo'`, sin grupos) — **paso verificado e independiente** (red-team deploy #4).
   - Devuelve/loguea los passwords temporales para comunicarlos **fuera de banda**; **no** los deja en el codigo.
   - Check de integridad: aborta si alguna fila activa queda con `salt`/`password_hash` vacios.
4. **[BE]** Normalizar `rol` al leer: `String(rol).trim().toLowerCase()`, validar contra `{teacher,ceo}`.
**Verificacion:** toda fila activa tiene `password_hash/salt/rol/token_version` no vacios; existe fila CEO; ningun password real embebido en el codigo tras correr.

---

### FASE 3 — Login, gate y autorizacion por handler · **[BE]**
**Objetivo:** el corazon de la auth. Identidad del token en cada handler.
**Archivos:** `apps-script/Código.js` (`doGet` L310, `doPost` L689, handlers L361/L376/L410/L457/L732/L891/L1001/L1060).

Pasos:
1. **`handleLogin(body)`** (case en `doPost`, **exento de gate**):
   - Rate-limit por-usuario **y global** en CacheService + persistido en hoja (`login_fail`/`lockout_until`) para sobrevivir a eviccion (red-team bruteforce #2).
   - Incrementa el contador **siempre que falle, exista o no el usuario** (anti-enumeracion, red-team bruteforce #5); ejecuta `verifyPassword_` contra hash dummy si no existe (timing).
   - Mensaje generico `'Usuario o contrasena incorrectos'`, code 401, `reason:'credentials'`.
   - Si OK: `signToken_({v:1, profesor_id, rol, exp: now+TTL, ver: token_version})`; devuelve `{token, profesor_id, rol, nombre, exp, must_change_password}`.
2. **`handleCambiarPassword(body, identity)`**: regenera salt+hash con politica (len>=10, no contiene username, no termina en `2026`), limpia `must_change_password`, **incrementa `token_version`** (revoca tokens viejos).
3. **`requireAuth_(token, roles)`** — **SIN fallback a api_key que conceda ceo** (red-team cripto #4 / bruteforce #1, **critico**):
   ```js
   function requireAuth_(token, roles){
     var id = validateToken_(token); if (!id) return { error: jsonError('No autorizado',401,'token_invalid') }
     // Re-check fuente de verdad (TTL corto, red-team bruteforce #7):
     var prof = cachedGet('authprof_'+id.profesor_id, ()=>lookupProfesor_(id.profesor_id), 60)
     if (!prof || !isTruthy(prof.activo)) return { error: jsonError('No autorizado',401,'token_invalid') }
     if (Number(prof.token_version) !== Number(id.ver)) return { error: jsonError('No autorizado',401,'token_invalid') }
     var rol = String(prof.rol).trim().toLowerCase()           // rol VIGENTE de la hoja, no del token
     if (roles && roles.indexOf(rol)===-1) return { error: jsonError('Permiso denegado',403,'forbidden') }
     return { identity: { profesor_id: id.profesor_id, rol } }
   }
   ```
4. **`doGet`/`doPost`:** reemplazar `validateApiKey` por `requireAuth_`; `ping` y `login` exentos; propagar `auth.identity` a cada handler.
5. **Autorizacion por handler:**
   - `getAlumnos`/`getAsistencia`: si `rol!=='ceo'`, **forzar** `profesorId=identity.profesor_id`; rechazar 403 si llega un `profesor_id` distinto **o vacio** para teacher. **Derivar la `cacheKey` de la identidad efectiva, no de `e.parameter`** (red-team bruteforce #3, critico — evita leer la entrada global `res_<conv>__`).
   - `getResumen`: teacher sin `profesor_id` → 403 (no global); ceo → global permitido.
   - `guardarAsistencia`: ignorar `body.profesor_id`; usar `identity.profesor_id`. Verificar que **TODOS** los `alumno_id` del payload pertenecen al profesor (no basta uno — red-team bruteforce #4). LOG con `identity.profesor_id`.
   - `justificarFalta`: verificar `alumno_id+convocatoria_id` pertenece al profesor; ceo libre. LOG con identity.
   - `crearAlumno`: teacher fuerza `profesor_id=identity.profesor_id`.
   - `actualizarAlumno`: **solo `ceo`** (403 a teacher). LOG con identity, no `body.usuario`.
6. **`handleGetProfesores` saneado EN LA FUENTE antes de cachear** (red-team cripto #10 / deploy #1, #2): proyectar `{id,nombre,email,activo,rol}` dentro de la `fetchFn` de `cachedGet`, en **ambas** ramas (`?todos=true` y cacheada). Idealmente **eliminar `?todos=true`** o restringirla a `ceo`. Cambiar el namespace de cache a `'prof_v2'` para invalidar lo viejo.
**Verificacion:** ver checklist Fase 8.

---

### FASE 4 — Modulo de sesion + hook de auth · **[FE]**
**Objetivo:** centralizar token/sesion sin engordar `LoginPage` (limite 250 lineas).
**Archivos:** NUEVO `src/config/session.js`, NUEVO `src/hooks/useAuth.js`.
- `session.js`: `getSession/setSession/getToken/isExpired/clearSession`. **`exp` en segundos** (coherente con backend — red-team cripto #9 / frontend #3). `clearSession` emite `window.dispatchEvent(new Event('auth:expired'))`, idempotente. **Sin importar nada de `api.js`** (red-team frontend #9, evita ciclo).
- `useAuth.js`: `login(user,pwd)` → API real `loginRequest`; modo mock construye token falso con prefijo reconocible (`mock-`) que **nunca** se envia si `isApiEnabled()` (red-team frontend #10). Diferencia error 401-credenciales de error de red.
**Verificacion:** test de humo `getToken()` es funcion en primer render; `isExpired()` con `exp` en segundos da `false` recien emitido y `true` pasado.

---

### FASE 5 — Inyeccion de token + manejo de 401 · **[FE]**
**Objetivo:** threading del token y expiracion fiable.
**Archivos:** `src/services/api.js` (L21, L52), `src/config/api.js`.
- `apiGet`: `if (token) url.searchParams.set('token', token)`. `apiPost`: token en body. Mantener `text/plain`.
- **Clasificar por `code`/`reason` numerico, NO por regex de mensaje** (red-team frontend #1, critico). Nuevo `AuthError` solo si `json.code===401`; `PermissionError` (403) **no** limpia sesion. `clearSession()` solo ante 401 auth — un **timeout de red NO borra sesion** (red-team frontend #2).
- `loginRequest = apiPost('login',{username,password})` con **timeout propio** (AbortController, ~10s por el coste PBKDF2 — red-team frontend #4).
**Verificacion:** 403 ownership muestra "permiso denegado" sin desloguear; 401 token expirado desloguea una sola vez.

---

### FASE 6 — LoginPage, ProtectedRoute, paginas · **[FE]**
**Objetivo:** consumir auth real; migracion `role`→`rol` atomica.
**Archivos:** `LoginPage.jsx` (L3,L22-65), `ProtectedRoute.jsx` (L14), `AttendancePage.jsx` (L36), `StudentDetailPopup.jsx` (L80-89), `App.jsx`, `users.js`.
- `LoginPage`: quitar `import USERS`; `await login()`; ramificar por `sess.rol`; flujo `getConvocatorias`+timeout 8s se mantiene. Si `must_change_password` → pantalla forzada de cambio antes de navegar.
- **Migracion `role`→`rol` ATOMICA** con grep, mismo commit; compat `session.rol ?? session.role` durante transicion (red-team frontend #6 — un `undefined` rompe a todos los legitimos).
- `App.jsx`: listener global `auth:expired` → `navigate('/', {state:{expired:true}})` **deduplicado**. `DashboardPage` trata 401 de `getProfesores`/`getResumen` como `auth:expired` (no "sin datos").
- `users.js`: eliminar de prod (o reducir a fixture mock sin passwords).
- `index.html`: `<meta name="referrer" content="no-referrer">` (red-team cripto #6 / frontend #5).
- PWA: en el corte, `skipWaiting`+`clients.claim`; el bundle nuevo, si ve `user` sin token (forma vieja), lo trata como sesion invalida (red-team frontend #8).
**Verificacion:** teacher logueado entra a `/attendance`; sesion fabricada `{rol:'ceo'}` renderiza dashboard pero el primer fetch (401) lo expulsa a login.

---

### FASE 7 — `agregarProfesor` (alta con credenciales) · **[BE]**
**Archivos:** `apps-script/Gestion convocatorias.js` (`appendRow` L831).
- Ampliar `appendRow` a `[id,nombre,email,true, hash(tempPwd), salt, rol, true, 1]`. Password temporal generado, `must_change_password=true`.
**Verificacion:** alta de profesor de prueba permite login con temp password y fuerza cambio.

---

### FASE 8 — Checklist de verificacion post-deploy · **[DEPLOY]**
Cada item es bloqueante para avanzar de capa:
- (a) `ping` responde desde la URL EXACTA de `VITE_API_URL` (no la `/exec` generica).
- (b) `login admin/<temp>` → token `rol:ceo`; `login teacher` → `rol:teacher`.
- (c) `getProfesores` y `getProfesores&todos=true` → respuesta CRUDA **sin** `password_hash`/`salt` (inspeccionar tambien el contenido de la clave de cache).
- (d) IDOR: teacher A con su token + `profesor_id=prof-teacherB` en `getAlumnos`/`getAsistencia` → solo lo suyo o 403.
- (e) teacher pide `getResumen` sin `profesor_id` → rechazado; ceo → global.
- (f) `guardarAsistencia`/`justificarFalta` con alumno ajeno → 403.
- (g) `actualizarAlumno` como teacher → 403.
- (h) `must_change_password` fuerza pantalla de cambio; tras cambio, tokens viejos (otra pestaña) → 401.
- (i) tras retirar api_key: request con `api_key` sin token → 401; `VITE_API_KEY` eliminada + **rebuild**; `sessionStorage 'user'` sin password.

**Orden recomendado de ejecucion:** 0 → 1 → 2 → 3 → 7 (backend completo) → 4 → 5 → 6 (frontend completo) → deploy (sec. 4) → 8.

---

## 4) Secuencia de deploy 3 capas con rollback

> **Critico (red-team bruteforce #1):** NO desplegar el fallback `api_key→ceo`. Para coexistencia, el camino legacy api_key se **degrada a solo-lectura de endpoints no sensibles** (`getConvocatorias`/`ping`); **nunca** identidad global ni escritura. Ventana de **horas, no dias**. Programar **fuera de la franja de `warmCache` (6-7am)**.

| Capa | Accion | Rollback |
|---|---|---|
| **PRE** | `clasp deployments` → confirmar `deployId` = host de `VITE_API_URL`. `setSessionSecret()` (256 bits, idempotente). | — |
| **1 [HOJA]** | ALTER columnas E..I; `migrarPasswordsProfesores()`; check integridad. Front viejo indiferente (columnas inertes). | Columnas inertes para codigo viejo; no requiere rollback. |
| **2 [BE]** | `clasp push` → `clasp version 'auth v1.2'` → **`clasp redeploy <deployId> --versionNumber <N>`** (mismo ID, no crear endpoint nuevo). Despliega login+token+ownership+`getProfesores` saneado+cache `prof_v2`. Front viejo (api_key→solo-lectura) sigue. Smoke test (a)(b)(c). | `clasp redeploy <deployId> --versionNumber 17`. |
| **3 [FE]** | Vercel: login por red, token en sessionStorage, `skipWaiting`. Verificar login real de los 8. | Redeploy build Vercel anterior (instantaneo). |
| **CORTE** | Retirar rama api_key del gate (otro `clasp redeploy`, **sin tocar `SESSION_SECRET`** — red-team deploy #5); eliminar `VITE_API_KEY` + **rebuild Vercel**; rotar `API_KEY` en ScriptProperties. | Re-añadir rama legacy temporalmente. |

**Recuperacion del CEO** (red-team deploy #4): mantener una via de acceso CEO verificada antes de retirar `users.js`; runbook de re-set de `SESSION_SECRET` accesible al owner.

---

## 5) Decisiones que requieren tu OK antes de codear

1. **CEO en PROFESORES:** ¿crear fila `prof-admin` (rol=ceo, sin grupos) dentro de PROFESORES? *(El diseño lo asume.)*
2. **Lista real de profesores:** `users.js` lista 10 teachers; la doc dice 7. ¿Cuales migrar/activar? **No asumir** `users.js` como verdad.
3. **Passwords (red-team, fuerte recomendacion):** ¿OK generar **passwords temporales aleatorios** (no `<username>2026`) + `must_change_password` **bloqueante**? Los `<username>2026` estan en el git history publico → hashearlos no protege nada.
4. **`exp` del token:** propongo **8h** (cubre jornada) en **segundos**. ¿Confirmas duracion? Re-login al expirar (sin refresh token).
5. **Coexistencia vs corte duro:** ¿ventana corta con legacy api_key degradado a **solo-lectura** (mas seguro contra prod-a-medias), o corte duro coordinado (8 usuarios, downtime breve)? **Nunca** el fallback `api_key→ceo`.
6. **Iteraciones PBKDF2 (N):** medir latencia real en deploy; fijar el N mas alto que mantenga login < 2-3s. ¿Quien valida la latencia aceptable?
7. **Quien ejecuta el ALTER de la hoja:** owner (no Aurora). ¿Confirmas que Aurora NO es editor del proyecto Apps Script (si lo es, puede leer `SESSION_SECRET` y forjar tokens ceo)?

---

## 6) Estimacion de esfuerzo y paralelizacion

| Fase | Esfuerzo | Frontera | Paralelizable |
|---|---|---|---|
| 0 — Precondiciones | S | HOJA/DEPLOY | — (bloquea todo) |
| 1 — Primitivas cripto | M | BE | Si (independiente del FE) |
| 2 — Esquema + migracion | M | HOJA+BE | Depende de Fase 1 (`pbkdf2_`) |
| 3 — Login+gate+authz | **L** | BE | Depende de 1,2 |
| 7 — agregarProfesor | S | BE | Con Fase 3 |
| 4 — session.js+useAuth | S | FE | **Paralelo a 1-3/7** (contrato definido) |
| 5 — api.js token+401 | M | FE | Paralelo a backend |
| 6 — LoginPage+guard+paginas | M | FE | Depende de 4,5 |
| 8 — Checklist+deploy | M | DEPLOY | Tras todo |

**Esfuerzo total: ~L.** El backend (1→2→3→7) es secuencial y es la mayor parte (Fase 3 = L). El frontend (4→5→6) puede desarrollarse **en paralelo** al backend una vez fijado el contrato del login (`{token, profesor_id, rol, nombre, exp, must_change_password}`, `exp` en segundos, `code`/`reason` numericos). El deploy (sec. 4) y la Fase 8 son estrictamente al final y secuenciales por capa.

---

**Archivos que se tocarian (referencia, NO editados):**
- `apps-script/Código.js` — L294-337 (gate), L361-371 (getProfesores), L376-472 (lecturas), L732-985 (escrituras), L1001-1121 (alumno), L1196 (esquema), L1319+ (secret/migracion).
- `apps-script/Gestion convocatorias.js` — L831 (agregarProfesor).
- `src/services/api.js` — L21, L52, nuevo `loginRequest`. `src/config/api.js` — L11,L17-19.
- `src/pages/LoginPage.jsx` — L3, L22-65. `src/pages/AttendancePage.jsx` — L36, L88-97.
- `src/components/ProtectedRoute.jsx` — L14. `src/components/features/StudentDetailPopup.jsx` — L80-89. `src/App.jsx`.
- NUEVOS: `src/config/session.js`, `src/hooks/useAuth.js`. `index.html` (Referrer-Policy).
- `src/config/users.js` — eliminar de prod. Hoja PROFESORES — ALTER de columnas (owner).