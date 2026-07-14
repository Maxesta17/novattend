# Deuda tecnica

Registro de deuda tecnica conocida, con contexto y fix propuesto para cada entrada.

---

## Cache de API claveada por token

**Estado:** RESUELTA (2026-07-14).

### Problema

Workbox usa la **URL completa** como clave de cache, y todas las llamadas a la API
de Google Apps Script llevan el token de sesion en la query string. Consecuencias:

1. **Offline casi inutil tras re-login:** al iniciar sesion de nuevo, el token
   cambia, por lo que ninguna URL nueva coincide con las entradas cacheadas con
   el token anterior. La estrategia NetworkFirst nunca encuentra fallback y el
   modo offline deja de servir datos.
2. **Tokens de sesion persistidos en Cache Storage:** las URLs cacheadas
   contienen tokens validos (hasta su expiracion) legibles desde DevTools o por
   cualquier script con acceso al origen. Es una superficie de fuga innecesaria.

### Impacto

- La promesa offline de la PWA solo se cumple dentro de una misma sesion de token.
- Datos potencialmente obsoletos servidos hasta el TTL de la cache (de ahi la
  mitigacion provisional de bajar 24h → 3h).
- Tokens de sesion con persistencia mas larga que la propia sesion.

### Como se resolvio

**Cambios tecnicos:**

1. **Migracion generateSW → injectManifest:** el service worker ahora es codigo
   propio en `src/sw.js` (vite-plugin-pwa lo bundlea e inyecta el manifest de
   precache en build). Se replican precache, navigateFallback, fonts y autoUpdate.

2. **cacheKeyWillBeUsed en api-cache:** quita el parametro `token` de la URL antes
   de usarla como clave (lectura y escritura). Los parametros de negocio (action,
   convocatoria_id, profesor_id, grupo, fecha, alumno_id) se preservan y siguen
   diferenciando cada consulta y usuario. Las entradas sobreviven al re-login y
   los tokens ya no se persisten en Cache Storage.

3. **cacheWillUpdate guard anti-envenenamiento:** Apps Script devuelve los errores
   de negocio como HTTP 200 con body `{status:'error'}` (incluido el 401 de token
   expirado). Sin guard, ese 200 se cachearia y PISARIA la entrada buena de la
   misma clave. El guard no cachea esos cuerpos (ni respuestas no-JSON u opacas);
   la entrada buena anterior se conserva.

4. **cachedResponseWillBeUsed marca el origen:** las respuestas servidas desde
   cache llegan con el header `X-Novattend-From-Cache: 1`; las de red no lo llevan.

5. **Purga one-shot en activate:** las entradas heredadas del generateSW anterior
   (claves con `token=`) se BORRAN de api-cache al activarse el SW nuevo — nunca
   volverian a matchear y persistian tokens hasta 7 dias.

6. **TTL api-cache 3h → 7 dias:** la clave ya no rota con el token, asi que el TTL
   corto de la mitigacion no protege nada. NetworkFirst sigue prefiriendo red
   siempre (timeout 10s); la cache solo actua sin red. 7 dias cubre el fin de
   semana (viernes → lunes).

7. **Banner global "Datos sin conexion — pueden no estar actualizados":** apiGet
   (`src/services/api/http.js`) detecta el header y lo publica via
   `src/services/cacheStatus.js` (pub/sub sobre CustomEvent); el hook
   `src/hooks/useOfflineData.js` lo consume y `OfflineDataBanner.jsx` (montado
   global en `App.jsx`) muestra el aviso. En dev/mock el SW no corre y el banner
   nunca aparece.

8. **Fix relacionado — crossorigin en el CSS de Google Fonts (`index.html`):** sin
   `crossorigin` el CSS llegaba como respuesta opaca (no-cors) que CacheFirst
   descartaba SIEMPRE — la cache `google-fonts-css` estaba vacia y el modo offline
   perdia las fuentes. Bug preexistente destapado por la verificacion adversarial.

