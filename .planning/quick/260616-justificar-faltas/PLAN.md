---
quick_id: 260616-knb
type: quick
title: Justificar faltas de asistencia
project_root: c:\Users\Usuario\Desktop\novattend
autonomous: false
files_modified:
  - apps-script/Código.js
  - src/services/api.js
  - src/config/justificationReasons.js
  - src/components/features/JustifyAbsenceModal.jsx
  - src/components/features/StudentDetailPopup.jsx
  - src/components/features/WhatsNewModal.jsx
  - src/pages/AttendancePage.jsx
  - src/tests/justificationReasons.test.js
  - src/tests/api.test.jsx
  - src/tests/WhatsNewModal.test.jsx
manual_steps_required: true   # redeploy clasp + verificar columnas en hoja real
---

# PLAN — Justificar faltas de asistencia

## Objetivo

Permitir que un profesor justifique (y desjustifique) faltas pasadas concretas de sus alumnos desde `StudentDetailPopup`. Una falta justificada se **excluye por completo** del cálculo de asistencia (no suma a `total` ni a `presentes`), por lo que el porcentaje del alumno sube. El marcado diario sigue siendo binario y no cambia.

**Decisiones de negocio (ya tomadas, NO re-cuestionar):**
1. Falta justificada = excluida del cálculo (no cuenta como falta ni como clase).
2. La justificación ocurre días después, desde el detalle del alumno; se puede justificar/desjustificar cuando se quiera.
3. Motivo de lista predefinida + opción "Otro" con texto libre.
4. El backend SÍ se toca en esta tarea (aprobado por el usuario, pese a CLAUDE.md Ola 4).

## Reglas de oro aplicables (CLAUDE.md)
- CERO estilos inline (solo tokens Tailwind). Única excepción tolerada: `style={{ maxWidth }}` ya existente en `Modal`.
- Máx **250 líneas por archivo**. `StudentDetailPopup.jsx` ya está en **237 líneas** → cualquier añadido obliga a extraer subcomponentes a archivos propios.
- UI/comentarios en español; código (variables/funciones/componentes) en inglés.
- JSDoc obligatorio en cabecera de componentes nuevos con sus props.
- Componentes `ui/` puros; `features/` con lógica.

## Contexto técnico verificado (líneas reales)

### Backend `apps-script/Código.js`
- `setupSheets` (~864): cabeceras ASISTENCIA en línea **871** = `['fecha', 'alumno_id', 'convocatoria_id', 'profesor_id', 'grupo', 'presente', 'hora_registro']` (7 cols).
- `doGet` dispatch (~210, casos 218-228). `doPost` dispatch (~534, `switch` 543-552).
- `handleGetAsistencia` (~310): devuelve registros crudos vía `sheetToObjects(SHEET_NAMES.ASISTENCIA)`. Cache key `asist_*`.
- `computeResumen` (~382): por cada registro `presente = r.presente === true`; **434** `stats.total++` siempre; **435** `if (presente) stats.presentes++`; también incrementa ventanas semanal/quincenal/mensual (438-457). `faltas_total = s.total - s.presentes` (522).
- `handleGuardarAsistencia` (~575): borra+reescribe filas del mismo `fecha/grupo/profesor/convocatoria`. **OJO**: hardcodea **7** columnas en `clearContent` (648) y `setValues` (651); construye filas en **633-641** con 7 valores. Invalida cache `res_`/`asist_` (655).

