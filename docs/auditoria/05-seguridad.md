# Auditoria de Seguridad — NovAttend

**Fecha:** 2026-03-30
**Herramientas:** Analisis manual (vectores Trail of Bits), npm audit
**Commit base:** `79b2be9` (main)
**Stack:** React 19 + Vite 7 + Google Apps Script backend

---

## Resumen Ejecutivo

| Severidad | Cantidad |
|-----------|----------|
| CRITICO   | 2        |
| ALTO      | 4        |
| MEDIO     | 3        |
| BAJO      | 2        |
| **Total** | **11**   |

---

## 1. CREDENCIALES EXPUESTAS

### [C-01] CRITICO — Contrasenas hardcodeadas en codigo fuente

**Archivo:** `src/config/users.js`
**Lineas:** 1-10

Todas las contrasenas de los 7 profesores y el admin CEO estan en texto plano
directamente en el codigo fuente:

```js
{ username: "samuel", password: "samuel2026", ... }
{ username: "admin", password: "lingnova2026", ... }
```

**Riesgo real:** Cualquier persona que inspeccione el JavaScript del navegador
(DevTools > Sources) puede ver TODAS las contrasenas de TODOS los usuarios,
incluido el acceso CEO/admin. No necesita conocimientos tecnicos avanzados.
El archivo se incluye en el bundle de produccion y es legible en texto plano.

**Impacto:** Acceso total a la aplicacion por cualquier visitante.
Suplantacion de identidad de cualquier profesor o del CEO.

---

### [C-02] CRITICO — Contrasena almacenada en sessionStorage

**Archivo:** `src/pages/LoginPage.jsx:27`

```js
sessionStorage.setItem('user', JSON.stringify(found))
```

El objeto `found` es la entrada completa de `USERS`, que incluye el campo
`password`. Tras un login exitoso, la contrasena del usuario queda almacenada
en `sessionStorage` en texto plano, accesible via DevTools > Application >
Session Storage.

**Riesgo real:** Si alguien accede fisicamente al dispositivo (o via XSS futuro),
obtiene la contrasena en claro. Tambien se expone en snapshots de memoria del
navegador.

---

### [A-01] ALTO — URL de Apps Script expuesta en .env sin proteccion server-side

**Archivo:** `.env:1`

```
VITE_API_URL=https://script.google.com/macros/s/AKfycby.../exec
```

La URL completa del Web App de Apps Script esta en `.env` (correctamente en
`.gitignore`), pero al ser una variable `VITE_*`, Vite la inyecta en el bundle
de produccion. Cualquiera puede extraerla del JavaScript compilado.

**Riesgo real:** El endpoint de Apps Script es publico y sin autenticacion.
Cualquier persona con la URL puede hacer requests GET/POST directamente
(obtener listas de alumnos, guardar asistencia falsa, crear alumnos).
No hay token, API key, ni verificacion de origen en el backend.

**Nota:** `.env` esta correctamente en `.gitignore`, no esta en el repositorio
Git. Pero la proteccion es ilusoria porque la URL termina en el bundle publico.

---

### [A-02] ALTO — API de Apps Script sin autenticacion

**Archivo:** `src/services/api.js`
**Backend:** `Code.gs` (Apps Script)

Las funciones `apiGet()` y `apiPost()` envian requests sin ningun token,
header de autorizacion, ni firma. El endpoint de Apps Script acepta cualquier
request que llegue con los parametros correctos.

**Riesgo real:** Cualquiera puede:
- Leer la lista de todos los alumnos y su asistencia
- Guardar asistencia falsa para cualquier profesor/grupo
- Crear alumnos inexistentes en el sistema
- Obtener informacion del resumen de asistencia de la academia

---

## 2. AUTENTICACION

### [A-03] ALTO — Autenticacion puramente client-side

**Archivo:** `src/pages/LoginPage.jsx:18-21`

```js
const found = USERS.find(u =>
  u.username.toLowerCase() === (...) && u.password === password
)
```

La validacion de credenciales ocurre 100% en el navegador del usuario,
comparando contra la lista hardcodeada. No hay verificacion server-side.

**Riesgo real:** Un atacante puede bypasear completamente el login
manipulando `sessionStorage` desde la consola:

```js
sessionStorage.setItem('user', JSON.stringify({role:'ceo', name:'Hacker'}))
```

Y luego navegar a `/dashboard`. El `ProtectedRoute` solo verifica que exista
un objeto en sessionStorage con `role === 'ceo'`.

---

### [A-04] ALTO — ProtectedRoute bypasseable via sessionStorage

**Archivo:** `src/components/ProtectedRoute.jsx:9-16`

```js
const raw = sessionStorage.getItem('user')
if (!raw) return <Navigate to="/" replace />
const user = JSON.parse(raw)
if (user.role !== allowedRole) return <Navigate to="/" replace />
```

La guardia de ruta confla enteramente en datos que el usuario controla.
No hay verificacion contra el servidor. Un profesor puede acceder al
dashboard del CEO y viceversa, simplemente editando `sessionStorage`.

