# E2E — NovAttend (usuario fantasma)

Suite End-to-End con Playwright que ejercita el flujo real del profesor
(login → convocatoria → asistencia → guardado) contra el backend real de
Google Apps Script, pero **sin escribir nunca datos de produccion**.

> **AVISO — red de seguridad, no tocar**
> El script intercepta las peticiones `getAlumnos` y `getAsistencia` (les
> devuelve datos falsos) y **aborta en el navegador** cualquier POST
> `guardarAsistencia` o `justificarFalta` antes de que salga hacia
> `script.google.com`. Login y `getConvocatorias` si van al backend real
> (son de solo lectura / no mutan datos de alumnos). No quites ni relajes
> ese `context.route(...)` en `attendance.e2e.mjs`: es lo que garantiza
> cero escrituras a produccion durante el test.

## Requisitos

- `playwright` instalado (`npm i -D playwright`, ya esta en `devDependencies`
  del proyecto — la primera vez ejecuta tambien `npx playwright install
  chromium` para descargar el binario del navegador).
- El servidor de desarrollo corriendo: `npm run dev` (por defecto
  `http://localhost:5173`).
- Un **usuario de prueba dedicado** ("profesor fantasma") en la hoja
  `PROFESORES` del backend — ver procedimiento abajo. No reutilices un
  profesor real.

## Variables de entorno

El script **no trae credenciales por defecto**. Si faltan, sale con un
mensaje de error claro (exit code 2) en vez de arrancar.

| Variable       | Obligatoria | Default                  | Descripcion                        |
|----------------|-------------|---------------------------|-------------------------------------|
| `E2E_BASE_URL` | No          | `http://localhost:5173`   | URL de la app a testear            |
| `E2E_USER`     | Si          | (ninguno)                 | Usuario del profesor fantasma      |
| `E2E_PASS`     | Si          | (ninguno)                 | Password en claro del fantasma     |

## Procedimiento del "usuario fantasma"

### 1. Generar salt + hash del password

El backend usa PBKDF2 manual (N iteraciones de HMAC-SHA256, ver
`apps-script/Código.js`, funcion `pbkdf2_`). **Verifica el valor actual de
`PBKDF2_ITER`** en ese archivo antes de generar el hash (a fecha de este
README es `1000`) — si alguien lo cambia y este snippet no se actualiza, el
login del fantasma fallara.

Ejecuta este snippet con Node (ninguna dependencia externa, usa el modulo
`crypto` nativo):

```js
// generar-fantasma.mjs — replica exacta de pbkdf2_() del backend
import crypto from 'node:crypto'

const PBKDF2_ITER = 1000 // <-- confirmar contra apps-script/Código.js

function pbkdf2Novattend(pwd, salt, iter) {
  const key = Buffer.from(salt, 'utf8')
  let b = Buffer.from(salt + pwd, 'utf8')
  for (let i = 0; i < iter; i++) {
    b = crypto.createHmac('sha256', key).update(b).digest()
  }
  return b.toString('base64')
}

const salt = crypto.randomUUID()
const password = 'ElijeUnaPasswordTemporalSoloParaElTest!'
const hash = pbkdf2Novattend(password, salt, PBKDF2_ITER)

console.log('salt         :', salt)
console.log('password_hash:', hash)
console.log('password (guardala para E2E_PASS, no la subas a git):', password)
```

Ejecutalo con `node generar-fantasma.mjs` y guarda los tres valores.

### 2. Anadir la fila en PROFESORES

En la hoja `PROFESORES` del spreadsheet, anade una fila nueva con estas
columnas exactas (orden segun `apps-script/Código.js`):

| Columna                | Valor                                    |
|-------------------------|-------------------------------------------|
| `id`                    | `prof-<usuario>` (ej. `prof-fantasma`)    |
| `nombre`                | `Fantasma E2E` (o similar, identificable) |
| `email`                 | un email de prueba (no real es aceptable) |
| `activo`                | `TRUE`                                    |
| `password_hash`         | el `password_hash` generado en el paso 1  |
| `salt`                  | el `salt` generado en el paso 1           |
| `rol`                   | `teacher`                                 |
| `must_change_password`  | `FALSE`                                   |
| `token_version`         | `1`                                       |

El usuario fantasma debe pertenecer a al menos una convocatoria activa
(fecha_inicio <= hoy <= fecha_fin) para que el flujo de login llegue a
`/attendance` (o `/convocatorias` si hay 2+ activas).

### 3. Ejecutar el test