### Frontend
- `src/services/api.js`: `apiGet(action, params)`, `apiPost(action, body)` (text/plain a propósito). `getAsistencia` (~102), `getAsistenciaAlumno` (~130), `getResumen` (~117), `guardarAsistencia` (~150).
- `src/components/features/StudentDetailPopup.jsx` (**237 líneas**): `fetchAbsences` (44-63) llama `getAsistenciaAlumno`, filtra `r.presente === false`, mapea a `r.fecha`. `AbsencesBlock` (211-237) lista fechas en `bg-error-soft text-error`. Props del student: `id`, `name`, `group`, `teacher`. Recibe `convocatoriaId`.
- `src/components/ui/Modal.jsx`: props `isOpen`, `onClose`, `children`, `maxWidth`, `className`, `ariaLabel`. Reutilizar.
- `src/components/ui/Button.jsx` (variant `primary`/`ghost`/`disabled`, `icon`, `fullWidth`, `onClick`) y `ToggleSwitch.jsx` existen.
- `src/pages/AttendancePage.jsx`: **primera vista que ve TODO profesor tras login** (con 1 o varias convocatorias). `ConvocatoriaPage.jsx` solo aparece si hay 2+ convocatorias activas, así que NO es punto de montaje universal. `sessionUser` se lee de `sessionStorage` (líneas 28-33). El rol teacher llega aquí siempre.
- Tests en `src/tests/` con Vitest. Ya existe `api.test.jsx` y `StudentDetailPopup.test.jsx`.

---

## ⚠ Decisión de diseño resuelta: preservación de justificadas al re-guardar el día

El guardado diario (`handleGuardarAsistencia`) **borra y reescribe** todas las filas de `fecha/grupo/profesor/convocatoria`. Si no se hace nada, re-guardar un día borraría las justificaciones previas de ese día.

**Resolución adoptada (planificada, no opcional):**
- El payload del guardado diario NO trae `justificada`/`motivo` (AttendancePage no cambia su payload de guardado).
- Antes de reescribir, `handleGuardarAsistencia` construye un **mapa de preservación** `{ alumno_id -> { justificada, motivo } }` leyendo las filas existentes que va a borrar (mismo fecha/grupo/profesor/convocatoria). Al construir cada fila nueva, si el alumno tenía justificada=true, se preserva `justificada` y `motivo`; si no, se ponen `false`/`''`.
- Justificar una presencia no tiene sentido: la preservación solo aplica a filas con `presente === false`. Si un alumno pasa de ausente-justificado a presente en un re-guardado, se descarta la justificación (presente no se justifica).

## ⚠ Identificación de fila única (justificarFalta)

La fila se identifica por **`fecha` + `alumno_id` + `convocatoria_id`** (un alumno pertenece a un solo grupo/profesor por convocatoria, así que esta clave es única en la práctica). Validar que exista exactamente una y que `presente === false`.

## ⚠ Migración de columnas en hoja con datos reales

`setupSheets` reescribe solo la cabecera (fila 1), no re-crea datos. La hoja real ASISTENCIA ya tiene datos en 7 columnas. Plan:
- El código backend debe tratar filas sin las nuevas columnas como `justificada=false`/`motivo=''` (lectura defensiva: `r.justificada === true`, nunca `=== false` para excluir).
- Las dos columnas nuevas se añaden **al final** (`justificada` col 8, `motivo` col 9) para no desplazar índices existentes.
- Paso manual del usuario: añadir las cabeceras `justificada` y `motivo` en H1/I1 de la hoja real (ver "Pasos manuales"). El backend debe degradar con gracia si aún no existen.

---

## Tareas atómicas

### Tarea 1 — Backend: esquema + lectura defensiva de columnas
**Archivo:** `apps-script/Código.js`
**Cambio:**
- En `setupSheets` (línea 871): cabecera ASISTENCIA → `['fecha', 'alumno_id', 'convocatoria_id', 'profesor_id', 'grupo', 'presente', 'hora_registro', 'justificada', 'motivo']` (9 cols).
- Verificar/ajustar que `sheetToObjects` mapea por cabecera (no por índice fijo), de modo que filas con 7 columnas devuelvan `justificada`/`motivo` como `undefined`. Si `sheetToObjects` rellena solo hasta el número de cabeceras, no requiere cambios; documentarlo en comentario.
- En `handleGetAsistencia` (~310): asegurar que cada registro devuelto incluye `justificada` (coaccionar a boolean: `r.justificada === true`) y `motivo` (`r.motivo || ''`). Mapear los registros antes de `jsonResponse`.

**Hecho cuando:** la cabecera tiene 9 columnas; `getAsistencia` devuelve `justificada` (bool) y `motivo` (string, '' si vacío) en cada registro, sin romper filas antiguas de 7 columnas.

**Commit:** `feat: añadir columnas justificada/motivo a ASISTENCIA y exponerlas en getAsistencia`

