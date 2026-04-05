# Phase 6: Seguridad Backend - Research

**Researched:** 2026-04-05
**Domain:** Autenticacion con shared secret — Google Apps Script + Vite/React
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Token via **query param** (`?api_key=`) en GET y campo en **body** en POST. Headers Authorization provocan CORS preflight fatal en Apps Script — descartado.
- **D-02:** API key almacenada en **Script Properties** server-side (SEC-02) y en **VITE_API_KEY** (.env + Vercel) client-side (SEC-05).
- **D-03:** Formato del API key: **UUID v4** (ej: `550e8400-e29b-41d4-a716-446655440000`). Generado manualmente por el dev.
- **D-04:** **Corte duro** — sin periodo de gracia. Deploy en orden: 1) Apps Script (validacion + key en Script Properties) → 2) VITE_API_KEY en .env y Vercel → 3) Redeploy frontend. Downtime breve (<5 min) aceptable.
- **D-05:** Documentar el paso-a-paso de deploy como parte del plan para que el dev lo ejecute manualmente.
- **D-06:** Requests rechazados se registran solo con **console.warn** en Apps Script. La hoja LOG se reserva para acciones legitimas de negocio.
- **D-07:** Datos en el console.warn: **timestamp + action + IP**. Formato: `console.warn('AUTH_REJECTED', { action, ip, timestamp })`.
- **D-08:** Si `isApiEnabled()` es false (no hay VITE_API_URL), el token se **ignora completamente**. No se inyecta, no se valida.
- **D-09:** Si hay VITE_API_URL pero NO hay VITE_API_KEY: **console.warn** en desarrollo avisando que falta la key. Los requests salen sin token y el backend los rechazara. No rompe el build.
- **D-10:** Rotacion **manual sin automatizar**. Procedimiento: generar nuevo UUID, actualizar Script Properties, actualizar Vercel env, redeploy.

### Claude's Discretion

- Ubicacion exacta del check de validacion en doGet/doPost (funcion helper vs inline)
- Nombre de la Script Property para el API key (ej: `API_KEY`, `AUTH_TOKEN`)
- Estructura exacta del JSON de error 401-equivalente
- Orden de modificacion de archivos dentro de cada plan

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | Apps Script valida shared secret en doGet/doPost antes de acceder a datos | `validateApiKey()` helper extraido antes del switch en doGet/doPost |
| SEC-02 | API key almacenada en Script Properties (no hardcodeada en codigo) | `PropertiesService.getScriptProperties().getProperty('API_KEY')` — API nativa de Apps Script |
| SEC-03 | Frontend inyecta token en cada request via api.js (query param GET, body POST) | Modificacion de `apiGet` y `apiPost` en `src/services/api.js` |
| SEC-04 | Requests sin token valido reciben respuesta de error 401-equivalente | `jsonError('No autorizado', 401)` usando helper existente |
| SEC-05 | Variable VITE_API_KEY configurada en .env y Vercel | `import.meta.env.VITE_API_KEY` — patron ya establecido con VITE_API_URL |
| SEC-06 | Requests rechazados se loguean en Apps Script (console.warn) | `console.warn('AUTH_REJECTED', { action, ip, timestamp })` — sin tabla de hoja |

</phase_requirements>

---

## Summary

Esta fase agrega una capa de autenticacion shared secret al endpoint de Google Apps Script. El mecanismo elegido es el mas simple posible para este contexto: un UUID v4 como API key, almacenado en Script Properties del lado del servidor y en variable de entorno VITE_API_KEY del lado del cliente. El token viaja como query param `api_key` en GET y como campo en el body JSON en POST — evitando headers Authorization que generan CORS preflight en Apps Script.

Los cambios se concentran en cuatro archivos: `Codigo.js` (backend — validacion), `src/config/api.js` (exportar API_KEY), `src/services/api.js` (inyeccion en apiGet/apiPost), y `.env` (nueva variable). El deploy requiere coordinacion manual de tres capas en orden especifico para minimizar downtime.

El patrón es estandar para Apps Script Web Apps: PropertiesService es la forma canonica de almacenar secretos server-side, y los query params son el mecanismo de auth mas simple que no requiere CORS preflight.