**Verificacion:**

- **Adversarial 8/8 contra el build real** (Playwright intercepta tambien los fetch
  internos del SW): primera visita, clave sin token sobrevive a token rotado,
  header de marcado, anti-envenenamiento (200-con-error y HTML no cachean ni pisan),
  purga legacy, offline total (app shell + rutas SPA), cero fugas de token en
  claves y cuerpos de todas las caches, update con pestana abierta.
- **E2E nuevo `e2e/sw-cache.e2e.mjs` 15/15 PASS** contra `npm run preview` con
  usuario fantasma real (creado y borrado de PROFESORES; cero escrituras a
  produccion — todo POST distinto de login se aborta en el navegador).
- **Suite E2E vieja 10/10** sin cambios + **293 tests unitarios (18 nuevos)** +
  **lint 0** + build OK.

### Referencias

- `src/sw.js` — service worker propio (240 lineas, 3 plugins custom + purga).
- `vite.config.js` — bloque VitePWA con `strategies: 'injectManifest'`.
- `src/services/api/http.js` — apiGet detecta el header X-Novattend-From-Cache.
- `src/services/cacheStatus.js` — pub/sub del origen de datos.
- `src/hooks/useOfflineData.js` — hook consumidor.
- `src/components/features/OfflineDataBanner.jsx` — banner global.
- `e2e/sw-cache.e2e.mjs` + `e2e/README.md` (Suite 2) — verificacion E2E.
- Rama `fix/cache-token-sw`, 4 commits: ccbce05 (SW injectManifest),
  7c7a95d (banner offline), 74a1171 (crossorigin fonts), 4ff32e6 (E2E).

---

## UpdateBanner es codigo muerto con registerType autoUpdate

**Estado:** RESUELTA (2026-07-14).

**Hallazgo (verificacion adversarial 2026-07-14, confirmado contra el bundle de
produccion):** vite-plugin-pwa en modo `registerType: 'autoUpdate'` nunca invoca el
callback `onNeedRefresh`, que es lo unico que pone `needRefresh` a true. El
`UpdateBanner` que montaba `src/main.jsx` (via `useRegisterSW`) era por tanto codigo
muerto: toda actualizacion se aplica por recarga automatica silenciosa. Verificado
que esa recarga deja la pagina 100% funcional (skipWaiting + clientsClaim +
lazyWithRetry), asi que no habia riesgo para el usuario — solo inconsistencia entre
configuracion e intencion de UI.

**Componente afectado:** `src/components/ui/UpdateBanner.jsx` (el boton "Actualizar"
jamas aparecia en produccion; compilaba sin error, pero era inerte).

**Opciones de fix:**

1. **Quitar UpdateBanner:** aceptar la auto-actualizacion silenciosa que ya ocurre.
   Opcion mas simple, cero cambio de comportamiento real.
2. **Cambiar a `registerType: 'prompt'`:** el usuario decide cuando actualizar via
   el banner (que pasaria a funcionar de verdad). Cambia el comportamiento de
   deploy: las pestanas abiertas dejarian de auto-actualizarse.

**Como se resolvio:** decision de producto por opcion 1. Se borraron
`src/components/ui/UpdateBanner.jsx` y su test `src/tests/UpdateBanner.test.jsx`.
El registro del Service Worker en `src/main.jsx` ahora es explicito y minimo con
`registerSW()` de `virtual:pwa-register` (en vez del hook `useRegisterSW` de
`virtual:pwa-register/react`) — la auto-actualizacion silenciosa se mantiene tal
cual, solo cambia el mecanismo de registro.

**Nota cosmetica relacionada:** `logova1.png` aparece 2 veces en el precache
manifest (17 entradas declaradas, 16 recursos unicos) porque lo recogen tanto los
globPatterns como los iconos del manifest. Sin efecto funcional.