---

### Tarea 2 — Backend: cálculo excluye faltas justificadas
**Archivo:** `apps-script/Código.js`
**Cambio:** En `computeResumen` (~418-458, el `registros.forEach`):
- Al inicio del callback, calcular `justificada = r.justificada === true`.
- Si `justificada === true`, **saltar el registro por completo** (`return;` antes de incrementar `stats.total`/`presentes` y todas las ventanas). Así no cuenta ni como clase ni como falta en ninguna ventana (semanal, quincenal, mensual, semana actual, mes actual, total).
- (Opcional barato) acumular `stats.justificadas++` y exponer `faltas_justificadas: s.justificadas` en el objeto de retorno (~506-526). Solo si no añade complejidad; si complica, omitir.

**Hecho cuando:** un registro con `justificada=true` no afecta `clases_total`, `clases_presentes`, `faltas_total`, ni los porcentajes; las filas no-justificadas se calculan igual que antes.

**Commit:** `feat: computeResumen excluye faltas justificadas del cálculo`

---

### Tarea 3 — Backend: preservar justificadas en guardado diario
**Archivo:** `apps-script/Código.js`
**Cambio:** En `handleGuardarAsistencia` (~575):
- Antes de filtrar `filasConservadas`, recorrer las filas que SÍ son del mismo grupo/fecha (las que se van a borrar) y construir `preservadas = { alumno_id -> { justificada: bool, motivo: string } }` leyendo las columnas 8/9 (índice por `headers.indexOf('justificada')` / `'motivo'`, con fallback `false`/`''` si no existen).
- Al construir `filasNuevas` (633-641), extender cada fila a 9 valores: añadir `justificada` y `motivo`. Lógica: si `a.presente === true` → `false`/`''`. Si `a.presente === false` y existe `preservadas[a.alumno_id]?.justificada` → preservar `justificada`/`motivo`; en otro caso `false`/`''`.
- Cambiar los hardcodes de **7** a **9** columnas: `clearContent` (648) y `setValues` (651) deben usar 9 (o `headers.length`). Preferible `headers.length` para robustez.

**Hecho cuando:** re-guardar un día NO borra justificaciones previas de alumnos que siguen ausentes; el guardado escribe 9 columnas sin romper la hoja.

**Commit:** `fix: preservar justificadas/motivo al re-guardar asistencia del día`

---

### Tarea 4 — Backend: endpoint POST justificarFalta
**Archivo:** `apps-script/Código.js`
**Cambio:**
- Añadir caso en `doPost` switch (~543): `case 'justificarFalta': return handleJustificarFalta(body);`.
- Nueva función `handleJustificarFalta(body)`:
  - Recibe `{ convocatoria_id, profesor_id, grupo, alumno_id, fecha, justificada, motivo }`. Validar obligatorios (`convocatoria_id`, `alumno_id`, `fecha`, `justificada` booleano).
  - `LockService.getScriptLock()` con `waitLock(15000)` (mismo patrón que guardar).
  - Leer `getDataRange().getValues()`, localizar columnas por `headers.indexOf(...)`. Localizar la fila única por `fecha` (normalizando Date→`yyyy-MM-dd` igual que en guardar, 617-619) + `alumno_id` + `convocatoria_id`.
  - Validar: la fila existe (si no, `jsonError('Falta no encontrada', 404)`); `presente === false` (si es presencia, `jsonError('No se puede justificar una presencia', 400)`).
  - Si `justificada === true`: setear celda `justificada=true` y `motivo` (string). Si `false`: setear `justificada=false`, `motivo=''`.
  - Escribir solo esa fila: `sheet.getRange(rowIndex+1, justCol+1, 1, 1).setValue(...)` y la de motivo (o un `setValues` de 2 celdas contiguas si justifica/motivo son adyacentes col 8/9).
  - Invalidar cache: `cacheInvalidate(['res_' + convocatoria_id, 'asist_' + convocatoria_id])`.
  - `writeLog(profesor_id, 'JUSTIFICAR_FALTA', grupo + ' | ' + fecha + ' | ' + alumno_id + ' | ' + (justificada ? motivo : 'quitada'))`.
  - Devolver `jsonResponse({ message: 'Falta actualizada', justificada, motivo })`.