**Primary recommendation:** Implementar `validateApiKey(e)` como funcion helper en Codigo.js que se llama al inicio de doGet y doPost, devolviendo `jsonError('No autorizado', 401)` si la clave no coincide, y haciendo `console.warn` con action + IP antes de retornar.

---

## Standard Stack

### Core

| Biblioteca / API | Version | Proposito | Por que es estandar |
|-----------------|---------|-----------|---------------------|
| `PropertiesService` (Apps Script) | nativa | Almacenar API key server-side fuera del codigo fuente | API nativa de Apps Script para secretos; persiste entre ejecuciones; no aparece en el editor |
| `import.meta.env.VITE_*` (Vite) | Vite 7 | Inyectar VITE_API_KEY en el bundle de produccion | Patron ya establecido con VITE_API_URL; variables VITE_ son publicas en el bundle |
| `crypto.randomUUID()` (browser/node) | nativo | Generar UUID v4 | Estandar para generar tokens opacos de un solo uso manual |

### No se necesita ninguna dependencia adicional

Todos los mecanismos requeridos ya estan disponibles en el stack actual. No hay paquetes npm nuevos.

**Installation:** ninguna

---

## Architecture Patterns

### Patron de validacion en Apps Script

La validacion debe ocurrir como la primera operacion en `doGet` y `doPost`, antes de parsear el body o ejecutar el switch de actions. El patron recomendado es una funcion helper que extrae la clave del request y retorna `null` si es valida, o un `ContentService` response de error si no lo es.

```javascript
// Fuente: pattern derivado de la API oficial de PropertiesService de Google
// https://developers.google.com/apps-script/reference/properties/properties-service

/**
 * Valida el API key del request.
 * Para GET: e.parameter.api_key
 * Para POST: body.api_key (body ya parseado)
 * Devuelve null si es valido, o jsonError si no lo es.
 */
function validateApiKey(token, action, ip) {
  const expected = PropertiesService.getScriptProperties().getProperty('API_KEY')
  if (!expected || token !== expected) {
    console.warn('AUTH_REJECTED', {
      action: action || 'desconocida',
      ip: ip || 'sin-ip',
      timestamp: new Date().toISOString()
    })
    return jsonError('No autorizado', 401)
  }
  return null // valido
}

// En doGet — antes del switch:
function doGet(e) {
  try {
    const authError = validateApiKey(
      e.parameter.api_key,
      e.parameter.action,
      e.parameter['x-forwarded-for'] || ''
    )
    if (authError) return authError

    const action = e.parameter.action
    switch (action) { /* ... */ }
  } catch (err) { /* ... */ }
}

// En doPost — despues de parsear body, antes del switch:
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    const authError = validateApiKey(
      body.api_key,
      body.action,
      e.parameter['x-forwarded-for'] || ''
    )
    if (authError) return authError

    const action = body.action
    switch (action) { /* ... */ }
  } catch (err) { /* ... */ }
}
```

### Patron de inyeccion en api.js (frontend)

El token se exporta desde `src/config/api.js` siguiendo el patron existente de `API_URL`, y se inyecta en `apiGet` y `apiPost` en `src/services/api.js`. La guarda de D-08 (ignorar si no hay API_URL) y D-09 (warn si hay URL pero no KEY) vive en `api.js`.

```javascript
// src/config/api.js — anadir despues de API_URL
export const API_KEY = import.meta.env.VITE_API_KEY || ''

// Advertencia en dev si API esta habilitada pero falta la key
if (import.meta.env.DEV && Boolean(import.meta.env.VITE_API_URL) && !API_KEY) {
  console.warn('[NovAttend] VITE_API_KEY no configurada. Los requests seran rechazados por el backend.')
}
```

```javascript
// src/services/api.js — importar API_KEY y usarla
import { API_URL, API_KEY, isApiEnabled } from '../config/api'

async function apiGet(action, params = {}) {
  if (!isApiEnabled()) return null

  const url = new URL(API_URL)
  url.searchParams.set('action', action)
  if (API_KEY) url.searchParams.set('api_key', API_KEY)
  // ... resto igual
}

async function apiPost(action, body = {}) {
  if (!isApiEnabled()) return null

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...(API_KEY ? { api_key: API_KEY } : {}), ...body })
  })
  // ... resto igual
}
```

