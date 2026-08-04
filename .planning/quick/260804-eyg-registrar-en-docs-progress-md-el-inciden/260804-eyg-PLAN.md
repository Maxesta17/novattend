---
phase: quick-260804-eyg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - docs/progress.md
autonomous: true
requirements: [QUICK-260804-EYG]

must_haves:
  truths:
    - "docs/progress.md registra el incidente 2026-08-04 de convocatoria caducada con su causa raiz"
    - "Un agente futuro que lea progress.md entiende que fue un problema de DATO, no de codigo"
    - "Queda constancia del gotcha de cache de 120s al escribir la hoja por MCP"
    - "Queda constancia de que getConvocatorias no es verificable por curl (exige token HMAC)"
    - "Queda constancia de la asuncion pendiente sobre la fecha_fin de LING. ACDMY"
    - "Queda constancia de la deuda detectada (Marta sin alumnos, Joaquin asignado a Sven)"
    - "La seccion '## Ultimo Hito' del principio refleja el incidente del 2026-08-04"
  artifacts:
    - path: "docs/progress.md"
      provides: "Entrada de incidente 2026-08-04 en orden cronologico descendente"
      contains: "### 2026-08-04"
  key_links:
    - from: "docs/progress.md '## Ultimo Hito'"
      to: "docs/progress.md '### 2026-08-04'"
      via: "resumen del hito apunta al detalle de la entrada"
      pattern: "2026-08-04"
---

<objective>
Registrar en `docs/progress.md` el incidente del 2026-08-04: la convocatoria "abril 2026" (`conv-abr26`) caduco por fecha y dejo a 6 profesores sin grupos ni alumnos. Fix ya aplicado sobre la hoja (solo datos). Este plan SOLO documenta.

Purpose: `docs/progress.md` es el documento de relevo entre sesiones (regla CLAUDE.md). Un incidente cuya causa raiz es un dato en la hoja — invisible desde el repositorio — se repetira si no queda escrito. Ademas hay que dejar por escrito el gotcha del cache de 120s y una asuncion sin confirmar que puede morder en octubre.

Output: `docs/progress.md` modificado (seccion "## Ultimo Hito" actualizada + entrada nueva `### 2026-08-04` insertada arriba de la de 2026-07-28).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@CLAUDE.md
@docs/progress.md

<style_guide>
Estilo verificado sobre el fichero real (`docs/progress.md`, 428 lineas):

- Cabecera del fichero: `# Registro de Progreso - NovAttend`, seguida de `## Ultimo Hito` con bullets `- **Fecha:**` y `- **Hito:**`.
- Las entradas de detalle son `### YYYY-MM-DD — Titulo` (guion largo `—`, no `-`), en orden **cronologico descendente**: la mas reciente justo debajo del bloque `## Ultimo Hito`. La primera entrada actual es `### 2026-07-28 — Exclusion de profesores del recordatorio de lista (rama fix/excluir-maria-recordatorio)`.
- Dentro de cada entrada, bullets con etiqueta en negrita y dos puntos: `- **Sintoma:**`, `- **Causa raiz:**`, `- **Fix aplicado:**`, `- **Verificacion:**`, `- **Estado:**`, `- **Siguiente paso sugerido:**`.
- **Sin tildes** en la prosa (`Ultimo`, `causa raiz`, `verificacion`, `contrasena`, `deteccion`). Unica excepcion admitida: literales citados que sí las llevan en el producto (ej. `Código.js`, `"¿No recuerdas tu contraseña?"`). Respetar `Código.js` tal cual porque es el nombre real del archivo.
- Referencias a codigo en backticks con ruta y linea cuando aplica: `apps-script/Código.js:1038`.
- Las entradas son densas y factuales: cada bullet cierra una idea con evidencia, sin relleno.
</style_guide>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Anadir entrada del incidente 2026-08-04 y actualizar Ultimo Hito</name>
  <files>docs/progress.md</files>
  <action>
Dos ediciones sobre `docs/progress.md`. Nada mas. No tocar codigo, no tocar la hoja de calculo (el fix de datos YA esta aplicado), no tocar `CLAUDE.md`.

**Edicion A — reemplazar el contenido de la seccion `## Ultimo Hito`** (lineas 4-5 actuales, las que hoy hablan de Maria Wolf). Nueva `**Fecha:**` = 2026-08-04. Nuevo `**Hito:**` = resumen de una frase larga del incidente: convocatoria "abril 2026" caducada por `fecha_fin`, 6 profesores sin alumnos, fix de DATO en la hoja CONVOCATORIAS sin cambios de codigo, y el siguiente paso (confirmar con Aurora la fecha_fin real de LING. ACDMY). No inventar commits ni ramas: este cambio no toca codigo.