**Hecho cuando:** un POST `justificarFalta` con falta válida actualiza columnas 8/9 de la fila única, invalida cache, y rechaza con error claro presencias o fechas inexistentes.

**Commit:** `feat: endpoint justificarFalta para justificar/desjustificar faltas pasadas`

---

### Tarea 5 — Config de motivos predefinidos
**Archivo (nuevo):** `src/config/justificationReasons.js`
**Cambio:**
- Exportar `OTHER_REASON = 'Otro'` (constante para detectar texto libre).
- Exportar `JUSTIFICATION_REASONS` = array de motivos predefinidos: `['Enfermedad', 'Cita médica', 'Asunto familiar', OTHER_REASON]`.
- JSDoc en cabecera describiendo el módulo. Comentarios en español, identificadores en inglés.

**Hecho cuando:** el archivo exporta `JUSTIFICATION_REASONS` (array, último elemento `OTHER_REASON`) y `OTHER_REASON`.

**Commit:** `feat: config de motivos de justificación de faltas`

---

### Tarea 6 — api.js: función justificarFalta + JSDoc de propagación
**Archivo:** `src/services/api.js`
**Cambio:**
- Nueva función exportada `justificarFalta(payload)` que llama `apiPost('justificarFalta', payload)`. JSDoc con los campos del payload: `{ convocatoria_id, profesor_id, grupo, alumno_id, fecha, justificada: boolean, motivo: string }`.
- Actualizar JSDoc de `getAsistencia` (~95) y `getAsistenciaAlumno` (~125) para documentar que cada registro ahora incluye `justificada: boolean` y `motivo: string` (vienen del backend; no hay cambio de código en estas funciones).

**Hecho cuando:** `justificarFalta` exportada y devuelve la promesa de `apiPost`; JSDoc documenta los nuevos campos. `npm run lint` limpio.

**Commit:** `feat: api.justificarFalta y documentación de campos justificada/motivo`

---

### Tarea 7 — Componente JustifyAbsenceModal
**Archivo (nuevo):** `src/components/features/JustifyAbsenceModal.jsx` (< 250 líneas)
**Cambio:** Modal de justificación. JSDoc obligatorio con props.
- **Props:** `{ isOpen, onClose, absence, currentReason, isJustified, onConfirm, onUnjustify }` donde `absence = { alumno_id, fecha }`.
- Estructura: usar `Modal` de `ui/` (`isOpen`, `onClose`, `ariaLabel`). Dentro:
  - Título con la fecha (formato `dd/mm/yyyy`).
  - Selector de motivo: lista de `JUSTIFICATION_REASONS` (radio buttons o lista de botones estilados con tokens Tailwind). Al elegir `OTHER_REASON`, mostrar `<textarea>` controlado para texto libre.
  - Botón "Justificar" (`Button`) → `onConfirm(motivoFinal)` donde `motivoFinal` = el motivo elegido, o el texto libre si es "Otro". Deshabilitar si "Otro" sin texto.
  - Si `isJustified === true`: mostrar el motivo actual y botón "Quitar justificación" → `onUnjustify()`.
  - Estado de carga interno mientras el padre resuelve (prop opcional `loading` o estado local controlado por el padre vía deshabilitar botones).
- Solo tokens Tailwind (`bg-burgundy`, `text-gold`, `bg-warning-soft`, `text-warning`, `border-border-light`, etc.). Cero inline.
- Idioma: UI en español, código en inglés.

**Hecho cuando:** el componente renderiza la lista de motivos + "Otro" con textarea, expone confirmar/quitar vía callbacks, < 250 líneas, lint limpio.

**Commit:** `feat: JustifyAbsenceModal para elegir motivo y justificar/quitar faltas`

---

### Tarea 8 — Integrar en StudentDetailPopup (con extracción por límite de líneas)
**Archivos:** `src/components/features/StudentDetailPopup.jsx` (+ posibles nuevos subcomponentes)
**Contexto:** el archivo está en **237/250 líneas**. Añadir lógica de justificación lo desbordará → **extraer `AbsencesBlock` (y sus helpers de render) a un archivo propio** antes de ampliarlo.