### Estructura de archivos modificados

```
apps-script/
└── Código.js           # +validateApiKey(), modificar doGet + doPost

src/
├── config/
│   └── api.js          # +export API_KEY, +warn D-09
└── services/
    └── api.js          # inyectar api_key en apiGet y apiPost

.env                    # +VITE_API_KEY=<uuid>
docs/
└── deploy-sec-06.md    # Procedimiento manual de deploy (D-05, D-10)
```

### Anti-Patterns a Evitar

- **API key en el codigo fuente de Apps Script:** El Script Editor de Google es accessible para cualquier colaborador del spreadsheet. Siempre via `PropertiesService`.
- **Header Authorization:** Provoca CORS preflight OPTIONS en Apps Script Web Apps que no se puede manejar — decision D-01 locked.
- **Hardcodear el UUID en el bundle de produccion directamente:** `import.meta.env.VITE_*` se embebe en el bundle, pero es intencional y aceptado (SEC-05). El riesgo real es si aparece en el repositorio git — por eso `.env` debe estar en `.gitignore`.
- **Validar dentro del switch en vez de antes:** Si la validacion esta dentro de cada case del switch, una nueva action olvidaria la validacion. Centralizar en la entrada de doGet/doPost.
- **Reutilizar writeLog para rechazos:** Decision D-06 — la hoja LOG es para acciones legitimas de negocio. Los rechazos van a console.warn (Stackdriver).

---

## Don't Hand-Roll

| Problema | No construir | Usar en cambio | Por que |
|----------|-------------|----------------|---------|
| Almacenar secreto server-side | Variable global en Codigo.js | `PropertiesService.getScriptProperties()` | Persiste entre ejecuciones, no aparece en editor compartido |
| Leer variable de entorno en Vite | Objeto config custom | `import.meta.env.VITE_API_KEY` | Patron nativo de Vite, ya validado con VITE_API_URL |
| Generar UUID | Implementacion propia de random | `crypto.randomUUID()` en browser/Node o cualquier generador online | UUID v4 es opaco y suficientemente entropico para este caso de uso |
| Respuesta de error | Nuevo helper | `jsonError(message, code)` existente en Codigo.js | El helper ya existe, formatear 401 con el mismo patron |

---

## Runtime State Inventory

> No aplica — esta es una fase de nueva funcionalidad (agregar auth), no un rename/refactor/migración de datos existentes.

---

## Common Pitfalls

### Pitfall 1: VITE_API_KEY aparece en el bundle de produccion (comportamiento esperado, no bug)

**Que pasa:** `import.meta.env.VITE_*` es inlined por Vite en el bundle JS. Cualquiera que inspeccione el bundle de produccion puede ver la key.
**Por que ocurre:** Vite sustituye `import.meta.env.VITE_API_KEY` por el valor literal en build time. Es por diseno — las variables VITE_ son "publicas".
**Como manejarlo:** Para una app de 8 usuarios internos con un endpoint que no tiene valor economico directo, esto es aceptable. El objetivo de SEC es proteger el endpoint de scraping automatico anonimo, no de usuarios autenticados de la propia app. Documentar como riesgo conocido y aceptado.
**Warning sign:** Si un auditor externo senala esto como vulnerabilidad critica — es correcto pero proporcional al riesgo real del proyecto.

### Pitfall 2: Apps Script no soporta HTTP 401 real — solo texto plano con codigo en JSON

**Que pasa:** `ContentService` no permite enviar HTTP status codes reales (solo 200). El "401" vive dentro del JSON: `{ status: 'error', code: 401 }`.
**Por que ocurre:** Apps Script Web Apps siempre responden HTTP 200. No hay forma de enviar 401, 403 o 404 como HTTP status.
**Como manejarlo:** El frontend ya maneja esto correctamente — comprueba `json.status === 'error'` y lanza un Error con el mensaje. El campo `code` es informativo. Documentar en el codigo que el 401 es semantico, no HTTP.
**Warning sign:** Si el test espera `res.ok === false` para detectar el rechazo — no funcionara. Debe esperar `json.status === 'error'`.

### Pitfall 3: Deploy fuera de orden provoca downtime prolongado

