# Registro de Progreso - NovAttend

## Ultimo Hito
- **Fecha:** 2026-07-14 (noche)
- **Hito:** Mejoras operativas backend: 4 triggers automaticos (rama feat/mejoras-operativas-backend). Orquestacion swarm claude-flow con ruteo de modelos, ola adversarial (10 hallazgos confirmados, 6 raices) + arbitraje opus (hallazgos: TypeError localeCompare, guard TOCTOU sin lock, convocatoria cerrada viernes desaparecia del resumen, carpetas Drive homonimas, CANARIO_URL hardcodeada, copy rachas enganoso, tildes en emails, relectura O(convocatorias x hoja), gate dia via UTC). 5 archivos nuevos: OperacionesBase (DRY_RUN fail-safe + opsEnviarEmail_ + opsGuardDiario_ + installTriggers idempotente), BackupSemanal (domingo 22h, rotacion 8 backups), CanarioDiario (7h, ping + alerta >15s), RecordatorioLista (20h lun-jue, email profesores sin registros hoy), ResumenSemanalCEO (lunes 8h, alertas semana anterior). clasp push hecho. Siguiente: (1) installTriggers() desde editor (nuevos scopes Drive/UrlFetch), (2) validar triggers en semana (DRY_RUN activo por defecto), (3) email Rafa en PROFESORES, (4) DRY_RUN='false' tras validacion.

### 2026-07-14 (noche) — Mejoras operativas backend: 4 triggers automaticos (rama feat/mejoras-operativas-backend)
- **Orquestacion:** swarm claude-flow, ruteo explicito de modelos por complejidad — sonnet x3 implementacion (territorios disjuntos con contrato de helpers fijado por el orquestador), workflow adversarial sonnet (4 lentes + refutacion doble, 26 agentes: 10 hallazgos confirmados, 6 raices), arbitraje fino con opus (veredicto ejecutable: 7 aplicar + 2 hallazgos nuevos propios + 1 rechazo), fixer sonnet (15 ediciones E1-E15), replica Node sonnet (113/113 PASS), docs haiku.
- **5 archivos nuevos en apps-script/ (5 commits por scope: c6a9c85, 6539f55, 5ba1b2a, 6df717c, c413157):**
  1. **OperacionesBase.js** — DRY_RUN fail-safe (Script Property; solo el string 'false' desactiva; default = todos los emails al dev con prefijo [DRY-RUN]), opsEnviarEmail_ centralizado (valida con esEmailValido_, loguea siempre a LOG), opsGuardDiario_ (check+marca atomicos bajo ScriptLock — cierra TOCTOU), installTriggers() one-shot idempotente que instala los 4 triggers sin tocar el de warmCache.
  2. **BackupSemanal.js** — trigger domingo 22h: copia 'NovAttend backup yyyy-MM-dd' a carpeta 'NovAttend Backups' (ID persistido en Script Property contra carpetas homonimas), rotacion conserva 8, resto a PAPELERA (nunca borrado permanente), cuerpo bajo ScriptLock, marca al final para permitir reintento.
  3. **CanarioDiario.js** — trigger diario 7h: UrlFetchApp a action=ping, alerta email al dev si falla o >15s. URL via Script Property CANARIO_URL con fallback a constante (getService().getUrl() descartado: desde trigger puede devolver /dev y dar falsas alarmas). Guard sin lock a proposito (warmCache 6-7h retiene el ScriptLock).
  4. **RecordatorioLista.js** — trigger diario 20h (handler filtra lun-jue): email a cada profesor activo con alumnos activos en convocatoria activa SIN ningun registro de ASISTENCIA hoy; un email max por profesor; guard atomico ANTES de leer datos.
  5. **ResumenSemanalCEO.js** — trigger lunes 8h: alertas de la semana anterior (2+ faltas y rachas activas) por convocatoria>profesor>grupo, reutilizando computeResumen con hojas pre-leidas (patron warmCache); convocatorias por SOLAPE de fechas con la semana reportada (no 'activas hoy'); nombres casteados a String (celda numerica no tumba el resumen); CEO sin email -> fallback dev con nota.
- **Hallazgos adversariales clave arreglados:** TypeError localeCompare con nombres no-string, guard TOCTOU sin lock, convocatoria cerrada el viernes desaparecia del resumen del lunes, carpetas Drive homonimas, CANARIO_URL hardcodeada, copy de rachas enganoso, tildes en emails a humanos, relectura O(convocatorias x hoja) de computeResumen, gate de dia via Date.UTC.
- **Verificacion:** node --check 5/5, 287 tests / 46 suites (x2), lint 0, replica Node con stubs GAS y codigo real cargado via vm: 113/113 escenarios PASS (rotacion, canario, recordatorio, resumen, guard/lock). Endpoint ping verificado en prod: 200 status ok, ~2s.
- **clasp push HECHO** (8 archivos, HEAD). SIN redeploy: doGet/doPost intactos (los triggers ejecutan HEAD).
- **Pendiente del usuario:** (1) ejecutar installTriggers() UNA vez desde el editor de Apps Script (pedira autorizacion de scopes nuevos: Drive, UrlFetch, triggers); (2) ejecutar una vez cada trigger desde el editor en modo real controlado (DRY_RUN default activo: todo llega a manuruiz826@gmail.com) y validar contenido/destinatarios en el email del dev y en la hoja LOG; (3) rellenar email real de Rafa en PROFESORES col C; (4) SOLO tras validar: Script Property DRY_RUN='false'.
- **Siguiente paso sugerido:** validar los 4 triggers en la semana, luego desactivar DRY_RUN.

### 2026-07-14 (noche) — Deuda cache-token RESUELTA (rama fix/cache-token-sw)
- **Orquestacion:** swarm claude-flow con ruteo de modelos por complejidad (Fable orquesta, sonnet para SW/banner/adversarial/E2E, haiku docs). Hook hooks_route marcado high; decision final del orquestador.
- **4 commits consecutivos:**
  - `ccbce05` feat: SW injectManifest + cacheKeyWillBeUsed quita token de clave de api-cache (parametros negocio intactos) + cacheWillUpdate guard anti-envenenamiento {status:'error'} no se cachea + cachedResponseWillBeUsed marca origen con X-Novattend-From-Cache + purga one-shot en activate de legacy keys con token anterior + TTL api-cache 7 dias (sigue NetworkFirst).
  - `7c7a95d` feat: banner offline OfflineDataBanner (src/components/features/ + src/hooks/useOfflineData + src/services/cacheStatus) + deteccion header X-Novattend-From-Cache en apiGet + 18 tests nuevos.
  - `74a1171` fix: crossorigin en link CSS de Google Fonts — respuestas opacas nunca se cacheaban (offline sin fuentes). Hallazgo adversarial.
  - `4ff32e6` test: E2E sw-cache.e2e.mjs 15/15 contra build preview con usuario fantasma real creado y luego borrado de PROFESORES (cero escrituras a produccion).
