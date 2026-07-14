# Deuda tecnica

Registro de deuda tecnica conocida, con contexto y fix propuesto para cada entrada.

---

## Cache de API claveada por token

**Estado:** Aplazado (decision del equipo: fix propio, fuera de este ciclo).
**Mitigacion aplicada:** TTL de `api-cache` reducido de 24h a 3h en `vite.config.js`.

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
  mitigacion de bajar 24h → 3h).
- Tokens de sesion con persistencia mas larga que la propia sesion.

### Fix propuesto

Migrar la generacion del service worker de `generateSW` a `injectManifest` para
poder escribir logica propia:

1. **`cacheKeyWillBeUsed`** en la ruta de la API que **excluya el token** de la
   clave de cache (normalizar la URL quitando el parametro del token). Asi las
   entradas sobreviven a un re-login y no se persisten tokens en Cache Storage.
2. **Banner "datos sin conexion"** en la UI cuando la respuesta venga de la
   cache y no de la red, para que el profesor sepa que esta viendo datos
   posiblemente desactualizados.

### Referencias

- `vite.config.js` — bloque `runtimeCaching` / `api-cache` (comentario con la mitigacion).
- Auditoria: `docs/auditoria/04-pwa-offline.md`.
