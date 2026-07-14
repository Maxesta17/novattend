# Retire api_key — Resumen de ejecucion

## Rama
`chore/retire-api-key`

## Objetivo
Retirar por completo el api_key compartido (VITE_API_KEY / Script Property `API_KEY`)
del frontend y del gate de autorizacion del backend. La autenticacion queda exclusivamente
por token de sesion HMAC.

---

## Commits

| Hash      | Ambito   | Descripcion                                              |
|-----------|----------|----------------------------------------------------------|
| `17080ce` | Frontend | chore: retirar api_key del frontend — auth exclusiva por token |
| `b809943` | Backend  | chore: retirar camino legacy api_key del backend (Apps Script) |

---

## Cambios por archivo

### `src/config/api.js`
- Eliminado `export const API_KEY = import.meta.env.VITE_API_KEY || ''`
- Eliminado el bloque `console.warn` que avisaba si faltaba `VITE_API_KEY`
- JSDoc actualizado: ya no menciona auth por api_key

### `src/services/api.js`
- Eliminado `API_KEY` del import de `../config/api`
- `apiGet`: eliminada la linea `if (API_KEY) url.searchParams.set('api_key', API_KEY)`
- `apiPost`: eliminado `...(API_KEY ? { api_key: API_KEY } : {})` del body JSON
- Comentarios del modulo actualizados para reflejar auth exclusiva por token
- El token de sesion (`getToken()`) se sigue inyectando igual — sin cambios funcionales

### `src/tests/api.test.jsx`
- Retirado `API_KEY: 'test-key-uuid-fake-12345'` del mock de `../config/api`
- Retirado `API_KEY` del import de `../config/api`
- Los 4 tests SEC-03 que afirmaban que `api_key` ESTABA presente fueron
  reemplazados por 4 tests que afirman que `api_key` NO esta presente (negacion)
- Cobertura mantenida: 198 tests / 31 suites, todos verdes

### `apps-script/Código.js`
- Eliminada la constante `LEGACY_READONLY_ACTIONS = ['getConvocatorias']`
- `resolveAuth_`: eliminada la rama `if (LEGACY_READONLY_ACTIONS.indexOf(...))` que
  llamaba a `validateApiKey` y retornaba `{ legacy: true }`. Ahora sin token cualquier
  accion protegida devuelve directamente `401 token_invalid` via `requireAuth_`
- Firma simplificada: `resolveAuth_(action, token)` — el parametro `apiKey` fue retirado
- Llamada en `doGet` actualizada: `resolveAuth_(action, e.parameter.token || '')`
- Llamada en `doPost` actualizada: `resolveAuth_(action, body.token || '')`
- `validateApiKey`, `setApiKey`, `checkApiKey` se conservan como codigo muerto
  (funciones de utilidad/diagnostico inofensivas; no participan en ningun gate)
- JSDoc y comentarios de `resolveAuth_` y los gates actualizados en espanol

---

## Verificacion

| Check                  | Resultado |
|------------------------|-----------|
| `node --check Código.js` | SYNTAX OK |
| `npm test`             | 198 passed / 31 suites |
| `npm run lint`         | 0 errors (1 warning pre-existente en coverage/) |
| grep api_key en src/   | Solo comentarios y aserciones negativas — ningun envio real |

---

## Deviaciones
Ninguna — plan ejecutado exactamente como especificado.

---

## Estado post-merge
- `VITE_API_KEY` puede eliminarse del `.env` y de Vercel (variable huerfana)
- La Script Property `API_KEY` en Google Apps Script puede eliminarse (ya no se lee en el gate)
- `validateApiKey` / `setApiKey` / `checkApiKey` pueden eliminarse en una limpieza futura (codigo muerto inofensivo)