- **Verificacion adversarial 8/8 contra build real:** intercepcion de fetches del SW (Playwright 1.61 los intercepta nativo sin flag); escenarios: primera visita (cold cache OK), clave sin token sobrevive a token rotado, header presente en respuestas offline, anti-envenenamiento (error negocio HTTP 200 no queda en cache), purga legacy sin fallos, offline total OK (datos + fuentes), cero fuga de token en claves/cuerpos/headers, update del SW no rompe nada.
- **Suite E2E existente:** 10/10 PASS (no regresion).
- **Hallazgos documentados en deuda-tecnica.md (nuevas entradas):** UpdateBanner codigo muerto (registerType autoUpdate nunca invoca onNeedRefresh; opcion: quitar o cambiar a 'prompt'); logova1.png duplicado en precache (cosmetico, sin efecto).
- **Estado verificado:** lint 0, 293 tests unitarios (47 suites), build OK precache 17 entradas.
- **Verificado contra PRODUCCION (post-merge, Playwright movil 400x850):** 16/16 PASS del E2E sw-cache contra novattend.vercel.app con fantasma real (creado y borrado): offline pinta alumnos desde cache sin error + banner visible + cero tokens en claves. Sustituye a la prueba manual en movil. Hallazgo del run: `waitForCacheEntry` por action a secas lo satisfacia el prefetch de G2-G4 mientras G1 (paga el cold start ~15-20s de Apps Script) seguia en vuelo al cortar la red — corregido esperando las claves exactas de G1 (getAlumnos+getAsistencia) con retries a 20s, y check explicito nuevo (16 checks).
- **Siguiente paso sugerido:** decision de producto sobre UpdateBanner (quitarlo vs registerType 'prompt', ver docs/deuda-tecnica.md).