**Edicion B — insertar una entrada nueva** con cabecera `### 2026-08-04 — Incidente: convocatoria de abril caducada dejo a 6 profesores sin alumnos (fix de dato, sin codigo)` **inmediatamente encima** de la linea `### 2026-07-28 — Exclusion de profesores del recordatorio de lista (rama fix/excluir-maria-recordatorio)`, separada por linea en blanco. La entrada debe cubrir, en bullets al estilo del fichero, EXACTAMENTE estos hechos y ninguno inventado:

  1. `**Sintoma:**` reportado por Aurora via mensaje de un profesor. Profesores que antes elegian entre dos convocatorias ("abril 2026" y "LING. ACDMY") entraban directos a LING. ACDMY y no veian ni grupos ni alumnos.
  2. `**Causa raiz (DATO, no codigo):**` la hoja CONVOCATORIAS tenia `conv-abr26` con `fecha_fin = 2026-07-31`; siendo hoy 2026-08-04 dejo de cumplir la regla de activa `isTruthy(c.activa) && c.fecha_inicio <= hoy && hoy <= c.fecha_fin` (`apps-script/Código.js:1038`, `handleGetConvocatorias`). Al quedar UNA sola convocatoria activa, el frontend salta el selector y entra directo. Los 59 alumnos de abril seguian intactos en ALUMNOS: solo invisibles porque su `convocatoria_id` no coincidia con la unica activa. Dejar explicito que no se cambio ni una linea de codigo.
  3. `**Alcance real (mayor que el reportado):**` afectaba a 6 de los 7 profesores con alumnos en abril — Samuel 11, Nadine 10, Elisabeth Shick 10, Sonja 8, Stephanie 7, Christian 7, Myriam Marcia 6. Solo Elisabeth tenia alumnos en ambas convocatorias. El reporte inicial solo mencionaba a dos profesores.
  4. `**Fix aplicado (solo datos, via MCP google-sheets, escritura RAW del serial 46326 para preservar el formato de celda de fecha):**` `CONVOCATORIAS!D2` (conv-abr26 "abril 2026") 2026-07-31 -> 2026-10-31; `CONVOCATORIAS!D3` (conv-lingnova "LING. ACDMY") 2026-08-21 -> 2026-10-31, esta ultima porque caducaba en 17 dias y la recaida estaba garantizada.
  5. `**Verificacion (y sus limites):**` endpoint desplegado vivo (`?action=ping` -> 200 `{"status":"ok",...}`). `getConvocatorias` NO es verificable por curl: exige token de sesion HMAC y el camino legacy api_key fue retirado (`resolveAuth_`, `Código.js:997`); solo `ping` y `login` estan exentos. Un 401 `token_invalid` ahi es el gate funcionando, no un fallo. No se probaron passwords a ciegas porque el lockout durable anti-bruteforce habria bloqueado a un profesor real. Lo verificado es el dato en la hoja contra la regla de activa.
  6. `**Gotcha operativo:**` escribir en la hoja por MCP NO dispara `cacheInvalidate` del Apps Script. La clave `conv` de `cachedGet` en `handleGetConvocatorias` tiene `CACHE_TTL = 120s` (`Código.js:31` y `1035`), asi que el cambio tarda hasta 2 minutos en verse desde la app. Aplica a cualquier edicion futura de la hoja hecha fuera del backend.
  7. `**Asuncion pendiente de confirmar por Aurora:**` la fecha 31/10/2026 de LING. ACDMY se eligio por simetria con abril; nadie confirmo la fecha real de fin de esa convocatoria.
  8. `**Deuda detectada de paso (NO arreglada):**` `prof-marta` (Marta Battistella, activo=TRUE) tiene 0 alumnos en cualquier convocatoria; `prof-sven` (activo=FALSE, despedido) sigue con el alumno `alu-0056` Joaquin Orduno asignado en LING. ACDMY G4.
  9. `**Siguiente paso sugerido:**` confirmar con Aurora la fecha_fin real de LING. ACDMY y decidir sobre las dos deudas de datos.

Reglas de redaccion: espanol sin tildes en la prosa (`Código.js` se escribe tal cual, es el nombre real del archivo); bullets densos, cero relleno; no aumentar el alcance ni proponer cambios de codigo dentro de la entrada.
  </action>
  <verify>
    <automated>cd "C:/Users/Usuario/Desktop/novattend" &amp;&amp; grep -q '^### 2026-08-04 ' docs/progress.md &amp;&amp; grep -q 'conv-abr26' docs/progress.md &amp;&amp; grep -q 'CACHE_TTL' docs/progress.md &amp;&amp; grep -q 'alu-0056' docs/progress.md &amp;&amp; grep -q 'prof-marta' docs/progress.md &amp;&amp; grep -q '46326' docs/progress.md &amp;&amp; grep -q '\*\*Fecha:\*\* 2026-08-04' docs/progress.md &amp;&amp; test "$(grep -n '^### ' docs/progress.md | head -1 | grep -c '2026-08-04')" = "1" &amp;&amp; echo OK</automated>
  </verify>
  <done>