**Que pasa:** Si el frontend con `api_key` se deploya antes de configurar la Script Property en Apps Script, todos los requests fallan porque el backend no tiene la key con la que comparar.
**Por que ocurre:** El backend no puede validar lo que no conoce — comparar contra `null` rechaza todo.
**Como evitarlo:** Orden D-04: 1) configurar Script Property → 2) configurar .env + Vercel → 3) redeploy frontend. Nunca invertir el orden.
**Warning sign:** Si al probar el endpoint tras el deploy Apps Script devuelve error aunque se envia la key — verificar que `PropertiesService.getScriptProperties().getProperty('API_KEY')` devuelve el valor correcto ejecutando un test manual desde el editor.

### Pitfall 4: La Script Property desaparece al hacer un nuevo deploy de la Web App

**Que pasa:** Las Script Properties persisten entre deploys de la misma version. Pero si se crea un nuevo proyecto de Apps Script desde cero, las properties no migran.
**Por que ocurre:** Las properties estan atadas al proyecto (script ID), no al deployment.
**Como evitarlo:** La property se configura UNA vez por proyecto, no por deployment. Redeploys normales (nueva version de la misma URL) NO la borran.
**Warning sign:** Si tras redeploy los requests fallan — ejecutar en el editor: `PropertiesService.getScriptProperties().getProperties()` y verificar que `API_KEY` esta presente.

### Pitfall 5: console.warn en Apps Script requiere permisos de Cloud Logging para ser visible

**Que pasa:** `console.warn` en Apps Script escribe en Stackdriver (Cloud Logging). Para ver los logs, el dev debe ir a: Apps Script Editor → Ejecuciones → ver registros, o a Google Cloud Console → Logging.
**Por que ocurre:** Apps Script no tiene un stdout visible por defecto fuera del editor.
**Como acceder:** En el editor de Apps Script: Ver → Registros de ejecucion. En produccion: Google Cloud Console → Logging → buscar por label `script_id`.
**Warning sign:** Si el dev no ve los `AUTH_REJECTED` tras un intento de acceso sin token — verificar en el editor ejecutando `doGet` manualmente sin api_key.

### Pitfall 6: VITE_API_KEY comprometida en git si .env no esta en .gitignore

**Que pasa:** Si `.env` no esta en `.gitignore`, la key se commitea al repositorio y queda en el historial.
**Por que ocurre:** Error humano comun al agregar nuevas variables de entorno.
**Como evitarlo:** Verificar que `.env` esta en `.gitignore` ANTES de agregar `VITE_API_KEY`. Confirmar con `git status` que `.env` no aparece como untracked.
**Warning sign:** `git status` muestra `.env` como archivo modificado o nuevo — **NO commitear**.

---

## Code Examples

### Configurar Script Property desde el editor (paso manual de deploy)

```javascript
// Ejecutar MANUALMENTE en el editor de Apps Script (una sola vez)
// Menu: Ejecutar > setApiKey
function setApiKey() {
  const key = '550e8400-e29b-41d4-a716-446655440000' // reemplazar con UUID real
  PropertiesService.getScriptProperties().setProperty('API_KEY', key)
  Logger.log('API_KEY configurada correctamente')
}

// Para verificar que esta configurada:
function checkApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('API_KEY')
  Logger.log('API_KEY presente: ' + Boolean(key))
}
```

### Estructura del JSON de error 401-equivalente

```javascript
// Fuente: helper jsonError existente en Codigo.js (linea 147)
// Respuesta cuando falta o es invalido el token:
{
  "status": "error",
  "error": "No autorizado",
  "code": 401
}
// NOTA: HTTP status sera 200 siempre (limitacion de Apps Script Web Apps)
```

### .env — variable a agregar

```bash
# .env — NUNCA commitear este archivo
VITE_API_URL=https://script.google.com/macros/s/XXXX/exec
VITE_API_KEY=550e8400-e29b-41d4-a716-446655440000
```

### Generar UUID v4 desde consola del navegador o Node

