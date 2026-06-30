# Fase 1 — Primitivas cripto en backend (auth real v1.2)

**Rama:** `feat/auth-real-appsscript`
**Archivo tocado (unico):** `apps-script/Código.js` (+216 lineas, 0 borradas)
**Verificacion:** `node --check "apps-script/Código.js"` → PARSE_OK

## Alcance
SOLO se anadieron helpers de criptografia para la auth real, en una seccion nueva
`AUTENTICACION — PRIMITIVAS (v1.2)` situada justo antes de `setApiKey`. NO se modifico
`doGet`, `doPost`, `validateApiKey` ni ningun handler (eso es Fase 3). Pure additions.

## Funciones / constantes anadidas
- `DIGEST_SHA_256` — reuso de `Utilities.DigestAlgorithm.SHA_256`.
- `MAX_TTL_SEG` (24h en segundos) — tope de expiracion aceptable de un token.
- `TOKEN_SIGN_PREFIX` (`'novattend.v1.'`) — separacion de dominio en la firma.
- `SESSION_SECRET_PLACEHOLDER` (`'REEMPLAZAR'`) — sentinel de "no configurado".
- `constantEq_(a, b)` — comparacion en tiempo constante; hashea ambos lados con
  SHA-256 y compara los digests (32 bytes, longitud fija) con OR acumulado. Sin
  early-return por longitud.
- `pbkdf2_(pwd, salt, iter)` — N iteraciones de HMAC-SHA256, devuelve base64.
- `verifyPassword_(plain, salt, storedHash, iter)` — rechaza si salt/hash vacios;
  compara con `constantEq_`.
- `signToken_(payload)` — exige `SESSION_SECRET` (throw si falta o es placeholder);
  firma `'novattend.v1.'+payloadB64` con HMAC-SHA256; formato `payloadB64.sigB64`
  en base64 WebSafe.
- `validateToken_(token)` — verifica firma ANTES de parsear; tras parsear valida
  tipos estrictos (`v===1`, `profesor_id` matchea `/^prof-[a-z0-9._-]+$/`, `rol` in
  `{teacher,ceo}`, `exp` number en segundos con `now < exp <= now + MAX_TTL_SEG`).
  Devuelve `{profesor_id, rol, ver}` o `null`.
- `setSessionSecret()` — IDEMPOTENTE: si ya hay secreto valido NO regenera; si no,
  genera ~256 bits (2x `Utilities.getUuid()` en base64) y lo guarda. Manual desde editor.

## Fixes del red-team incorporados
- exp en SEGUNDOS Unix, unidad unica (cripto #9).
- `validateToken_` verifica firma antes de `JSON.parse` y aplica tipos estrictos
  (cripto #1: forja alg=none / campos arbitrarios).
- `verifyPassword_` rechazo explicito con salt/hash vacios (deploy #6).
- `setSessionSecret` idempotente, no invalida sesiones activas (deploy #5).
- `constantEq_` sin early-return por longitud (timing).

## Notas
- Self-test manual `signToken_`/`validateToken_` ida y vuelta dejado COMENTADO en el
  codigo (no se ejecuta nada en esta fase).
- Pendiente Fase 2 (esquema PROFESORES) y Fase 3 (login/gate/authz por handler).
