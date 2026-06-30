# Fase 2 — Esquema PROFESORES + migracion de credenciales (SUMMARY)

**Estado:** Completada (CODIGO SOLO — nada ejecutado contra la hoja real).
**Branch:** `feat/auth-real-appsscript`
**Commit:** `1e8974d` — `feat: esquema PROFESORES auth + migracion de credenciales (Fase 2)`
**Archivos tocados:** `apps-script/Código.js` (unico; 191 inserciones, 1 borrado).
**Verificacion:** `node --check` OK · ESLint 0 errores en el codigo nuevo.

---

## Que se implemento

### 1. Constante `PBKDF2_ITER = 10000`
A nivel de modulo, junto a las primitivas cripto (tras `SESSION_SECRET_PLACEHOLDER`).
Documentada como el valor UNICO que comparten migracion y login: si divergen,
ningun password migrado validaria. Ajustable midiendo latencia en deploy (Fase 0).
Cambiarla obliga a re-migrar todos los hashes.

### 2. Cabeceras de `PROFESORES` en `setupSheets`
De `['id','nombre','email','activo']` a:
```
['id','nombre','email','activo','password_hash','salt','rol','must_change_password','token_version']
```
Columnas E..I **anadidas al final** (sin reordenar las 4 primeras): los accesos
posicionales `data[i][0/1/3]` de `Gestion convocatorias.js` siguen intactos.
Ninguna otra hoja modificada. El checkbox de `activo` sigue resolviendose por
nombre de cabecera, asi que se aplica correctamente a la nueva posicion.

### 3. `migrarPasswordsProfesores(tempPasswords)`
Funcion nueva en la seccion AUTENTICACION (manual desde el editor, NO via web —
no cableada a doGet/doPost). Comportamiento:

- **Sin contrasenas en el codigo:** si `tempPasswords` es falsy o vacio, lanza
  Error con instruccion clara ("Pega el objeto TEMP_PASSWORDS del documento de
  credenciales del Escritorio..."). Nunca hay contrasenas reales hardcodeadas.
- **Lectura unica** con `getDataRange().getValues()`. Indices de columna
  resueltos por `headers.indexOf` (robusto ante reordenamientos).
- **Aborta si faltan** las columnas nuevas (password_hash/salt/rol/
  must_change_password/token_version) con Error que pide hacer primero el ALTER
  manual E..I (el owner lo hace a mano — red-team deploy #6).
- Por cada `usuario`:
  - `id = (usuario === 'admin') ? 'prof-admin' : 'prof-' + usuario`
  - `rol = (usuario === 'admin') ? 'ceo' : 'teacher'`
  - `salt = Utilities.getUuid()`, `hash = pbkdf2_(pwd, salt, PBKDF2_ITER)`
  - Fila existente -> actualiza password_hash, salt, rol, must_change_password=true,
    token_version=1 (=1 en migracion inicial).
  - Fila inexistente y `usuario==='admin'` -> append de fila completa
    `[prof-admin, 'Rafa', '', true, hash, salt, 'ceo', true, 1]` (numero de
    columnas correcto via `new Array(numCols)`).
  - Fila inexistente y NO admin -> se reporta como error (un teacher deberia
    tener fila desde su alta), no se crea.
- **Escritura en batch por fila** (`setValues` de la fila completa, no celda a
  celda). Se reescribe la fila entera preservando id/nombre/email/activo ya
  cargados en `data`; no asume contiguidad de las columnas nuevas.
- **Check de integridad final:** toda fila `activo=true` con salt o
  password_hash vacios -> se acumula en `errores`. NUNCA loguea contrasenas en
  claro (solo conteos: "N migrados, M creados, K errores"); `writeLog` y
  `Logger.log` solo registran conteos e ids de filas incompletas.
- **Devuelve** `{migrados, creados, errores}`.

---

## Decisiones / notas de precision

- **CEO sin fila:** se crea `prof-admin` (nombre 'Rafa', rol 'ceo', email vacio,
  activo true) — coincide con el hecho verificado de que no existe fila CEO.
- **Robustez del batch-write:** version final reescribe la fila completa (en vez
  de un bloque contiguo de 5 celdas) para no corromper columnas adyacentes si el
  ALTER manual colocara las nuevas columnas en otro orden. Sigue siendo un solo
  `setValues` por fila.
- **`isTruthy`** reutilizado para el check de integridad (helper existente en el
  mismo archivo, L272), coherente con la coercion booleana usada en el resto.

## Lo que NO se toco (fuera de alcance, Fase 3+)
- `doGet`/`doPost`/`validateApiKey`/handlers — intactos (Fase 3).
- Otras hojas en `setupSheets` — sin cambios.
- No se ejecuto nada contra la hoja: el ALTER y la migracion se corren en el
  deploy coordinado (Fase 8).

## Pendiente para fases siguientes (recordatorio)
- **Fase 3:** login debe verificar con el MISMO `PBKDF2_ITER` (10000). El gate
  `requireAuth_` lee `token_version` vigente de la hoja contra el del token.
- **Deploy (Fase 8):** owner hace ALTER E..I a mano, luego ejecuta
  `migrarPasswordsProfesores(TEMP_PASSWORDS)` una vez con el objeto del
  documento de credenciales; verificar resumen `{migrados, creados, errores}`.

## Self-Check
- Commit `1e8974d` existe: FOUND.
- `apps-script/Código.js` modificado y unico archivo del commit: FOUND.
- `node --check` pasa: PASSED.
- Sin contrasenas reales hardcodeadas: PASSED.

## Self-Check: PASSED