### 2026-07-14 (tarde) — Tanda paralela con ruteo de modelos (rama fix/warmcache-y-flecos)
- **Ruteo:** Fable orquesta; agentes con modelo por complejidad — sonnet (warmCache, marcas-401, tests+e2e) y haiku (limpieza, check deploy). Registro en swarm claude-flow con model explicito.
- **warmCache (sonnet):** NO habia nada que arreglar — el fix ya estaba en prod desde @17 (commit c026969 + PR #5, purga determinista de `res_<conv>__` + indice `_warm_keys` con TTL=WARM_TTL). Re-verificado con replica Node (3 escenarios de invalidacion verdes). El indice de memoria estaba desactualizado; corregido. Dejo secuencia curl de re-verificacion en el output del agente.
- **Marcas ante 401 (sonnet, commit 038bc80):** snapshot en sessionStorage (solo ids+booleans, debounce 300ms, purga 12h; clearSession solo borra 'user' asi que sobrevive); restauracion con banner al remontar; limpieza tras guardado exitoso (no en errores de negocio); useRevalidateOnVisible avisa y bloquea Guardar si el dia/convocatoria caducaron al volver del background. useStudents ahora orquestador fino (197 lineas) sobre usePresencePreload + usePendingMarksSync.
- **Tests+E2E (sonnet, commit 01ee422):** suite useConvocatorias (9 casos); e2e/attendance.e2e.mjs con credenciales SOLO por env (E2E_USER/E2E_PASS) + README del procedimiento usuario fantasma (hash PBKDF2 replicado, fila PROFESORES, limpieza obligatoria) + npm run test:e2e + playwright devDependency.
- **Limpieza (haiku, commit a67cb9f):** crearAlumno/actualizarAlumno eliminados (0 callers); gotcha login mock en CLAUDE.md.
- **Check deploy (haiku):** Vercel prod sirve el build nuevo (fonts recortadas, sw.js sin logova/offline.html, manifest OK).
- **Estado verificado:** lint 0, 275 tests / 43 suites verdes, build OK.
- **Siguiente paso sugerido:** deuda cache-token (generateSW→injectManifest) como sesion propia con E2E; prueba manual en movil del flujo offline en produccion.

### 2026-07-14 — Auditoria completa + fixes en 2 olas (swarm Claude Flow, rama fix/auditoria-swarm)
- **Auditoria (3 agentes paralelos: rendimiento/funcional/calidad):** base sana (lint 0, build 87KB gzip inicial, code-splitting ya hecho) pero 2 criticos y 7 altos. Informe consolidado en claude-flow memory (`novattend-audits/auditoria-2026-07-14-consolidada`).
- **Ola 1 (4 agentes, commits 59486a2..2a1658f):**
  - `fix` integridad: sin convocatoria con API activa ya NO cae a mocks ni simula guardado exitoso (redirige a login); precarga de dia pasado fallida bloquea guardado con banner+Reintentar (antes: catch{} silencioso -> riesgo de pisar asistencia real con ceros); marcas conservadas al cambiar de tab; HOY precarga lo ya guardado; anti doble-tap en modal; NaN% fuera; aviso "sesion expirada" en login; formatLongDate/formatShortDate en dateUtils.
  - `perf` dashboard ~3,2s -> ~1,6s: getProfesores en paralelo con getConvocatorias (no depende de la convocatoria) + cache en ref; cambiar convocatoria = 1 peticion (antes 4, doble via effect+handler); token anti-race; utils/attendance.js unifica aggregateAttendance/getAttendanceScheme (antes duplicadas en 3 sitios).
  - `refactor` api.js 405 lineas -> services/api/{errors,http,auth,endpoints,index} todos <250; api.js re-export puro (ningun import externo cambio, api.test.jsx paso sin tocar); timeout 20s AbortController en apiGet/apiPost (los POST ya no cuelgan); errores de red mapeados a espanol con cause.
  - `chore` PWA/carga: Google Fonts 12 pesos -> 6 usados; public/ purgado (logova.png, offline.html, vite.svg — 55KB de precache muerto; el xlsx con datos se movio al Escritorio, estaba desplegado publico); lazyWithRetry (deploy con skipWaiting ya no rompe rutas lazy en pestanas abiertas); api-cache TTL 24h -> 3h como mitigacion de la cache claveada por token (fix definitivo aplazado, ver docs/deuda-tecnica.md); CLAUDE.md corregido (fallback, n tests, estilos inline).
- **Ola 2 (2 agentes, commits dd367c5 y 4e830b6):**
  - `feat` cola offline IndexedDB (critico C2): guardar sin red encola (solo fallo de red/timeout, negocio no), replay al evento online y al arrancar, dedupe por convocatoria+grupo+fecha (ultimo gana), anti-pisado (guardado online purga pendientes de la misma clave), SavedPage variante "pendiente de sincronizar" + banner contador. useSaveAttendance extraido de AttendancePage (250 -> 226 lineas).
  - `fix` popup detalle alumno: error al cargar faltas visible con Reintentar (antes indistinguible de "sin faltas"); sin metricas 0/0 inventadas al abrir desde pase de lista; cache de faltas por convocatoria+alumno (2a apertura instantanea, invalidada al justificar); onDirtyClose refresca el resumen del dashboard tras justificar.
- **Estado final verificado:** lint 0 errores 0 warnings, **248 tests / 38 suites verdes** (base 202/32), build OK (precache 17 entradas, 402KB).
- **Bloqueos/decisiones:** cache-token de Workbox APLAZADA a fix propio (requiere generateSW -> injectManifest; documentada en docs/deuda-tecnica.md con mitigacion TTL 3h aplicada). Incidencia menor: un agente uso git stash durante la ola 1 violando su encargo; verificado archivo a archivo que no se perdio trabajo.
- **Siguiente paso sugerido:** probar en dev los 2 flujos criticos (entrar a /attendance por URL directa -> redirige a login; guardar en modo avion -> queda pendiente y sincroniza al volver la red), merge de `fix/auditoria-swarm` a main (recordar `gh auth switch --user Maxesta17` para push) y deploy Vercel. Despues: fix propio de la cache-token (injectManifest).

### 2026-07-02 — Reset de password por email ("olvide mi contrasena") + reset Christian
- **Christian bloqueado** ("usuario o contrasena incorrectos"): reseteado a temporal nueva sin guiones (ptqcdx2e4kub, hash @1000 en PROFESORES!E11, must_change=true). Verificado. Su hash previo era el de la temporal con guiones que tecleaba mal.
- **Feature reset por email** (self-service). Decision del usuario: via email (recomendado) frente a admin-notify. Requiere emails reales en PROFESORES (hoy placeholders "(su email)").
- **Backend (`Código.js`, deploy @22):** nuevo `handleSolicitarReset(body)` (case 'solicitarReset' en doPost, EXENTO de auth en resolveAuth_). Genera temporal (`generarPasswordTemporal_`), hashea @1000, must_change=true, envia la temporal SOLO por email (`enviarEmailReset_` con MailApp). Helpers `esEmailValido_` (rechaza placeholders/CRLF) y `autorizarEmail()` (one-shot para el consentimiento del scope de Gmail). Constantes `RESET_THROTTLE_PREFIX`/`RESET_THROTTLE_SEG=600`.
- **Frontend (Vercel):** `api.solicitarReset(username, email)`; `ForgotPasswordForm.jsx` (usuario + email, mensaje generico anti-enumeracion); link "¿No recuerdas tu contraseña?" en `LoginPage`. 4 tests nuevos (202 total, lint 0).
- **Revision adversarial (workflow, 4 lentes: enumeracion/DoS/inyeccion/auth) — 4 hallazgos MEDIO, todos arreglados antes de desplegar:**
  1. **Carrera del throttle** (check-and-set fuera del lock -> rafaga de resets). Fix: TODO (throttle + escritura) dentro del LockService.
  2. **Email falla tras rotar la password** -> profe bloqueado sin temporal + oraculo 500. Fix: enviar email ANTES de escribir la hoja; cualquier excepcion -> generico 200 (nunca 500 distinguible); si el envio falla, la cuenta queda intacta.
  3. **Oraculo por timing** (PBKDF2 solo en la rama valida). Fix: `quemarTiempo` (PBKDF2 dummy) en toda rama que no resetee -> latencia ~constante (~3-4s), como handleLogin. Verificado: usuario-inexistente 4,3s / sin-email 3,0s.
  4. **Reset forzado sin auth = DoS** (cualquiera con un usuario resetea al CEO). Mitigado: exigir tambien el EMAIL (segundo factor, debe coincidir con la hoja) + NO bumpear token_version (no mata la sesion activa de la victima; el bump ocurre al cambiar la password de verdad). Lo verificaron seguros: sin toma de cuenta, sin inyeccion de email, sin fuga de la temporal, sin XSS.
- **Estado real de los profes (PROFESORES):** ya hicieron onboarding (must_change=false, cambiaron su pass) samuel, nadine, marta, elisabeth, myriam, sonja, stephanie. Pendientes de entrar: maria, sven, christian, admin. (Un 401 con la temporal = ese profe ya la cambio, NO es bug.)
- **Pendiente del usuario (para que el reset envie de verdad):** (1) meter los EMAILS reales en PROFESORES col C (hoy "(su email)"); (2) ejecutar UNA vez `autorizarEmail` desde el editor (concede el permiso de Gmail). Sin ambos, el boton funciona pero el email no sale (MailApp lanza -> se captura -> respuesta generica; degradacion segura).

### 2026-07-01 — "Panel-lite" de Aurora (Opcion B): endurecer el lado Sheet
- **Contexto:** se estimo el panel admin React completo (Opcion A) via auditoria multi-agente (backend/frontend/requisitos/seguridad). Conclusion: es un milestone (rol nuevo en auth + exponer handlers de menu por API + riesgo de desincronizacion ALUMNOS vs hojas de grupo). **Decision del usuario:** Aurora sera rol 'admin' PERO **usando las credenciales del CEO** (asume el trade-off de que ve todo lo del CEO); eso solo aplica al futuro panel A. Y **empezar por Opcion B**: aliviar el trabajo en la hoja cruda (80% del alivio por 20% del esfuerzo), sin frontend ni API nueva ni tocar auth.
- **B1 — Higiene de nombres automatica (`onEdit`, Gestion convocatorias.js):** al escribir un nombre en una hoja de grupo (col A, fila 3+), normaliza (`\s+`->espacio + trim; `\s` en JS ya cubre el nbsp) ANTES de sincronizar. Mata el bug "Antonio Perez " != "Antonio Perez" que creaba 2 IDs. `setValues` no re-dispara el trigger simple, por eso se sincroniza en la misma ejecucion.
- **B2 — Comprobar duplicados (menu + `comprobarDuplicados`):** escanea ALUMNOS y, por convocatoria, detecta (1) nombres identicos tras normalizar (minusculas, sin acentos via filtro charCode U+0300..U+036F, sin espacios dobles) y (2) un nombre cuyos tokens son subconjunto de otro ("Antonio Perez" ⊂ "Antonio Perez Burrul"). Solo informa (ui.alert), no modifica. Logica validada en Node (Jose≡José, doble espacio, subset, no cruza convocatorias).
- **B3 — Mover alumno en 1 paso (menu + `moverAlumnosAplicar`):** un solo item que, tras cortar/pegar nombres, ejecuta en orden `sincronizarAlumnos()` + `transferirHistorial()`. Orquestador delgado que REUTILIZA las funciones existentes (cero riesgo de regresion en las operaciones pesadas que reescriben ALUMNOS/ASISTENCIA). Aurora ya no tiene que recordar los 2 pasos ni su orden.
- **B4 — Diagnostico + protecciones (`diagnostico`, `protegerEstructura`):** `diagnostico()` (menu) informa: proteccion de estructura OK/falta en las 5 hojas de sistema, alumnos activos por convocatoria, convocatorias activas. `protegerEstructura` hecha **idempotente** (quita nuestras protecciones previas por descripcion antes de recrear) y **agregada al menu** para poder ejecutarla/re-ejecutarla sin riesgo.
- **Estado:** los 4 (+ protegerEstructura idempotente en Código.js) desplegados a HEAD (`clasp push`, trigger simple onEdit vive al instante; el web app doGet/doPost NO cambia -> no requiere redeploy). node --check OK en ambos archivos.
- **Pendiente del usuario:** (1) **recargar la hoja** para que aparezcan los items nuevos del menu (onOpen); (2) ejecutar UNA vez **menu NovAttend > Proteger estructura de hojas** (pide el email de Aurora) si aun no estaba aplicada — comprobar con **Diagnostico**; (3) probar: escribir un nombre con espacios sobrantes (se limpia solo), Comprobar duplicados, y Aplicar cambios tras mover un alumno.

### 2026-06-30 (noche) — HOTFIX: profesores no podian loguearse (login PBKDF2 timeout)
- **Sintoma:** todos los profesores veian "Error al conectar con el servidor" al intentar entrar con su contrasena temporal. La app llevaba sin permitir logins desde el deploy de auth real.
- **Diagnostico (con evidencia, no suposicion):** el endpoint @20 estaba sano (`getConvocatorias` sin token -> 401 JSON en ~1,5s) y el bundle de Vercel apuntaba a la URL correcta. El fallo era SOLO el login: medido con curl, `handleLogin` tardaba **~31s en caliente / >120s en frio**. Causa raiz: `pbkdf2_` encadena `Utilities.computeHmacSha256Signature` `PBKDF2_ITER` veces; con `PBKDF2_ITER=10000` y ~3ms/iteracion (overhead de llamada nativa) = ~30s. El frontend (`loginRequest`) aborta a los **10s** (`AbortController`), el `AbortError` cae en el fallback generico -> ese mensaje. La verificacion curl original "12/12 PASS" no lo detecto porque curl no tiene timeout (esperaba los 31s). El JSDoc de `pbkdf2_` ya pedia "<2-3s": el 10000 estaba 10x sobre presupuesto (calibracion nunca ajustada).
- **Fix de raiz (aprobado por el usuario):**
  - **Backend (`Código.js`):** `PBKDF2_ITER` 10000 -> **1000** (~3s de login). El lockout durable (5 fallos -> 15 min) sigue siendo la defensa real contra ataque online; 1000 iters es coherente con el presupuesto documentado. Desplegado **@21** (clasp push + `clasp deploy -i <id>`, misma URL /exec).
  - **Re-migracion de hashes:** bajar iters invalida los hashes guardados (se generaron a 10000). Re-hasheadas las 11 contrasenas temporales a 1000 iters con replica Node byte-identica de `pbkdf2_` (validada: los 10 hashes `must_change=true` cuadran @10000 antes de reescribir). Escritas a `PROFESORES!E` via MCP (RAW). Salts intactos.
  - **Caso especial Samuel:** tenia `must_change_password=false`/`token_version=2` -> YA habia cambiado su pass (su hash no era el temporal, irrecuperable a 1000 iters). Reseteado a su contrasena temporal del doc + `must_change=true` + `token_version=3` (revoca su sesion). Manana entra con la temporal y la cambia de nuevo. **El usuario debe avisarle de que su contrasena volvio a ser la temporal.**
  - **Frontend (`api.js`):** timeout de `loginRequest` 10s -> **20s** (margen para cold start ~12s + redes moviles).
- **Verificacion en prod (@21, curl):** login `nadine` con su temporal -> **4,5s**, `status:ok`, token emitido, `must_change_password:true`. Login `admin` (CEO) -> **3,3s**. Re-migracion correcta, latencia resuelta, flujo must_change intacto.
- **Estado:** lint 0 errores, 198/198 tests OK. Backend @21 vivo. Frontend pendiente de merge a main -> Vercel (timeout 20s). Con el backend ya a ~4s, incluso el front viejo (10s) deja entrar en caliente; el bump a 20s cubre los logins en frio de la manana.
- **Pendiente del usuario:** (1) avisar a Samuel del reset de su contrasena; (2) confirmar manana que los 7 profes entran sin problema.

### 2026-06-30 — Auth real, retiro de api_key y warmCache per-profesor (DESPLEGADO @20)
- **Resumen del dia:** jornada de hardening de seguridad y rendimiento de backend. Todo mergeado a main, pusheado (`main == origin/main`) y **desplegado a produccion** (Apps Script @20, frontend Vercel desde main). 198 tests / 31 suites verdes, lint 0.
- **PR #2 — Quick fixes de backend (rama `fix/cache-invalidacion-y-activo-robusto`):**
  1. `cacheInvalidate` purga determinista de la clave calentada huerfana `res_<conv>__` (antes el CEO veia resumen stale hasta 6h porque `_keys` expira a los 6 min pero la clave warm vive 6h).
  2. Helper `isTruthy()` para leer `activo`/`activa` como texto en filas sin checkbox (`CHECKBOX_ROWS` 50→400); alumnos 51-336 ya no desaparecian. `presente`/`justificada` siguen estrictos.
  3. NaN-guard en el histograma semanal de `computeResumen` (una fecha editada a mano por Aurora ya no tumba `getResumen` con HTTP 500).
  4. `LockService` en `transferirHistorial` (exclusion mutua con el guardado de asistencia).
  5. `normalizeSheetDate_` + whitelist `DATE_COLUMNS`: texto `dd/mm/yyyy` (locale ES) → ISO `yyyy-MM-dd` en `sheetToObjects`.
- **PR #3 — Auth real en Apps Script (milestone v1.2, rama `feat/auth-real-appsscript`, deploy @18):** reemplaza el api_key compartido por auth real. Login valida user/password contra PROFESORES (PBKDF2-HMAC-SHA256 + salt), emite token HMAC firmado `{v, profesor_id, rol, exp, ver}`; cada handler deriva identidad y rol **del token**, no del body. Token por query(GET)/body(POST), nunca header (CORS). `must_change_password` bloqueante, lockout durable, `token_version` para revocacion. Hoja PROFESORES migrada (10 profes + prof-admin/Rafa rol ceo, todos must_change). `SESSION_SECRET` en ScriptProperty (lo configuro el usuario, `setSessionSecret()` desde el editor). **Verificado end-to-end en prod (curl, 12/12 PASS):** login teacher/ceo, password mala→401, must_change→403, IDOR getAlumnos(otro profe)→403, getResumen global como teacher→403, token viejo revocado. Credenciales temporales en `C:\Users\Usuario\Desktop\NovAttend-credenciales-temporales.txt` (fuera del repo; el usuario reparte y borra).
- **PR #4 — Retiro total del api_key legacy (rama `chore/retire-api-key`, deploy @19):** confirmado que NO hay integraciones externas usando el key (n8n del usuario = todo FES/FHF reclutamiento, cero NovAttend; sin bot Telegram). `resolveAuth_` ya no acepta api_key, `api.js` ya no lo envia. Borrados deployments viejos @6/@9/@10 (servian codigo solo-api_key = bypass). Verificado en prod: `getConvocatorias` sin token→401, con token→honrado, login exento→token. El api_key ya no gobierna ningun gate.
- **PR #5 — warmCache per-profesor (rama `perf/warm-rosters-profesor`, deploy @20):** `warmAlumnosRosters_` calienta los rosters `alu_<conv>_<prof>_<grupo>` (G1-G4 de cada profe) derivandolos del array `alumnos` que `warmCache` ya lee → **cero lecturas extra de hoja**. Antes solo se calentaba el resumen global del CEO; el primer `getAlumnos` de cada teacher pagaba frio (~2s). Indice persistente `_warm_keys` (TTL 6h) para purgar warm aunque `_keys` expire. Fix de correctitud (revision adversarial): `crearAlumno` ahora invalida `res_`/`asist_` ademas de `alu_` (crear alumno cambia el resumen del CEO); `warmCache` toma el lock global para serializar contra `cacheInvalidate`.
- **Seguridad:** los 3 criticos de la auditoria (key en bundle, sin auth server-side, passwords en claro) quedan **CERRADOS**.
- **Pendiente (inerte, no bloquea):** (1) quitar `VITE_API_KEY` de `.env` + variables de Vercel (huerfana, ya no se lee); (2) opcional borrar la Script Property `API_KEY` (codigo muerto inofensivo). Rollback de un deploy: `clasp redeploy @17` + revert de main.

### 2026-06-16 — Justificar faltas (profesor)
- **Feature:** el profesor puede justificar/quitar la justificacion de faltas pasadas de sus alumnos. Una falta justificada NO penaliza el porcentaje (se excluye del calculo) pero SIGUE visible en el historial, marcada distinto (gold). Decisiones de negocio del usuario: excluir del %, justificar dias despues (no en el marcado diario), motivo de lista predefinida + "Otro", tocar backend ahora (pese a ser "Ola 4").
- **Backend (`apps-script/Código.js`):** 2 columnas nuevas en ASISTENCIA (`justificada`, `motivo`) al final + lectura defensiva para filas viejas de 7 cols. `computeResumen`: justificada NO suma a total/presentes en ninguna ventana (% sube) pero SI entra en `registros` → visible en `ultimas_8`/`historico_semanas` con flags (`ultimas_8[i].justificada`, `historico_semanas[i].justificadas`); racha la salta como neutral (ni suma ni rompe). `handleGuardarAsistencia` preserva justificada/motivo al re-guardar el dia (solo si el alumno sigue ausente). Nuevo endpoint POST `justificarFalta` (clave de fila unica = `fecha+alumno_id+convocatoria_id`, valida `presente===false`, invalida cache). **Pendiente manual del usuario: redeploy clasp (`clasp push`+`version`+`redeploy <ID>`) y verificar/crear cabeceras `justificada`/`motivo` en la hoja real.**
- **Frontend:** `config/justificationReasons.js` (motivos + "Otro"); `api.justificarFalta`; `JustifyAbsenceModal.jsx` (elegir motivo, "Otro"→textarea, confirmar/quitar, muestra error); `AbsencesBlock.jsx` (justificadas en gold con motivo); `StudentDetailPopup` refrescado + captura de error. **Acceso del profesor:** `StudentRow` admite prop opcional `onInfo` → boton "i" hermano del switch (no anidado, respeta patron "un solo control"); `StudentList.jsx` (nuevo) monta el detalle desde `AttendancePage`. `WhatsNewModal.jsx` (novedad con mini-tutorial, una vez por dispositivo via localStorage `novattend_whatsnew_justificar_v1`, solo teacher). Last8Block/WeeklyHistoryBlock pintan las justificadas en gold.
- **Hallazgo clave de la auditoria:** `StudentDetailPopup` solo existia en el dashboard del CEO; el profesor no tenia forma de ver/justificar faltas. Resuelto dando acceso desde AttendancePage (decision del usuario).
- **Validacion navegador (Playwright + chromium, modo mock):** teacher 9/9 PASS (login -> WhatsNewModal una vez -> boton "i" en 12 filas -> popup sin crash -> toggle intacto) + CEO 4/4 PASS (dashboard renderiza, NO ve el modal, sin regresion). Cero errores de consola en ambos flujos. Confirmado visualmente: tutorial limpio, popup sin "undefined", dashboard CEO intacto. El flujo de justificar contra backend real solo se valida tras redeploy (mock no expone el boton Justificar).
- **Auditoria adversarial pre-PR (workflow 3 dimensiones + verify):** 4 hallazgos confirmados, 3 arreglados antes del PR (ninguno crasheaba pero violaban negocio/coherencia):
  1. **CEO podia justificar** (ALTO, negocio): el boton Justificar se exponia en el dashboard del CEO (rol solo-lectura). Fix: prop `allowJustify` (default false); StudentList la pasa true (profesor), DashboardPage false (CEO). +test del gate.
  2. **actualizarEstadisticasGrupo** (MEDIO, `Gestion convocatorias.js`): contaba las justificadas como faltas, divergiendo de computeResumen -> las hojas-resumen por grupo de Aurora mostraban % mas bajo que la app. Fix: excluye justificadas (columna por cabecera, defensivo).
  3. **Race en fetchAbsences** (MEDIO): el refactor perdio el guard de cancelacion; cambiar rapido de alumno podia mostrar faltas obsoletas. Fix: token de peticion (useRef) que descarta respuestas obsoletas tras el await.
- **Estado:** lint 0 errores, 181/181 tests OK (29 suites), build OK. 20 commits en `feat/justificar-faltas`. Backend sin redeploy todavia.
- **Pendiente:** redeploy clasp (`clasp push`+`version`+`redeploy <ID>`) de Código.js Y `Gestion convocatorias.js` + cabeceras `justificada`/`motivo` en hoja real; validar flujo justificar contra backend desplegado; mejora futura opcional: ilustrar el tutorial con imagen generada (OpenRouter).

### 2026-06-09 — Asistencia retroactiva + fix HTML invalido + fix Nadine
- **Fecha:** 2026-06-09
- **Hito previo:** Registrar asistencia de dias pasados (ultimos 7 dias) + fix boton anidado StudentRow

### 2026-06-09 — Asistencia retroactiva + fix HTML invalido + fix Nadine
- **Fix operativo (Sheet):** Nadine olvido pasar lista el lunes 2026-06-08 (su G1, conv-abr26) y la app no le dejaba registrar dias pasados. Insertados sus 10 registros (ASISTENCIA A1119:G1128): todos presentes menos Jorge (alu-0051) y Manuel (alu-0052). Via `appendRows` (no calcular fila a mano: la hoja tiene datos mas alla de la fila 1000, insertar en 1001 habria pisado registros de Elisabeth).
- **Feature: registrar dia pasado (ultimos 7 dias).** Causa raiz del dolor: la fecha estaba fijada a HOY en AttendancePage (`new Date().toISOString()`), no habia selector. El backend YA aceptaba cualquier fecha (upsert idempotente), asi que fue solo frontend.
  - Nuevos: `utils/dateUtils.js` (formatLocalDate FIX bug UTC, getLast7Days, labelFromIso), `features/DateSelector.jsx` (panel 7 dias), `features/DateHeaderControl.jsx`, `features/ConfirmPastDayModal.jsx`. Todos <250 lineas.
  - `useStudents` acepta `selectedDate`; en dia pasado pre-carga la asistencia ya guardada (edicion real, no en blanco) via getAsistencia. Token last-write-wins contra race al cambiar grupo/dia rapido.
  - UX: selector oculto por defecto (flujo de hoy intacto). En dia pasado: aviso "Registrando dia pasado" + modal de confirmacion antes de sobrescribir. Se permite 0 presentes solo en dia pasado (registrar "no vino nadie").
  - Revision adversarial multi-agente detecto 2 bugs ALTOS pre-commit (race condition que persistia grupo equivocado + clave id/name inconsistente que perdia datos). Corregidos.
  - Tests nuevos: dateUtils (6) + pre-carga dia pasado (3). Verificado en navegador (Playwright): flujo completo.
- **Fix: boton anidado en StudentRow (HTML invalido).** La fila era `<button>` con el `<button>` de ToggleSwitch dentro. React lo avisaba en runtime (no eslint). Conflicto: div->button dispara jsx-a11y, button anidado es invalido. Solucion: un solo control — la fila es `<button role="switch" aria-checked>` y ToggleSwitch gana prop `presentational` (`<span aria-hidden>`). Sin eslint-disable. Borrada rama basura `worktree-agent-aad53906` (144 commits tras main).
- **Estado:** lint 0 errores, 162/162 tests OK, build OK. Feature y fix mergeados a main + push (Vercel desplegando). 3 ramas de trabajo cerradas y borradas; solo queda main.
- **Pendiente:** panel admin Aurora (su dolor de fondo, no toca aun), decision G4 LINGNOVA de Sven.

### 2026-05-29 — Rendimiento backend + reasignacion grupo financiado
- **Operacion de datos (Sheet):** Sven despedido. Reasignado su grupo financiado **G3 de conv-abr26** a Sonja: 7 alumnos (ALUMNOS D9:D15) + 140 registros de ASISTENCIA cambiados de `prof-sven` a `prof-sonja`. Sonja hereda el historico. Pestana fisica renombrada a "ABR26 B2 - Sonja - G3". NO tocado: el G4 de LINGNOVA de Sven (clases 1-a-1, fila 645) — sigue con prof-sven. Sven sigue activo en PROFESORES.
- **Diagnostico de lentitud (medido con curl):** peaje fijo de Apps Script ~1,6s (medido con `ping`). Cuello real = `getAsistencia` sin cache leyendo las ~900 filas de ASISTENCIA en cada llamada → 4-8s. El bundle de React (85KB gzip) NO era problema.
- **Fix backend (`Código.js`, desplegado v13):** `handleGetAsistencia` envuelto en `cachedGet` (clave por filtros) → 4-8s a ~1,6s en caliente. Invalidacion `asist_`/`res_` en guardar/actualizar. Nueva funcion `warmCache()` + disparador time-driven diario 06-07h (configurado) para evitar calculo en frio (~6,5s) del primer profe.
- **Fix frontend (`vite.config.js`):** `manualChunks` por funcion en vez de array → React en chunk propio cacheable. index.js 196KB→16KB, vendor-react 0KB(vacio)→192KB. Mejora cache entre deploys.
- **Estado:** lint 0 errores, 151/151 tests OK, build 1.26s. Merge a main + push a GitHub (resuelto conflicto cuenta Maxesta18/Maxesta17 con `gh auth switch`). Vercel desplegando.
- **Decision Firebase:** APLAZADA con criterio. Solo ahorraria el peaje fijo ~1,6s; el problema gordo se resolvio sin migrar. Orden acordado: 1) optimizar [HECHO], 2) panel admin Aurora [PENDIENTE, no toca aun], 3) Firebase solo si el peaje sigue molestando.