**Riesgo real:** Un profesor puede ver datos de asistencia de TODOS los
profesores accediendo al dashboard CEO. El CEO podria marcar asistencia
haciendose pasar por cualquier profesor.

---

## 3. INYECCION Y XSS

### [M-01] MEDIO — Datos de Google Sheets renderizados sin sanitizacion explicita

**Archivos:** `DashboardPage.jsx`, `AttendancePage.jsx`, componentes `features/`

Los datos que vienen de la API (nombres de alumnos, profesores, convocatorias)
se renderizan directamente en JSX:

```jsx
<div>{student.name}</div>
```

**Mitigante:** React escapa automaticamente el contenido dentro de JSX.
`{student.name}` se escapa correctamente y NO es vulnerable a XSS
a menos que se use `dangerouslySetInnerHTML`.

**Verificacion:**
- `dangerouslySetInnerHTML`: **No encontrado** en ningun archivo del proyecto
- `innerHTML`: **No encontrado**
- `eval()` / `new Function()`: **No encontrados**

**Riesgo residual:** BAJO. React protege contra XSS por defecto.
Sin embargo, si alguien inyecta HTML malicioso en los nombres de alumnos
desde Google Sheets, y en el futuro se introduce `dangerouslySetInnerHTML`,
se abriria un vector. Actualmente es seguro.

---

### [M-02] MEDIO — Sin validacion de input en formulario de login

**Archivo:** `src/pages/LoginPage.jsx`

Los campos de usuario y contrasena no tienen validacion de longitud maxima,
caracteres permitidos, ni rate-limiting de intentos fallidos.

**Riesgo real:** Bajo en este caso porque la autenticacion es client-side
y no hay servidor que saturar. Pero facilita ataques de fuerza bruta
automatizados contra la lista de contrasenas (que de todas formas esta
expuesta en el codigo).

---

### [B-01] BAJO — No hay localStorage en uso

**Verificacion:** `localStorage` no se usa en ningun archivo del proyecto.
Solo se usa `sessionStorage`, que se limpia al cerrar la pestana.
Esto es correcto para datos de sesion.

---

## 4. DEPENDENCIAS (npm audit)

### [M-03] MEDIO — 9 vulnerabilidades en dependencias npm

**Resultado de `npm audit`:** 1 moderada, 8 altas

| Paquete | Severidad | CVE/Advisory | Tipo | Dependencia de |
|---------|-----------|-------------|------|----------------|
| `undici` 7.0-7.23 | ALTA | GHSA-f269, GHSA-2mjp, GHSA-vrm6, GHSA-v9p9, GHSA-4992, GHSA-phc3 | WebSocket overflow, HTTP smuggling, CRLF injection, DoS | (directa de Node) |
| `serialize-javascript` <=7.0.4 | ALTA | GHSA-5c6j (RCE), GHSA-qj8w (DoS) | RCE via RegExp, CPU exhaustion | `workbox-build` > `vite-plugin-pwa` |
| `picomatch` <=2.3.1 | ALTA | GHSA-3v7f, GHSA-c2c7 | Method injection, ReDoS | `anymatch`, `micromatch`, `readdirp`, `workbox-build` |
| `minimatch` <=3.1.3 | ALTA | GHSA-7r86, GHSA-23c5 | ReDoS | `glob`, `filelist` |
| `flatted` <=3.4.1 | ALTA | GHSA-25h7 (DoS), GHSA-rf6f (Prototype Pollution) | Recursion DoS, prototype pollution | (indirecta) |
| `brace-expansion` <1.1.13 | MODERADA | GHSA-f886 | Process hang, memory exhaustion | `minimatch` |

**Mitigantes:**
- Todas excepto `undici` son dependencias de desarrollo (devDependencies).
  No se incluyen en el bundle de produccion.
- `undici` es el HTTP client interno de Node.js, no afecta al bundle del
  navegador directamente.
- `serialize-javascript` en `workbox-build` se ejecuta solo durante el build,
  no en runtime del usuario.

**Riesgo real:** BAJO para usuarios finales. MEDIO para el entorno de
desarrollo (un atacante que controle los inputs del build podria explotar
serialize-javascript para RCE durante `npm run build`).

**Remediacion:**
- `npm audit fix` resuelve 7 de 9 (undici, flatted, minimatch, brace-expansion, picomatch)
- `npm audit fix --force` resuelve las 9, pero downgradea `vite-plugin-pwa`
  de 1.2.0 a 0.19.8 (breaking change)

---

### Supply Chain — Evaluacion de Riesgo de Dependencias

