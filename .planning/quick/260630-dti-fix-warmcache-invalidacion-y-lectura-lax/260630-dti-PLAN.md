---
phase: quick-260630-dti
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [apps-script/Código.js]
autonomous: true
requirements: [AUDIT-WARMCACHE-INVAL, AUDIT-LECTURA-LAX]
must_haves:
  truths:
    - "Cuando un profesor guarda asistencia o justifica una falta, la clave de resumen calentada (res_<conv>__) se purga del cache aunque el indice _keys ya haya expirado"
    - "El CEO ve el resumen actualizado tras una escritura, no la version stale de hasta 6h"
    - "Un alumno con activo en formato texto (VERDADERO/TRUE/1/SI/X) sigue apareciendo en la app, no desaparece"
    - "Las 336 filas de alumnos quedan cubiertas por el checkbox de setupSheets"
    - "presente y justificada siguen evaluandose de forma estricta (=== true), sin cambios"
  artifacts:
    - path: "apps-script/Código.js"
      provides: "cacheInvalidate con purga determinista de la clave calentada huerfana + helper isTruthy + lecturas laxas de activo/activa + CHECKBOX_ROWS ampliado"
      contains: "function isTruthy"
  key_links:
    - from: "cacheInvalidate"
      to: "cache_.remove(prefijo + '__')"
      via: "purga determinista por prefijo res_"
      pattern: "cache_\\.remove\\("
    - from: "handleGetConvocatorias / handleGetProfesores / handleGetAlumnos / computeResumen / warmCache"
      to: "isTruthy"
      via: "filtro de activo/activa"
      pattern: "isTruthy\\("
---

<objective>
Aplicar dos fixes baratos e independientes al backend Apps Script (`apps-script/Código.js`), salidos de una auditoria. Cada fix es un commit atomico propio.

Purpose:
- **Fix 1 (warmCache invalidacion):** la clave de resumen calentada vive 6h (WARM_TTL) pero el indice `_keys` que usa `cacheInvalidate` solo vive 6 min (CACHE_TTL*3). Tras 6 min la clave calentada queda huerfana y las escrituras (guardar/justificar) ya no la purgan -> el CEO ve resumen stale hasta 6h.
- **Fix 2 (lectura laxa de activo):** `setupSheets` solo pone checkbox en 50 filas pero hay 336 alumnos. En filas sin checkbox, `activo` puede ser texto (`'VERDADERO'`/`'TRUE'`/`1`) y los filtros `=== true` descartan al alumno -> desaparece de la app.

Output: `apps-script/Código.js` modificado con 2 commits `fix:` en espanol. Ningun otro archivo se toca.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@apps-script/Código.js

<constraints>
- Solo se modifica `apps-script/Código.js`. NO tocar otros archivos.
- Backend Apps Script unicamente (este branch). No tocar UI ni frontend.
- UI/comentarios en espanol; codigo (identificadores) en ingles (regla CLAUDE.md).
- Conventional Commits en espanol, prefijo `fix:`. UN commit por tarea, atomico.
- Los numeros de linea del plan son los reales verificados contra el archivo actual; aun asi, localiza por contenido (no solo por numero) antes de editar, por si el archivo corre.
- Apps Script no tiene tooling de test/lint local en este repo (`apps-script/` esta excluido de ESLint, ver STATE.md). La verificacion es por inspeccion estatica con grep, no por ejecucion.
</constraints>

<interfaces>
<!-- Contratos clave ya en el archivo. El ejecutor los usa directamente, sin explorar. -->

Cache (lineas 26-95):
```javascript
const CACHE_TTL = 120;        // 2 min — TTL por defecto
const WARM_TTL = 21600;       // 6h — TTL de warmCache (linea 30)
const cache_ = CacheService.getScriptCache();

function cacheInvalidate(prefixes) { ... }   // lineas 59-75 — purga via indice _keys
function cacheTrackKey(key) { ... }          // lineas 80-87 — _keys vive CACHE_TTL*3 = 360s
```