`docs/progress.md` contiene una entrada `### 2026-08-04` que es la PRIMERA entrada `###` del fichero (arriba de la de 2026-07-28), cubre los 9 puntos listados, y la seccion `## Ultimo Hito` tiene `**Fecha:** 2026-08-04` con un resumen del incidente. Ningun otro fichero modificado.
  </done>
</task>

<task type="auto">
  <name>Task 2: Verificar que no hay dano colateral y commitear</name>
  <files>docs/progress.md</files>
  <action>
Comprobar que `git status --short` solo lista `docs/progress.md` como modificado (el directorio sin trackear `graphify-out/` y los artefactos de `.planning/` pueden aparecer; no anadirlos al commit salvo el propio PLAN si la politica del repo lo exige). Revisar el `git diff` de `docs/progress.md`: debe ser puramente aditivo salvo las 2 lineas reemplazadas de `## Ultimo Hito`; ninguna entrada historica previa puede haberse borrado ni reordenado.

Commit con Conventional Commits en espanol: `docs: registrar incidente 2026-08-04 de convocatoria de abril caducada`. Sin co-autoria ni firmas adicionales salvo que el usuario lo pida.

No ejecutar `npm run lint` ni `npm test`: este cambio no toca codigo ni tests, y correrlos solo quema contexto.
  </action>
  <verify>
    <automated>cd "C:/Users/Usuario/Desktop/novattend" &amp;&amp; test -z "$(git diff --name-only -- src apps-script CLAUDE.md)" &amp;&amp; git log -1 --pretty=%s | grep -q '^docs: ' &amp;&amp; git show --stat --name-only --pretty=format: HEAD | grep -q 'docs/progress.md' &amp;&amp; echo OK</automated>
  </verify>
  <done>Commit `docs:` creado conteniendo `docs/progress.md`. Sin cambios pendientes en `src/`, `apps-script/` ni `CLAUDE.md`.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| repo -> historial documental | El contenido escrito en `docs/progress.md` es la unica memoria de un incidente cuya causa vive fuera del repo (hoja de calculo) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260804-01 | Repudiation | docs/progress.md | mitigate | La entrada registra fecha, sintoma, causa raiz con referencia a `Código.js:1038`, celdas exactas modificadas y limites de la verificacion — trazabilidad completa del incidente y del fix de datos |
| T-260804-02 | Information Disclosure | docs/progress.md (fichero versionado y publicado en el repo) | mitigate | Prohibido escribir en la entrada: passwords, hashes, tokens de sesion, `SESSION_SECRET`, URLs `/exec` completas, emails personales de profesores o el spreadsheet ID. Solo ids logicos (`conv-abr26`, `prof-marta`, `alu-0056`) y nombres ya presentes en el historial del fichero |
| T-260804-03 | Tampering | historial previo de docs/progress.md | mitigate | Task 2 revisa el diff: cambio aditivo salvo las 2 lineas de `## Ultimo Hito`; ninguna entrada historica borrada ni reordenada |
| T-260804-SC | Tampering | instalacion de paquetes | accept | Este plan no instala nada (npm/pip/cargo): sin superficie de cadena de suministro |
</threat_model>

<verification>
1. `docs/progress.md` es el unico fichero de producto modificado.
2. La primera cabecera `### ` del fichero es la del 2026-08-04; la de 2026-07-28 sigue existiendo justo debajo.
3. Los 6 elementos exigidos por el encargo aparecen literalmente en la entrada: causa raiz, "dato y no codigo", cache 120s, no verificable por curl, asuncion sobre LING. ACDMY, deuda (Marta + Joaquin).
4. Prosa en espanol sin tildes, consistente con el resto del fichero.
5. Cero secretos en el texto anadido.
</verification>

<success_criteria>
- [ ] `## Ultimo Hito` con `**Fecha:** 2026-08-04` y resumen del incidente
- [ ] Entrada `### 2026-08-04 — ...` como primera entrada del fichero, encima de la de 2026-07-28
- [ ] Los 9 bullets de hechos presentes, sin datos inventados
- [ ] Sin cambios en `src/`, `apps-script/` ni `CLAUDE.md`
- [ ] Commit `docs: registrar incidente 2026-08-04 de convocatoria de abril caducada`
</success_criteria>

<output>
Create `.planning/quick/260804-eyg-registrar-en-docs-progress-md-el-inciden/260804-eyg-SUMMARY.md` when done
</output>