| Dependencia | Mantenedor | Riesgo | Notas |
|-------------|-----------|--------|-------|
| `react` / `react-dom` 19.2 | Meta | Bajo | Org grande, alta popularidad |
| `react-router-dom` 7.13 | Remix/Shopify | Bajo | Org grande, activamente mantenido |
| `vite` 7.3 | Evan You + equipo | Bajo | Alta popularidad, multiples mantenedores |
| `tailwindcss` 3.4 | Tailwind Labs | Bajo | Org con financiacion, muy popular |
| `vitest` 4.0 | Equipo Vite | Bajo | Mismo ecosistema que Vite |
| `@testing-library/*` | Testing Library org | Bajo | Org establecida, Kent C. Dodds + equipo |
| `vite-plugin-pwa` 1.2 | Anthony Fu + equipo | **Medio** | Equipo pequeno, pero activo. Depende de `workbox-build` que arrastra `serialize-javascript` vulnerable |
| `jsdom` 28.1 | Node.js community | Bajo | Solo dev, alta popularidad |
| `autoprefixer` / `postcss` | PostCSS org | Bajo | Infraestructura critica del ecosistema CSS |

**Hallazgo:** No se detectaron dependencias de alto riesgo por supply chain.
Todas las dependencias runtime son de organizaciones reconocidas (Meta, Shopify,
Tailwind Labs). La unica dependencia de riesgo medio es `vite-plugin-pwa`
por su cadena de dependencias transitivas con vulnerabilidades.

---

## 5. HEADERS Y CORS

### [B-02] BAJO — Sin archivo vercel.json con headers de seguridad

**Verificacion:** No existe `vercel.json` en el proyecto.

Headers de seguridad ausentes:
- `Content-Security-Policy` (CSP)
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy`
- `Permissions-Policy`

**Mitigante:** Vercel aplica por defecto:
- HTTPS forzado (HSTS implicito)
- `X-Content-Type-Options: nosniff`

**Riesgo real:** Sin CSP, si se introdujera un XSS en el futuro, no habria
defensa en profundidad. Sin `X-Frame-Options`, la app podria ser embebida
en un iframe para ataques de clickjacking (riesgo bajo dado el contexto de uso).

**CORS del endpoint Apps Script:**
Google Apps Script Web Apps responden con `Access-Control-Allow-Origin: *`
por diseno. No hay forma de restringirlo desde Apps Script. Esto significa
que CUALQUIER sitio web puede hacer requests al backend de NovAttend.

---

## Resumen de Hallazgos por Severidad

### CRITICO (requiere accion inmediata)

| ID | Hallazgo | Archivo |
|----|----------|---------|
| C-01 | Contrasenas en texto plano en el codigo fuente (visibles en el bundle) | `src/config/users.js` |
| C-02 | Contrasena almacenada en sessionStorage tras login | `src/pages/LoginPage.jsx:27` |

### ALTO (requiere plan de remediacion)

| ID | Hallazgo | Archivo |
|----|----------|---------|
| A-01 | URL de Apps Script expuesta en bundle (inevitable con VITE_*) | `.env` / bundle |
| A-02 | API de Apps Script sin autenticacion (cualquiera puede leer/escribir datos) | `src/services/api.js` / `Code.gs` |
| A-03 | Autenticacion 100% client-side, bypasseable | `src/pages/LoginPage.jsx` |
| A-04 | ProtectedRoute bypasseable editando sessionStorage | `src/components/ProtectedRoute.jsx` |

### MEDIO

| ID | Hallazgo | Archivo |
|----|----------|---------|
| M-01 | Datos de Sheets renderizados sin sanitizacion (mitigado por React) | Componentes varios |
| M-02 | Sin validacion/rate-limit en formulario login | `src/pages/LoginPage.jsx` |
| M-03 | 9 vulnerabilidades npm (todas en devDependencies excepto undici) | `package-lock.json` |

### BAJO

| ID | Hallazgo | Archivo |
|----|----------|---------|
| B-01 | No hay uso de localStorage (correcto) | N/A |
| B-02 | Sin headers de seguridad en Vercel (CSP, X-Frame-Options) | Sin `vercel.json` |

---

## Patrones Seguros Verificados

- [x] No hay `dangerouslySetInnerHTML` en ningun componente
- [x] No hay `eval()` ni `new Function()` en el codigo
- [x] No hay `innerHTML` directo
- [x] `.env` esta en `.gitignore` (no se sube al repo)
- [x] No se usa `localStorage` (solo `sessionStorage`)
- [x] La URL de Apps Script NO esta hardcodeada en codigo fuente (solo en `.env`)
- [x] No hay dependencias de runtime de alto riesgo supply chain
- [x] React escapa automaticamente el contenido JSX

---

## Contexto Importante

NovAttend es una aplicacion interna para una academia de idiomas con ~7
profesores y 1 administrador. No es una aplicacion publica de alto trafico.

Los hallazgos CRITICOS y ALTOS son reales y explotables, pero el riesgo
practico debe evaluarse en proporcion:
- La base de usuarios es muy pequena y conocida
- Los datos manejados (asistencia de alumnos) no son financieros ni medicos
- El acceso es por URL privada (no indexada en buscadores)

Aun asi, las contrasenas en el bundle (C-01) y la API sin autenticacion (A-02)
son vulnerabilidades que deberian corregirse prioritariamente.