### 2026-04-27 — Faltas absolutas + Alertas semana en curso (hito anterior)
- **Hito previo:** Dashboard CEO orientado a alertas — faltas absolutas (semana lun-jue) sustituyen porcentajes rolling

### 2026-04-27 — Faltas absolutas + Alertas semana en curso
- **Por que:** los porcentajes semanal/quincenal/mensual del popup eran ruido (ventanas solapadas sobre 3-4 clases, "0%" engañoso cuando no hay clases, no detectaban "alumno empieza a faltar"). El CEO necesita ver de un vistazo "quien faltó 2+ veces esta semana".
- **Fase A — Backend (`apps-script/Código.js`):** `computeResumen` extendido para devolver, ademas de los % viejos, `faltas_semana_actual`, `clases_semana_actual`, `faltas_mes`, `clases_mes`, `faltas_total`, `racha_faltas`, `ultimas_8` y `historico_semanas` (ultimas 8 semanas lun-dom). Helper `mondayOf_` para semanas naturales. `clasp push` ejecutado.
- **Fase B — Vista Alertas semana (DashboardPage + WeekAlerts.jsx):** componente nuevo arriba del listado de profesores con dos secciones: "2+ faltas esta semana" (rojo) y "Racha activa, 2+ faltas seguidas" (naranja). Sustituye el modal `AlertList` viejo (borrado). `useDashboard` recalcula `alertStudents` (faltas semana >= 2) y nuevo `streakStudents` (racha >= 2). `globalAttendance` ahora se calcula sobre faltas/clases reales de la convocatoria.
- **Fase C — Popup alumno (StudentDetailPopup.jsx):** rediseñado. Reemplaza los 3 porcentajes por filas de "faltas / clases" para semana, mes y convocatoria; mini-historial de las ultimas 8 clases con fecha+color (verde/rojo); historico semanal lun-dom de las ultimas 8 semanas; bloque de dias faltados conservado.
- **Fase D — Limpieza:** `AlertList.jsx` borrado, `TeacherCard.jsx` muestra ahora "Sem:N · Mes:N · Total:N faltas" + badge con % real (helpers `singleAttendance` y `aggregateAttendance` con fallback a `monthly` para mocks). Tests actualizados (`useDashboard.test.jsx`, `DashboardPage.test.jsx`, `api.test.jsx` alineado con `text/plain`).
- **Estado:** lint 0 errores, 135/135 tests OK, build 1.21s. Campos viejos `weekly/biweekly/monthly` se mantienen en backend y mocks por compatibilidad temporal — Fase E pendiente para retirar cuando todo el frontend este migrado y validado en produccion.
- **Pendiente operativo:** redeploy Apps Script (Implementar > Nueva version) + redeploy Vercel + insistir a profesores para que marquen lunes-jueves a diario; sin registros consistentes la alerta de "2 faltas/semana" no dispara.