**Cambio:**
1. Extraer `AbsencesBlock` a `src/components/features/AbsencesBlock.jsx` (nuevo, JSDoc con props). Importarlo en `StudentDetailPopup`. Esto libera espacio.
2. En `fetchAbsences` (44-63): cambiar el mapeo. En vez de mapear a `r.fecha` (string), construir objetos `{ fecha, justificada: r.justificada === true, motivo: r.motivo || '' }` para las filas con `r.presente === false`. Mantener orden descendente por `fecha`.
3. En `AbsencesBlock`: por cada falta, distinguir visualmente:
   - Justificada → `bg-warning-soft text-warning` (o `bg-gold-soft text-gold`), mostrar el motivo como subtexto/title.
   - No justificada → `bg-error-soft text-error` (actual).
   - Cada falta tiene un botón "Justificar" / "Justificada" que abre `JustifyAbsenceModal` con esa `{ alumno_id, fecha }`. Respetar el patrón "un solo control interactivo por fila" (memoria del proyecto): el botón es el control; el chip de fecha no es clicable.
4. Estado en `StudentDetailPopup`: `selectedAbsence` (la falta abierta en el modal). Handler `handleJustify` que llama `justificarFalta({...})` desde `services/api`, y al resolver re-ejecuta `fetchAbsences` (refrescar lista) y cierra el modal. Construir el payload con `convocatoriaId`, `student.id`, `student.group`, `student.teacher`→`profesor_id` (verificar de dónde sale `profesor_id`; si el student no lo trae, obtenerlo del contexto disponible — **DETENERSE y preguntar al usuario si `profesor_id` no es derivable** en vez de suponer).
5. Mantener `StudentDetailPopup.jsx` < 250 líneas tras los cambios (la extracción del paso 1 debe dejar margen suficiente).

**Hecho cuando:** las faltas justificadas se ven en color distinto con su motivo; cada falta tiene botón que abre el modal; tras justificar/quitar, la lista se refresca y el chip cambia de color; ambos archivos < 250 líneas; lint limpio.

**Commit:** `feat: justificar faltas desde StudentDetailPopup con distinción visual y refresco`

---

### Tarea 9 — Tests
**Archivos:** `src/tests/justificationReasons.test.js` (nuevo) + `src/tests/api.test.jsx` (ampliar)
**Cambio:**
- `justificationReasons.test.js`: verificar que `JUSTIFICATION_REASONS` es un array no vacío, que incluye `OTHER_REASON`, y que `OTHER_REASON` es el último elemento.
- `api.test.jsx`: añadir test de `justificarFalta` siguiendo el patrón existente (mockear `fetch`/`apiPost` como ya se hace en ese archivo). Verificar que llama a `apiPost` con action `'justificarFalta'` y el payload correcto, y que devuelve `json.data`.

**Hecho cuando:** `npm test` pasa con los nuevos tests verdes.

**Commit:** `test: cobertura de justificationReasons y api.justificarFalta`

---

### Tarea 10 — Modal de novedad "Justificar faltas" (mini-tutorial, una vez por dispositivo)
**Archivos:** `src/components/features/WhatsNewModal.jsx` (nuevo, < 250 líneas) + `src/pages/AttendancePage.jsx` (punto de montaje) + `src/tests/WhatsNewModal.test.jsx` (nuevo, opcional)

**Objetivo:** tras el login del profesor, mostrar **UNA SOLA VEZ por dispositivo** un modal centrado que anuncia la nueva funcionalidad de justificar faltas y explica cómo usarla con un mini-tutorial de 3 pasos.

**Punto de montaje — decisión documentada:**
- Se monta en **`src/pages/AttendancePage.jsx`**, NO en `ConvocatoriaPage.jsx`.
- **Por qué:** `ConvocatoriaPage` solo se renderiza cuando el profesor tiene **2+ convocatorias activas** (ver `CLAUDE.md` > Flujo teacher y `ConvocatoriaPage.jsx`); un profesor con 1 sola convocatoria va directo a `/attendance` sin pasar por ella. `AttendancePage` es la **primera vista garantizada para TODO profesor tras login**. Montarlo aquí cubre el 100% de profesores y nunca aparece al CEO (su ruta es `/dashboard`, vista distinta).