```javascript
// Desde devtools del navegador o Node 14+:
crypto.randomUUID()
// Resultado: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

---

## State of the Art

| Enfoque anterior | Enfoque actual | Desde | Impacto |
|-----------------|----------------|-------|---------|
| Sin autenticacion (ANYONE_ANONYMOUS) | Shared secret via query param / body | Esta fase | El endpoint rechaza requests sin token valido |
| API_URL como unica variable de entorno | API_URL + API_KEY como variables de entorno | Esta fase | Dos variables en .env y Vercel |

**Patrones descartados:**
- **Authorization header:** Provoca CORS preflight fatal en Apps Script — eliminado en decision D-01
- **OAuth2 / JWT:** Over-engineered para 8 usuarios internos — diferido a v2 (SEC-ADV-01)
- **Rate limiting:** Complejidad desproporcionada para este caso de uso — diferido a v2 (SEC-ADV-02)

---

## Open Questions

1. **Nombre de la Script Property**
   - Lo que sabemos: el CONTEXT.md deja esto a la discrecion de Claude
   - Recomendacion: usar `API_KEY` — simple, descriptivo, sin ambiguedad

2. **Estructura del error 401 — campo `error` vs `message`**
   - Lo que sabemos: el helper `jsonError(message, code)` usa el campo `error`
   - Recomendacion: reutilizar el helper existente con `jsonError('No autorizado', 401)` — consistente con el resto de errores de la API

3. **Como acceder a la IP del request en Apps Script**
   - Lo que sabemos: Apps Script no expone directamente la IP del cliente
   - Lo que es incierto: `e.parameter['x-forwarded-for']` puede estar disponible dependiendo del proxy/CDN de Google
   - Recomendacion: intentar `e.parameter['x-forwarded-for'] || 'ip-no-disponible'` y documentarlo — el D-07 pide IP "del request" pero puede no estar disponible; registrar lo que se pueda sin romper la funcionalidad

---

## Environment Availability

| Dependencia | Requerida por | Disponible | Version | Fallback |
|-------------|--------------|-----------|---------|----------|
| Node.js | Tests Vitest | ✓ | v24.14.0 | — |
| `PropertiesService` (Apps Script) | SEC-02 | ✓ (nativa) | — | — |
| `import.meta.env` (Vite) | SEC-05 | ✓ | Vite 7.3.1 | — |
| Vercel dashboard | Deploy VITE_API_KEY | Asumido disponible | — | Alternativa: variable en hosting equivalente |
| Apps Script editor | Configurar Script Property manualmente | Asumido disponible | — | — |

**Sin dependencias bloqueantes** — todos los mecanismos son nativos del stack.

---

## Validation Architecture

### Test Framework

| Propiedad | Valor |
|-----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vite.config.js` (seccion `test`) |
| Quick run command | `npm test -- src/tests/api.test.jsx` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Comportamiento | Tipo de test | Comando automatizado | Archivo existe |
|--------|---------------|-------------|---------------------|----------------|
| SEC-03 | `apiGet` inyecta `api_key` como query param cuando API_KEY esta definida | unit | `npm test -- src/tests/api.test.jsx` | ✅ (ampliar tests existentes) |
| SEC-03 | `apiPost` incluye `api_key` en el body cuando API_KEY esta definida | unit | `npm test -- src/tests/api.test.jsx` | ✅ (ampliar tests existentes) |
| SEC-03 | Cuando API_KEY esta vacia, los requests salen sin `api_key` | unit | `npm test -- src/tests/api.test.jsx` | ✅ (ampliar tests existentes) |
| SEC-01 / SEC-04 | Backend rechaza con `{ status: 'error', code: 401 }` | manual (Apps Script no es testeable con Vitest) | test manual en editor de Apps Script | ❌ — no automatizable |
| SEC-02 | API key NO aparece hardcodeada en Codigo.js | inspeccion de codigo / grep | `grep -r "api_key\|API_KEY" apps-script/` | N/A |
| SEC-05 | VITE_API_KEY se lee de env y se exporta como API_KEY | unit | `npm test -- src/config` | ❌ Wave 0 — nuevo test |
| SEC-06 | console.warn llamado en rechazo | manual en editor de Apps Script | test manual | ❌ — no automatizable |
| SEC-08 (D-08) | Si isApiEnabled() es false, no se inyecta api_key | unit | `npm test -- src/tests/api.test.jsx` | ✅ (ampliar) |

