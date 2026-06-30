# FASE 7 — Alta de profesor con credenciales (agregarProfesor)

**Plan:** `.planning/security-auth-plan-v1.2.md` (FASE 7, L183-186)
**Branch:** `feat/auth-real-appsscript`
**Archivo tocado (unico):** `apps-script/Gestion convocatorias.js`

## Objetivo

Que un alta nueva de profesor (desde el menu, `agregarProfesor`, que usa
`SpreadsheetApp.getUi()`) quede con credenciales validas y fuerce el cambio de
password en el primer login, igual que la migracion (`migrarPasswordsProfesores`
en Codigo.js). PROFESORES ya tiene 9 columnas:
`id, nombre, email, activo, password_hash, salt, rol, must_change_password, token_version`.

## Cambios realizados

### 1. Nuevo helper `generarPasswordTemporal_()`
- Genera una password temporal aleatoria y legible de **12 caracteres**.
- Fuente de entropia: `Utilities.getUuid()` (dos UUID v4 concatenados). **No usa
  `Math.random`**, como pide el plan.
- Proyecta los bytes sobre un alfabeto **sin caracteres ambiguos**: se excluyen
  `0 O o 1 l I` para evitar confusiones al dictarla en privado.
- Normaliza cada byte a `0..255` (`& 0xff`) antes del modulo porque `getBytes()`
  devuelve bytes con signo en Apps Script.

### 2. `agregarProfesor` — generacion de credenciales
- Tras validar nombre/email y comprobar que el `profId` no existe (logica de id
  intacta), genera:
  - `tempPassword = generarPasswordTemporal_()`
  - `salt = Utilities.getUuid()`
  - `hash = pbkdf2_(tempPassword, salt, PBKDF2_ITER)`
- `pbkdf2_` y `PBKDF2_ITER` son globales del **mismo proyecto Apps Script**
  (definidos en `Codigo.js`), accesibles sin import. No se tocan.

### 3. `appendRow` de 4 → 9 columnas
Antes:
```js
sheet.appendRow([profId, nombre, email, true]);
```
Ahora (mismo orden que el esquema):
```js
sheet.appendRow([profId, nombre, email, true, hash, salt, 'teacher', true, 1]);
```
- `rol = 'teacher'`, `must_change_password = true`, `token_version = 1`.

### 4. `ui.alert` con la password temporal (una sola vez)
- Tras crear, se muestra al admin: ID/usuario + nombre + email + **password
  temporal** + aviso de que se comunique en privado y de que el profesor la
  cambiara obligatoriamente al entrar. Se indica que no se mostrara de nuevo.

### 5. LOG sin password en claro
- El `appendRow` al LOG existente se mantiene SIN la password
  (`AGREGAR_PROFESOR | profId | nombre`). La password en claro solo vive en el
  `ui.alert` efimero.

## Lo que NO se toco

- Logica de generacion del `profId` (`prof-` + `normalizarParaId(nombre)`).
- Resto del flujo de `agregarProfesor` (prompts, comprobacion de duplicado,
  checkbox de la columna `activo`).
- `Codigo.js` ni ningun otro archivo.
- Ninguna ejecucion en Apps Script / clasp.

## Verificacion

- `node --check "apps-script/Gestion convocatorias.js"` → **SYNTAX OK**.
- Diff acotado: `1 file changed, 51 insertions(+), 2 deletions(-)`.
- Verificacion funcional pendiente (requiere deploy, fuera de esta tarea):
  alta de profesor de prueba → login con temp password → pantalla forzada de
  cambio (per checklist FASE 8 del plan).

## Cumplimiento CLAUDE.md

- Comentarios y mensaje de commit en espanol; identificadores en ingles
  (`generarPasswordTemporal_` se mantiene el patron en espanol del resto de
  helpers del archivo, p.ej. `normalizarParaId`, `pedirDato`, `elegirDeLista`).
- Conventional Commit `feat:` en espanol, un solo commit atomico.