**Cambio — componente `WhatsNewModal.jsx`:**
- JSDoc obligatorio con props. **Props:** `{ isOpen, onClose }`. La persistencia (lectura/escritura de localStorage) la maneja el componente padre o el propio modal vía un helper exportado; mantenerlo simple: el modal solo renderiza y avisa `onClose`.
- Reutilizar `Modal` de `src/components/ui/Modal.jsx` (`isOpen`, `onClose`, `maxWidth`, `ariaLabel`). Mobile-first, respeta `max-width 430px` (el `Modal` ya centra y limita ancho; usar `maxWidth` por defecto o un valor acorde).
- Contenido:
  - Título: **"¡Nuevo! Justificar faltas"** (`font-cinzel`, `text-burgundy` o `text-gold` sobre fondo claro del Modal).
  - Subtítulo breve: explica que ahora se pueden **justificar ausencias** de los alumnos.
  - Mini-tutorial de **3 pasos**, cada uno con un numerito en círculo (Tailwind: `rounded-full bg-burgundy text-gold` o similar) o emoji, y texto corto:
    1. "Abre el detalle de un alumno (toca su fila)."
    2. "En sus faltas, pulsa «Justificar» en la fecha que quieras."
    3. "Elige el motivo (Enfermedad, Cita médica…) y confirma. La falta justificada deja de contar en su porcentaje."
  - Botón **"Entendido"** (`Button` de `ui/`, `variant="primary"`, `fullWidth`) que llama `onClose`.
- **Solo tokens Tailwind** (`bg-burgundy`, `text-gold`, `text-text-dark`, `text-text-muted`, `bg-burgundy`, `rounded-full`, etc.). Cero estilos inline (salvo lo inevitable que ya tolera `Modal`).
- UI en español, identificadores en inglés.

**Cambio — persistencia (localStorage, versionada):**
- Key: **`novattend_whatsnew_justificar_v1`** (versionar el sufijo `_v1` para poder reusar el patrón en futuras novedades cambiando solo la versión/key).
- Lógica: al montar `AttendancePage`, comprobar `localStorage.getItem('novattend_whatsnew_justificar_v1')`. Si **NO existe** → `isOpen = true`. Al pulsar "Entendido" (o cerrar) → `localStorage.setItem('novattend_whatsnew_justificar_v1', '1')` y `isOpen = false`. Envolver el acceso a `localStorage` en try/catch (modo privado / cuotas) para no romper la página si falla.
- Recomendado: extraer un helper mínimo (p. ej. `hasSeenWhatsNew(key)` / `markWhatsNewSeen(key)`) dentro del propio componente o un util pequeño, para mantener `AttendancePage` ligero y testeable. No crear infraestructura de más.

**Cambio — montaje en `AttendancePage.jsx`:**
- Importar `WhatsNewModal`. Estado local `const [whatsNewOpen, setWhatsNewOpen] = useState(...)` inicializado a `true` solo si la key NO está en localStorage (lazy initializer con try/catch).
- Renderizar `<WhatsNewModal isOpen={whatsNewOpen} onClose={handleCloseWhatsNew} />` junto al resto de modales (cerca de `ConfirmPastDayModal`). `handleCloseWhatsNew` setea la key y cierra.
- No tocar el flujo de guardado ni el payload de asistencia.

**Mejora futura (NO implementar ahora, solo dejar nota en código/JSDoc):** el tutorial podría ilustrarse con una imagen generada vía OpenRouter. Queda como mejora futura; ahora el tutorial funciona solo con iconos/numeritos y texto Tailwind.

**Test (opcional):** `src/tests/WhatsNewModal.test.jsx` — verificar el respeto de la key: que el modal NO se considera "a mostrar" si la key ya está en localStorage (testear el helper `hasSeenWhatsNew`/`markWhatsNewSeen`, o renderizar y comprobar que con la key seteada no aparece el título). Mockear `localStorage` con el patrón de Vitest del repo.