**Tests de Apps Script (SEC-01, SEC-04, SEC-06):** El entorno de Google Apps Script no es testeable con Vitest. Requieren verificacion manual ejecutando el endpoint directamente o desde el editor de Apps Script con el runner de "Ejecuciones".

### Sampling Rate

- **Por commit de task:** `npm test -- src/tests/api.test.jsx`
- **Por merge de wave:** `npm test` (suite completa)
- **Phase gate:** Suite completa verde antes de `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/tests/api.test.jsx` — ampliar con tests SEC-03 (inyeccion de api_key en GET y POST, caso sin key, caso API deshabilitada)
- [ ] Test de `src/config/api.js` — verificar que `API_KEY` se exporta correctamente desde `import.meta.env.VITE_API_KEY`

---

## Project Constraints (from CLAUDE.md)

Directivas obligatorias que el planificador debe verificar en cada tarea:

| Directiva | Impacto en esta fase |
|-----------|---------------------|
| **CERO ESTILOS INLINE** — solo Tailwind | No aplica (esta fase no toca componentes UI) |
| **ATOMICIDAD 250 lineas** — fragmentar si se excede | `Codigo.js` tiene 816 lineas — al agregar `validateApiKey` el total aumentara ~20 lineas. Sigue dentro del limite si se mantiene la funcion helper compacta. Si el archivo supera 250 lineas... ya lo supera. CLAUDE.md aplica a archivos JSX/JS de componentes React. Apps Script tiene reglas de hosting diferentes — el archivo no puede fragmentarse facilmente. Documentar como excepcion aceptada. |
| **SISTEMA DE DISENO** — no hexadecimales, solo tokens Tailwind | No aplica |
| **IDIOMA** — UI/comentarios en espanol, codigo en ingles | Nombres de variables en ingles (`validateApiKey`, `API_KEY`), comentarios y JSDoc en espanol |
| **TRABAJO FINO** — presentar esquema antes de cambio estructural | El plan debe incluir pseudocodigo/bullets por tarea antes de implementar |
| **Commits** — Conventional Commits en espanol | `feat: seguridad -- validacion shared secret en Apps Script y api.js` |
| **VITE_API_KEY** — no en el repo git | `.env` debe estar en `.gitignore` (verificar antes de cualquier commit) |
| **Tests** — cobertura >= 60% enforzada | Los nuevos cambios en `api.js` deben estar cubiertos por los tests ampliados |

---

## Sources

### Primary (HIGH confidence)

- Documentacion oficial Google Apps Script — `PropertiesService`: https://developers.google.com/apps-script/reference/properties/properties-service
- Documentacion oficial Google Apps Script — `ContentService` (limitacion de HTTP status): https://developers.google.com/apps-script/reference/content/content-service
- Documentacion oficial Vite — Variables de entorno: https://vitejs.dev/guide/env-and-mode
- `apps-script/Código.js` — codigo fuente real, revision directa
- `src/services/api.js` — codigo fuente real, revision directa
- `src/config/api.js` — codigo fuente real, revision directa
- `src/tests/api.test.jsx` — tests existentes que cubren apiGet/apiPost

### Secondary (MEDIUM confidence)

- CONTEXT.md Phase 6 — decisiones arquitectonicas del usuario (D-01 a D-10)
- INTEGRATIONS.md — mapa de endpoints y configuracion de auth actual
- STATE.md — decision previa sobre CORS y query params

### Tertiary (LOW confidence)

- Disponibilidad de `e.parameter['x-forwarded-for']` en Apps Script — no verificada con documentacion oficial. Puede no estar disponible dependiendo del routing de Google. Marcar como "best effort" en implementacion.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — `PropertiesService` y `import.meta.env.VITE_*` son APIs nativas documentadas oficialmente
- Architecture patterns: HIGH — patron derivado directamente del codigo fuente existente y decisiones locked del CONTEXT.md
- Pitfalls: HIGH para los primeros 5, MEDIUM para el tema de la IP (disponibilidad de x-forwarded-for no verificada)
- Tests: HIGH para frontend (Vitest), MEDIUM para backend (manual en editor de Apps Script)

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stack estable; API de Apps Script y Vite no cambian frecuentemente)