### 2026-04-08 — Hotfix iOS Safari — POST a Apps Script fallaba con "Load failed" por preflight CORS

### Hotfix 2026-04-08 — POST CORS preflight (iOS Safari)
- **Sintoma reportado:** Profesor Sven (iPhone SE 2016 + iPad) no podia guardar asistencia. Login y carga de alumnos OK, pero al pulsar "Guardar asistencia" -> "Load failed". Reproducible en ambos dispositivos Apple.
- **Causa raiz:** `apiPost` en [src/services/api.js](src/services/api.js) enviaba `Content-Type: application/json`, lo que dispara un preflight CORS OPTIONS. Google Apps Script Web Apps no responden bien al OPTIONS, y iOS Safari (sobre todo versiones viejas) aborta con "Load failed". Chrome desktop es mas permisivo y por eso pasaba inadvertido.
- **Fix:** Cambiado el header a `Content-Type: text/plain;charset=utf-8`, que convierte el POST en "simple request" y evita el preflight. Una sola linea modificada.
- **Backend:** Sin cambios. Apps Script `doPost` lee `e.postData.contents` con `JSON.parse`, ignorando el Content-Type entrante.
- **Estado:** lint OK (0 errors). Pendiente: redeploy Vercel + verificacion con Sven en su iPhone/iPad.
- **Deuda relacionada (no abordada):** lentitud general de Apps Script en redes moviles. Posibles mejoras futuras: AbortController con timeout explicito, optimistic UI al guardar, o cache mas agresivo en el servicio.