```bash
npm run dev          # en otra terminal, deja el servidor corriendo

E2E_USER=fantasma E2E_PASS='ElijeUnaPasswordTemporalSoloParaElTest!' npm run test:e2e
```

En Windows PowerShell:

```powershell
$env:E2E_USER = 'fantasma'
$env:E2E_PASS = 'ElijeUnaPasswordTemporalSoloParaElTest!'
npm run test:e2e
```

El script imprime `PASS`/`FAIL` por cada verificacion y un resumen final;
sale con codigo distinto de 0 si algo falla.

### 4. LIMPIEZA OBLIGATORIA

Al terminar (haya pasado o fallado el test), **borra la fila del profesor
fantasma de `PROFESORES`**. No debe quedar una credencial de prueba viva en
produccion. Si el test se corto a mitad y no estas seguro del estado,
entra a la hoja y verifica manualmente antes de darlo por cerrado.

## Que cubre el test

1. Sin sesion, `/attendance` redirige a login.
2. Login real (backend) llega a `/attendance` (o pasa por el selector de
   convocatorias si hay 2+ activas).
3. La lista de alumnos (datos falsos interceptados) renderiza.
4. El popup de detalle muestra faltas de la API, incluida una justificada,
   y la segunda apertura usa cache (0 llamadas nuevas).
5. Las marcas de asistencia se conservan al cambiar de grupo (tab) y volver.
6. Guardado en modo offline: queda "pendiente de sincronizar" (sin exito
   falso) y se encola exactamente 1 registro en IndexedDB.
7. Un profesor (`rol: teacher`) no puede entrar a `/dashboard`.
8. Con sesion viva, una URL directa a `/attendance` sin convocatoria en
   memoria no muestra datos mock y redirige.

## Suite 2 — cache del Service Worker (`sw-cache.e2e.mjs`)

Caso E2E independiente que cubre la migracion del SW a `injectManifest`
(`src/sw.js`): la cache runtime `api-cache` clavea las respuestas de la API
**sin** el query param `token` (plugin `cacheKeyWillBeUsed`), asi que una
lectura cacheada sobrevive a un re-login con token distinto y se sigue
sirviendo en offline (con el header `X-Novattend-From-Cache: 1` y el banner
global "Datos sin conexion — pueden no estar actualizados",
`OfflineDataBanner.jsx`, montado en `App.jsx`).

**Corre contra `npm run preview`, NO contra `npm run dev`.** El Service
Worker propio solo existe en el build de produccion; en dev no se registra
ningun SW y este test no tendria nada que comprobar.

```bash
npm run build
npm run preview -- --port 4173 --strictPort   # en otra terminal, dejalo corriendo

E2E_USER=fantasma E2E_PASS='...' npm run test:e2e:sw
```

En Windows PowerShell:

```powershell
$env:E2E_USER = 'fantasma'
$env:E2E_PASS = '...'
npm run test:e2e:sw
```

Usa las **mismas** variables de entorno (`E2E_BASE_URL`, por defecto
`http://localhost:4173` en vez de `5173`; `E2E_USER`; `E2E_PASS`) y el mismo
usuario fantasma que la Suite 1 — ver el procedimiento de alta/limpieza mas
arriba. La misma red de seguridad aplica: cualquier POST cuyo `action` no sea
`login` (incluye `guardarAsistencia` y `justificarFalta`) se aborta en el
navegador antes de salir hacia `script.google(usercontent).com`; los GET
(incluidos `getAlumnos`/`getAsistencia` del fantasma, que no tiene alumnos
propios) pasan sin tocar. No levanta ni mata el servidor de preview: eso es
responsabilidad de quien ejecuta el test (igual que con `npm run dev` en la
Suite 1).

Que verifica, en orden:

1. El Service Worker controla la pagina antes de loguear.
2. Login real -> `getConvocatorias` queda en `api-cache` sin `token=` en la
   clave (con reintentos: la escritura en cache es asincrona).
3. Re-login real (logout + login) -> token B distinto de token A, y la
   MISMA entrada de cache sigue siendo valida.
4. Offline (`context.setOffline(true)`): un reload real de `/attendance`
   sigue pintando datos (sin error de red) y muestra el banner "Datos sin
   conexion".
5. Prueba directa: un `fetch()` con un token FABRICADO (nunca emitido)
   tambien recibe la respuesta cacheada con `X-Novattend-From-Cache: 1` —
   prueba de que la clave de cache ignora el token por completo.
6. Al terminar, ningun key de `api-cache` contiene el query param `token`
   (ni el valor de A ni el de B).