Clave global calentada (warmCache, lineas 1057-1062):
```javascript
const cacheKey = 'res_' + c.id + '_' + '' + '_' + '';   // == 'res_<conv>__'
cachedGet(cacheKey, function() { ... }, WARM_TTL);
```

Llamadas a invalidar tras escritura (lineas 734, 864):
```javascript
cacheInvalidate(['res_' + convocatoria_id, 'asist_' + convocatoria_id]);
```

Filtros de activo/activa a relajar (estrictos hoy):
- linea 256 (handleGetConvocatorias):  `c.activa === true && ...`
- linea 271 (handleGetProfesores):     `.filter(p => p.activo === true)`
- linea 296 (handleGetAlumnos):        `.filter(a => a.activo === true)`
- linea 399 (computeResumen):          `.filter(a => a.activo === true && ...)`
- linea 1034 (warmCache):              `.filter(c => c.activa === true && ...)`

NO tocar (deben seguir estrictos === true, los escribe el codigo):
- `presente === true`  (lineas 347, 448, 703, 854)
- `justificada === true` (lineas 347, 450, 521, 540)

Seccion UTILIDADES: lineas 97-183 (aqui va el helper isTruthy).
CHECKBOX_ROWS = 50: linea 1116, usado en linea 1128.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Tarea 1: fix warmCache invalidacion — purga determinista de la clave calentada huerfana</name>
  <files>apps-script/Código.js</files>
  <action>
En la funcion `cacheInvalidate` (lineas 59-75), tras el bloque de purga via `_keys` (mantenerlo INTACTO: el `cache_.get('_keys')`, el early-return, el filtro `toRemove`, el `removeAll`, y la reescritura/borrado de `_keys`), anadir una purga determinista adicional al final de la funcion, antes del cierre `}`.

La purga determinista: para cada prefijo en `prefixes` que empiece por `'res_'`, ejecutar `cache_.remove(prefijo + '__')`. Esto borra la clave global calentada `res_<conv>__` (que warmCache cachea con profesor_id y grupo vacios, ver linea 1057) aunque el indice `_keys` ya no la liste. Implementarlo recorriendo `prefixes` (ej. `prefixes.forEach`) y dentro, si `p.indexOf('res_') === 0` (o `p.startsWith('res_')`), `cache_.remove(p + '__')`.

Mover el early-return actual de la cabecera: hoy la funcion hace `if (!keysJson) return;` en la linea 61, lo que abortaria ANTES de la purga determinista cuando `_keys` no existe (justo el caso que queremos cubrir: index expirado). Reestructurar para que la purga determinista se ejecute SIEMPRE, incluso si `_keys` esta ausente. Concretamente: NO retornar temprano; envolver el bloque de `_keys` en `if (keysJson) { ... }` (con el JSON.parse, filter, removeAll y reescritura dentro) y dejar la purga determinista de `res_*__` fuera de ese `if`, al final, para que corra tanto si `_keys` existe como si no.

Comentario en espanol justo encima de la purga determinista explicando el porque: la clave calentada vive 6h (WARM_TTL) pero el indice _keys solo 6 min (CACHE_TTL*3), asi que a partir del minuto 6 _keys ya no lista la clave calentada; esta purga por prefijo la borra siempre y evita que el CEO vea resumen stale.

NO tocar las llamadas a `cacheInvalidate` (lineas 734, 864, 927, 1000) — la firma `cacheInvalidate(prefixes)` no cambia. NO tocar `cacheTrackKey`, `cacheGet`, `cachedGet`, ni `WARM_TTL`.

Tras editar, hacer el commit atomico de ESTA tarea (solo este cambio):
`git add apps-script/Código.js && git commit -m "fix: cacheInvalidate purga la clave de resumen calentada huerfana"`
con cuerpo en espanol explicando el desfase de TTL (6h calentado vs 6 min indice).
  </action>
  <verify>