## Resumen de Cambios (Fases 1-11)

### Fases 1-5 — Infraestructura + Componentes + Limpieza
- Tailwind config con tokens, animaciones CSS, 8 componentes UI, 6 features
- Paginas recompuestas: SavedPage, AttendancePage, DashboardPage, LoginPage
- brand.js eliminado, 0 inline styles en paginas, todos <250 lineas

### Fases 6-8 — Backend + API + Deploy
- Google Sheets como backend (5 hojas: CONVOCATORIAS, PROFESORES, ALUMNOS, ASISTENCIA, LOG)
- Apps Script API REST (Code.gs): doGet/doPost con endpoints completos
- Capa de servicios en src/services/api.js
- Deploy en Vercel + GitHub

### Fases 9-11 — Deuda tecnica + Convocatorias + Dashboard API
- ErrorBoundary, PWA con Workbox, 19 tests (Vitest)
- Flujo convocatorias: login -> consulta activas -> selector si 2+ -> asistencia
- Dashboard CEO conectado a API real con getResumen y getAsistenciaAlumno

### Fase 12 — Gestion de convocatorias + Optimizaciones + Deuda tecnica

#### Backend: Apps Script (`gestionConvocatorias.gs`)
- **`crearConvocatoria()`** — Crea separador de color + 28 hojas de grupo por convocatoria
- **`sincronizarAlumnos()`** — Lee nombres de hojas de grupo, genera IDs (`alu-XXXX`), vuelca a ALUMNOS
- **`actualizarEstadisticas()`** — Actualiza columnas B/C/D (Asistencia %, Ultima clase, Total clases) en hojas de grupo
- **`onEdit()`** — Trigger automatico: sincroniza ALUMNOS cuando Aurora escribe un nombre en columna A, fila 3+
- **`onOpen()`** — Menu "NovAttend" en el spreadsheet (crear conv, sync manual, actualizar stats)