**Hecho cuando:** un profesor que entra por primera vez en este dispositivo ve el modal con el título, subtítulo y los 3 pasos; al pulsar "Entendido" se cierra y se setea la key; recargar o volver a entrar NO lo muestra de nuevo; el CEO nunca lo ve; ambos archivos < 250 líneas; `npm run lint` limpio; (si se hace el test) `npm test` verde.

**Commit:** `feat: WhatsNewModal de novedad "justificar faltas" mostrado una vez por dispositivo`

---

## Verificación

**Automática (agente):**
- `npm run lint` → 0 errores.
- `npm test` → todas las suites verdes (incluidas las nuevas).
- `npm run build` → build correcto.

**Checklist manual (usuario, tras redeploy backend):**
1. Abrir el detalle de un alumno con faltas → ver lista de "Días faltados".
2. Pulsar "Justificar" en una falta → elegir motivo (probar uno predefinido y "Otro" con texto) → confirmar.
3. El chip de esa falta cambia a color justificado (warning/gold) y muestra el motivo.
4. Recargar / reabrir el detalle → la justificación persiste y el **porcentaje de asistencia del alumno ha subido** (la falta ya no cuenta).
5. Pulsar "Quitar justificación" → el chip vuelve a rojo y el porcentaje baja de nuevo.
6. (Regresión) Re-guardar la asistencia de ese día desde AttendancePage con el alumno aún ausente → la justificación previa NO se pierde.
7. (Modal novedad) **Primer login teacher en un dispositivo nuevo (o tras borrar la key de localStorage) muestra el modal "¡Nuevo! Justificar faltas"** con los 3 pasos; pulsar "Entendido" lo cierra; **recargar la página NO lo vuelve a mostrar**. Verificar que el CEO (login ceo → `/dashboard`) NO lo ve.

## Pasos manuales del usuario (el agente NO los ejecuta)

1. **Hoja real ASISTENCIA:** añadir cabeceras `justificada` (col H) y `motivo` (col I) en la fila 1. `setupSheets` no se re-ejecuta sobre datos existentes; las filas antiguas quedan con esas celdas vacías y el backend las trata como `false`/''. (Alternativa: ejecutar `setupSheets` manualmente desde el editor de Apps Script, que reescribe solo la cabecera — verificar que no toca los datos.)
2. **Redeploy del backend (obligatorio, `clasp push` no basta):**
   - `clasp push`
   - `clasp version "justificar faltas"`
   - `clasp redeploy <DEPLOY_ID>` (usar el ID de deploy del Web App existente; ver memoria `project_clasp_setup`).
3. Verificar que `VITE_API_URL` apunta al deploy actualizado antes de probar.

## Riesgos
- **Migración de columnas:** la hoja real tiene datos en 7 columnas. Mitigado por lectura defensiva (`r.justificada === true`) y cabeceras añadidas al final. Riesgo si el usuario olvida el paso manual 1 → justificarFalta escribiría en columnas sin cabecera; mitigado porque el backend usa `headers.length` / `indexOf`, pero si las cabeceras faltan, `indexOf` devuelve -1 → **el backend debe validar que las columnas existen y devolver error claro si no** (añadir esa guarda en Tareas 1/4).
- **Preservación al re-guardar:** cubierto en Tarea 3; verificar con el paso 6 del checklist.
- **Identificación de fila única:** clave `fecha+alumno_id+convocatoria_id`. Si por datos sucios hubiera duplicados, justificarFalta actualizaría la primera coincidencia; aceptable, pero loguear si se encuentran 2+.
- **`profesor_id` en el payload frontend:** si `student` no expone `profesor_id`, DETENERSE y preguntar (Tarea 8, paso 4) en vez de suponer.
- **Modal novedad (Tarea 10):** `localStorage` puede fallar en modo privado/cuota → envolver en try/catch para no romper `AttendancePage`. La key es versionada (`_v1`); futuras novedades usan nueva versión, no reutilizan esta.

## Orden de ejecución
1 → 2 → 3 → 4 (backend completo) → 5 (config) → 6 (api) → 7 (modal justificar) → 8 (integración) → 9 (tests) → 10 (modal novedad, independiente de backend) → Verificación → Pasos manuales.