<automated>cd "c:/Users/Usuario/Desktop/novattend" && grep -nE "cache_\.remove\([a-zA-Z]+ ?\+ ?'__'\)" "apps-script/Código.js" && grep -c "function cacheInvalidate" "apps-script/Código.js" && node --check "apps-script/Código.js" 2>&1 | grep -v "import\|export\|SpreadsheetApp\|CacheService" || echo "syntax-check-skip-gas-globals"</automated>
  </verify>
  <done>
`cacheInvalidate` contiene una purga `cache_.remove(<prefijo> + '__')` para prefijos `res_` que se ejecuta aunque `_keys` no exista (sin early-return que la bloquee); el bloque `_keys` original sigue intacto dentro de un `if (keysJson)`; hay comentario en espanol justificando el desfase de TTL; commit `fix:` atomico creado solo con este cambio.
  </done>
</task>

<task type="auto">
  <name>Tarea 2: fix lectura laxa de activo/activa — no perder alumnos en filas sin checkbox</name>
  <files>apps-script/Código.js</files>
  <action>
**Paso A — helper `isTruthy`.** En la seccion UTILIDADES (lineas 97-183, junto a `sheetToObjects`/`jsonResponse`/`generateId`), anadir una funcion `isTruthy(v)` con JSDoc en la cabecera (comentario en espanol). Debe devolver `true` si:
- `v === true`, o
- `v === 1`, o
- `v` es string y `v.trim().toUpperCase()` esta en `['TRUE', 'VERDADERO', 'SI', 'SÍ', 'X', '1']`.
En cualquier otro caso devolver `false`. Comprobar `typeof v === 'string'` antes de llamar `.trim()`/`.toUpperCase()` para no romper con numeros/booleanos/null. El JSDoc explica que cubre filas de Sheets sin checkbox donde `activo` llega como texto en vez de booleano nativo.

**Paso B — reemplazar filtros estrictos de activo/activa por `isTruthy(...)`** en estas 5 ubicaciones (localizar por contenido, no solo por numero):
- linea 256 `handleGetConvocatorias`: `c.activa === true` -> `isTruthy(c.activa)` (mantener intactas las comparaciones de fecha `c.fecha_inicio <= hoy && hoy <= c.fecha_fin`).
- linea 271 `handleGetProfesores`: `p.activo === true` -> `isTruthy(p.activo)`.
- linea 296 `handleGetAlumnos`: `a.activo === true` -> `isTruthy(a.activo)`.
- linea 399 `computeResumen`: `a.activo === true` -> `isTruthy(a.activo)` (mantener `&& a.convocatoria_id === convocatoriaId`).
- linea 1034 `warmCache`: `c.activa === true` -> `isTruthy(c.activa)` (mantener el resto del filtro de fechas).

**Paso C — NO tocar** `presente === true` (lineas 347, 448, 703, 854) ni `justificada === true` (lineas 347, 450, 521, 540): esos valores los escribe el codigo y deben seguir estrictos.

**Paso D — ampliar `CHECKBOX_ROWS`** (linea 1116) de `50` a `400` para cubrir los 336 alumnos con margen. Actualizar el comentario adyacente (lineas 1114-1115) si menciona "pocas filas", para que sea coherente con el nuevo limite y siga en espanol.

Tras editar, hacer el commit atomico de ESTA tarea (solo estos cambios):
`git add apps-script/Código.js && git commit -m "fix: lectura laxa de activo/activa para no perder alumnos sin checkbox"`
con cuerpo en espanol explicando que filas 51+ con `activo` en texto desaparecian y que CHECKBOX_ROWS sube de 50 a 400.
  </action>
  <verify>