#### Estructura de hojas por convocatoria
- Separador con color: `[ MAR26 ]` (hoja protegida con info)
- 28 hojas de grupo: `MAR26 - Samuel - G1`, `MAR26 - Samuel - G2`, etc.
- Patron: `PREFIJO - NombreProfesor - GX`
- Convocatoria ID derivado del prefijo: `conv-mar26`
- Flujo Aurora: Solo escribe nombres en columna A. Todo lo demas es automatico.

#### Optimizaciones frontend
- **`AttendancePage.jsx`** — Cache de alumnos con `useRef` por grupo. Prefetch paralelo de G2/G3/G4.
- **`LoginPage.jsx`** — Timeout de seguridad de 8s (`Promise.race`) para convocatorias activas.
- **`animations.css`** — Delays escalonados mas rapidos.

#### Deuda tecnica cerrada
- **Tests ampliados:** De 4 suites/19 tests a 8 suites/55 tests. Nuevas suites: LoginPage, ConvocatoriaPage, StudentRow, api.
- **Pagina offline PWA:** `public/offline.html` con branding NovAttend.
- **Hooks custom:** `src/hooks/useStudents.js` y `src/hooks/useConvocatorias.js` extraidos de paginas.
- **Workbox configurado:** `navigateFallback: '/offline.html'` en vite.config.js.

### Fase 13 — CacheService en Apps Script + Deploy

#### CacheService (Code.gs)
- **`cachedGet(key, fetchFn)`** — Wrapper que lee de `CacheService.getScriptCache()`, si miss ejecuta fetchFn y guarda con TTL 120s.
- **`cacheInvalidate(prefixes)`** — Invalida claves por prefijo usando indice `_keys`.
- **`cacheTrackKey(key)`** — Registra claves activas para poder invalidar por prefijo.
- **Endpoints cacheados:** getConvocatorias (`conv`), getProfesores (`prof`), getAlumnos (`alu_{conv}_{prof}_{grupo}`), getResumen (`res_{conv}_{prof}_{grupo}`).
- **getAsistencia NO cacheado** — Consulta bajo demanda, siempre fresco.
- **Invalidacion automatica en POST:**
  - `guardarAsistencia` -> invalida `res_{convocatoria_id}_*`
  - `crearAlumno` -> invalida `alu_{convocatoria_id}_*`
  - `actualizarAlumno` -> invalida `alu_*`
- **Impacto:** Primera carga ~3-5s (cold), cargas posteriores ~200-500ms (cache hit).

#### Prueba E2E (Playwright)
- Login teacher (samuel): funciona, detecta convocatoria activa, va directo a /attendance
- Alumnos reales: Antonio Perez Burrul cargado en G1 de Samuel
- Toggle asistencia: funciona, contadores se actualizan correctamente
- Login CEO (admin): dashboard carga 7 profesores reales
- Pagina offline: se muestra correctamente con branding

#### Deploy Vercel
- Push a GitHub (Maxesta18/novattend) con todos los cambios
- `VITE_API_URL` configurada en Vercel Production
- Deploy manual con `vercel --prod --force` (clean build)
- URL produccion: https://novattend.vercel.app
- **Nota:** Service Worker puede cachear version vieja. Si muestra datos mock, hacer: DevTools > Application > Service Workers > Unregister + Ctrl+Shift+R.

### Fase 14 — Auditoria baseline-ui + Correcciones de diseno

#### Auditoria aplicada (skill baseline-ui)
Se ejecuto una auditoria completa de UI contra reglas opinionadas de calidad. Se corrigieron **15 categorias de violaciones** en **18 archivos**.

#### Gradientes eliminados (11 instancias)
- LoginPage, PageHeader, SavedPage, Button, ToggleSwitch, GroupTabs, Avatar, ConvocatoriaPage, StudentDetailPopup
- Reemplazados por colores solidos: `bg-burgundy`, `bg-burgundy-dark`, `bg-off-white`

#### Glows y blur eliminados
- LoginPage: 3 divs decorativos eliminados (blur-60px, blur-40px, glow shadows de 500x500px)
- Impacto: mejor rendimiento en moviles de gama baja

#### Sombras estandarizadas
- Todas las `shadow-[custom]` reemplazadas por escala Tailwind: `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`

#### Z-index con escala fija
- `z-[1000]` (Modal) -> `z-40`
- `z-50` (PageHeader) -> `z-20`
- Eliminado `z-[1]` (SavedPage)

#### Accesibilidad
- **ToggleSwitch**: `<div onClick>` -> `<button role="switch" aria-checked>` con `focus-visible`
- **SearchInput**: `aria-label="Limpiar busqueda"` en boton X
- **PageHeader**: ya tenia `aria-label="Cerrar sesion"` (OK)

#### Tipografia
- `text-balance` en todos los headings (h1-h5)
- `text-pretty` en todos los parrafos y body text
- `tabular-nums` en datos numericos (StatCard, TeacherCard, StudentDetailPopup)
- Eliminados `tracking-[2px]`, `tracking-[0.5px]`, `tracking-[3px]` (Badge, StatCard, LoginPage)

#### Skeletons de carga
- **AttendancePage**: skeleton con 5 filas pulsantes (avatar + nombre + toggle)
- **DashboardPage**: skeleton completo con header + 4 teacher cards pulsantes

#### Safe-area-inset
- Bottom bar de AttendancePage: `pb-[max(22px,env(safe-area-inset-bottom))]`

#### Reduced motion
- `@media (prefers-reduced-motion: reduce)` anadido en animations.css

#### Custom easing eliminado
- `cubic-bezier(0.34, 1.56, 0.64, 1)` -> `ease-out` en popIn y popUp

#### `size-*` para elementos cuadrados
- Avatar y logos usan `size-[42px]`, `size-[86px]` en vez de `w-*` + `h-*`

#### Documentacion creada
- `docs/tutorial-aurora.md` — Tutorial para Aurora sobre como rellenar alumnos en el spreadsheet
- Presentacion Gamma para Aurora (enlace externo)
- Presentacion Gamma para profesores: instalacion PWA + uso de la app (enlace externo)

## Estado
- **Rama:** main
- **Build:** funcional, JS 271KB
- **Lint:** 0 errores, 1 warning (eslint-disable no usado)
- **Tests:** 55 passing (8 suites)
- **Fase completada:** 14
- **Commits recientes:**
  - `5a8d528` docs: fase 13 — CacheService en Apps Script + deploy Vercel + E2E
  - `3b47a5b` feat: CacheService en Apps Script
  - `a1a78c1` feat: fase 12 completa — hooks, tests, offline PWA, convocatorias