<automated>cd "c:/Users/Usuario/Desktop/novattend" && grep -c "function isTruthy" "apps-script/Código.js" && [ "$(grep -c "isTruthy(" "apps-script/Código.js")" -ge 6 ] && grep -nE "CHECKBOX_ROWS = 400" "apps-script/Código.js" && grep -nE "(activa|activo) === true" "apps-script/Código.js"; test "$(grep -cE "\.(activa|activo) === true" "apps-script/Código.js")" -eq 0 && echo "OK-no-strict-activo-remaining" && grep -nE "(presente|justificada) === true" "apps-script/Código.js" | head -1</automated>
  </verify>
  <done>
Existe `function isTruthy(v)` con JSDoc en espanol en UTILIDADES; las 5 ubicaciones de `activo`/`activa` usan `isTruthy(...)` (cero `*.activo === true` / `*.activa === true` estrictos restantes); `presente === true` y `justificada === true` permanecen estrictos sin cambios; `CHECKBOX_ROWS = 400`; commit `fix:` atomico creado solo con este cambio.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| profesor/CEO -> Apps Script Web App | Entrada autenticada por API key; este plan no toca auth ni rutas, solo logica de cache y coaccion de tipos de lectura |
| Sheets (datos de Aurora) -> backend | Datos en filas pueden venir como texto en vez de booleano; el fix coacciona en lectura, no en escritura |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | Tampering (datos stale) | cacheInvalidate / clave calentada res_<conv>__ | mitigate | Purga determinista por prefijo `res_*__` que corre aunque `_keys` haya expirado (Tarea 1) |
| T-quick-02 | Information disclosure (alumno omitido) | filtros activo/activa | mitigate | `isTruthy` acepta texto VERDADERO/TRUE/1/SI/X ademas de booleano nativo, evitando descartar alumnos validos (Tarea 2) |
| T-quick-03 | Tampering (relajar de mas) | presente/justificada | accept | Se mantienen estrictos `=== true`; el codigo los escribe como booleanos, no se relajan |
| T-quick-SC | Tampering | instalacion de paquetes npm/pip/cargo | accept | No hay instalaciones de paquetes en este plan; solo edicion de un archivo Apps Script existente |
</threat_model>

<verification>
Verificacion por inspeccion estatica (Apps Script no se ejecuta/lintea localmente en este repo; `apps-script/` esta fuera de ESLint segun STATE.md):

1. `cacheInvalidate` tiene purga `cache_.remove(<prefijo> + '__')` para `res_` que NO esta detras de un early-return sobre `_keys`.
2. El bloque original de `_keys` (parse/filter/removeAll/reescritura) sigue presente, envuelto en `if (keysJson)`.
3. `function isTruthy(v)` existe en UTILIDADES con JSDoc en espanol y maneja string/numero/booleano.
4. Las 5 ubicaciones de activo/activa usan `isTruthy(...)`; cero `*.activo === true` / `*.activa === true` restantes.
5. `presente === true` y `justificada === true` intactos.
6. `CHECKBOX_ROWS = 400`.
7. `git log --oneline -2` muestra dos commits `fix:` atomicos y separados (uno por tarea), en espanol.
8. `git status` muestra que solo `apps-script/Código.js` fue modificado.
</verification>

<success_criteria>
- Dos commits `fix:` atomicos en espanol, uno por fix, solo sobre `apps-script/Código.js`.
- Fix 1: una escritura (guardar/justificar) purga la clave calentada `res_<conv>__` aunque `_keys` haya expirado; el resumen del CEO deja de quedar stale hasta 6h.
- Fix 2: alumnos en filas sin checkbox (con `activo` en texto) siguen apareciendo; `presente`/`justificada` siguen estrictos; CHECKBOX_ROWS cubre los 336 alumnos.
- Ningun otro archivo modificado. Sin estilos inline (no aplica al backend). Comentarios nuevos en espanol, identificadores en ingles.
</success_criteria>

<output>
Crear `.planning/quick/260630-dti-fix-warmcache-invalidacion-y-lectura-lax/260630-dti-SUMMARY.md` al terminar.
</output>