## Estructura de Carpetas Actual
- `src/config/`: api.js, users.js, teachers.js
- `src/services/`: api.js (capa de servicios fetch)
- `src/hooks/`: useStudents.js (156 lineas), useConvocatorias.js (68 lineas)
- `src/components/ui/`: Button, StatCard, Avatar, Badge, Modal, ProgressBar, ToggleSwitch, SearchInput
- `src/components/features/`: PageHeader, GroupTabs, StudentRow, StudentDetailPopup, AlertList, TeacherCard, ConvocatoriaSelector
- `src/components/`: MobileContainer, ErrorBoundary, ProtectedRoute
- `src/pages/`: LoginPage, ConvocatoriaPage, AttendancePage, SavedPage, DashboardPage
- `src/utils/`: buildTeachersHierarchy.js
- `src/tests/`: 8 archivos test (Badge, Button, StatCard, ProtectedRoute, LoginPage, ConvocatoriaPage, StudentRow, api)
- `public/`: offline.html, logova1.png
- `docs/apps-script/`: Code.gs (con CacheService), gestionConvocatorias.gs, importarAlumnos.gs (legacy)

## Deuda Tecnica
### Resuelta
- Rendimiento en cambio de grupo (cache useRef + prefetch)
- Timeout en LoginPage (8s maximo)
- Animaciones de entrada lentas (delays reducidos)
- Tests ampliados (8 suites, 55 tests)
- Pagina offline fallback PWA
- Hooks custom (useStudents, useConvocatorias)
- Selector de convocatoria en Dashboard
- Rendimiento dashboard (CacheService 120s en Apps Script)
- actualizarEstadisticasGrupo() — stats B/C/D se actualizan auto al guardar asistencia
- Deuda tecnica limpia: TypeScript descartado (innecesario), shadcn/ui descartado (componentes propios OK), API key 21st.dev configurada

### Pendiente
- (Sin deuda tecnica pendiente)

## Archivos de Apps Script
- `docs/apps-script/Code.gs` — API REST principal con CacheService (doGet, doPost, cache helpers, setupSheets)
- `docs/apps-script/gestionConvocatorias.gs` — Gestion de convocatorias y alumnos
- `docs/apps-script/importarAlumnos.gs` — Script legacy (ya no se usa)

## Logica de Negocio (Convocatorias)
- Convocatoria activa = `fecha_inicio <= hoy <= fecha_fin` (automatico)
- Cada convocatoria tiene sus propios alumnos independientes
- Varias convocatorias pueden convivir simultaneamente
- Alumnos se mantienen en su grupo durante toda la convocatoria (excepciones manuales en Sheet)
- 7 profesores activos x 4 grupos = 28 hojas por convocatoria
- Profesores: Samuel, Maria Wolf, Nadine, Marta Battistella, Elisabeth Shick, Myriam Marcia, Sonja

### Sesion 2026-03-30 — Limpieza spreadsheet + clasp + fixes criticos

#### clasp configurado
- `npm install -g @google/clasp` + `clasp login` (manuruiz826@gmail.com)
- Scripts clonados en `apps-script/` (Codigo.js, Gestion convocatorias.js, appsscript.json)
- Apps Script API habilitada en settings de Google
- Flujo: editar local → `clasp push` → nuevo deploy desde UI de Apps Script

#### Limpieza del spreadsheet (via MCP google-sheets)
- 999 filas fantasma eliminadas de ASISTENCIA (checkboxes FALSE que confundian getLastRow)
- 29 hojas huerfanas de MAR26 eliminadas (convocatoria de prueba)
- Fila vacia en CONVOCATORIAS eliminada, conv-abr26 movida a fila 2
- Filas vacias con checkboxes en PROFESORES eliminadas
- Separador [ ABR26 ] actualizado con fechas correctas

#### Fixes en Codigo.js (subidos via clasp push, deploy v5)
- **setupSheets**: checkboxes reducidos de 999 a 50 filas; ASISTENCIA.presente ya no recibe checkboxes masivos
- **handleGuardarAsistencia**: reescrito de borrado fila-a-fila a filtrado+reescritura batch (una sola operacion setValues)

#### Fix en AttendancePage.jsx
- Estado `saveError` + mensaje visual rojo si el guardado de asistencia falla

#### 5 mejoras de robustez en Gestion convocatorias.js (clasp push OK)

1. **Bug critico — preservar datos en sincronizarHoja y sincronizarAlumnos**
   - Ambas funciones ahora preservan email (col F), telefono (col G) y activo (col H) de alumnos existentes al reconstruir ALUMNOS
   - Antes: hardcodeaba `'', '', true` — borraba datos y reactivaba alumnos desactivados

2. **LockService + try/catch**
   - `sincronizarHoja`: protegida con `LockService.getScriptLock().waitLock(10000)` + `try/finally` para `releaseLock`
   - 9 funciones de menu envueltas en `try/catch` con `ui.alert('Error: ' + err.message)`

3. **Nueva funcion: reactivarProfesor()**
   - Simetrica a `desactivarProfesor`: lista profesores con `activo !== true`, Aurora elige, marca `activo=true`
   - Log con accion `REACTIVAR_PROFESOR`
   - Agregada al menu despues de "Desactivar profesor"

4. **Batch setValue en quitarProfesorDeConvocatoria**
   - Reemplazado loop de N llamadas `setValue(false)` por lectura+modificacion en memoria + un solo `setValues()` en columna H

5. **Helper crearHojaGrupo(ss, hojaNombre, colorHex, nombreProfesor, grupo, posicion)**
   - Logica duplicada de crear hoja de grupo (merge, colores, anchos, proteccion, freeze) extraida a funcion reutilizable
   - Reemplazada en `crearConvocatoria` y `agregarProfesorAConvocatoria`

#### Transferencia de historial para alumnos movidos (clasp push OK)

Cuando Aurora mueve un alumno entre hojas de grupo (copiar/pegar nombre), el historial de asistencia se preserva:

1. **sincronizarHoja y sincronizarAlumnos mejorados**
   - Cuando un nombre no se encuentra en el grupo actual, busca en ALUMNOS si ya existe en la misma convocatoria (cualquier profesor/grupo)
   - Si existe → reutiliza su `alumno_id` en vez de crear uno nuevo
   - Ocurre automaticamente en cada onEdit

2. **Nueva funcion: transferirHistorial()**
   - Lee ALUMNOS (ubicacion actual de cada alumno) y ASISTENCIA
   - Detecta registros de asistencia cuyo profesor/grupo no coincide con la ubicacion actual
   - Los corrige en batch (un solo setValues)
   - Recalcula estadisticas de todos los grupos
   - Menu: "Transferir historial de alumnos movidos"

**Flujo Aurora (3 pasos):**
1. Copiar/pegar nombres entre hojas como siempre
2. Borrar los nombres de las hojas viejas
3. Menu → "Transferir historial de alumnos movidos"

## Estado
- **Rama:** main
- **Archivos modificados:** `apps-script/Gestion convocatorias.js`
- **clasp push:** OK (3 archivos)
- **Deploy pendiente:** nuevo deploy desde UI de Apps Script

## Siguiente Paso
1. Nuevo deploy desde UI de Apps Script (nueva version web app)
2. Hacer commit de los cambios locales
