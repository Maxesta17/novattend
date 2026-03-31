# Feature Landscape: v1.1 Hardening (Olas 4-5)

**Dominio:** React PWA interna — hardening de accesibilidad, documentacion, seguridad backend y cobertura de tests
**Fecha:** 2026-03-31
**Confianza general:** HIGH (basado en inspeccion directa del codigo + docs oficiales W3C APG + Vitest + Apps Script)

---

## Contexto del Milestone

NovAttend v1.0 esta en produccion. Olas 1-3 cerraron bugs criticos, optimizacion de
rendimiento y arquitectura accesible (Modal con focus trap, code-splitting, React.memo).
Este milestone cubre la deuda tecnica residual en 4 areas: A11Y, DOCS, SEC, TEST.

**Estado del arte al entrar a este milestone:**
- 89 tests en 16 suites (Vitest + Testing Library)
- Modal.jsx: accesible (role=dialog, aria-modal, aria-label, focus trap, Escape)
- ToggleSwitch: accesible (role=switch, aria-checked, focus-visible)
- TeacherCard: NO accesible — divs clickables sin tabIndex ni onKeyDown ni aria-expanded
- GroupSection (dentro de TeacherCard): mismo problema
- JSDoc: falta en 4 archivos clave (AttendancePage, DashboardPage, LoginPage, SavedPage)
- Apps Script: sin autenticacion — URL publica que acepta cualquier request
- Sin @vitest/coverage-v8 instalado (requerido para medir cobertura real)

---

## Table Stakes

Funcionalidades que cualquier aplicacion de produccion mantenida debe tener.
Su ausencia indica deuda tecnica activa que ralentiza el desarrollo futuro.

### A11Y (Accesibilidad)

| Feature | Por que es esperada | Complejidad | Notas |
|---------|---------------------|-------------|-------|
| Soporte de teclado en TeacherCard expandible | WCAG 2.1 SC 2.1.1 (Nivel A): todo elemento interactivo debe ser operable con teclado. Un div con onClick pero sin tabIndex ni onKeyDown es inoperable para usuarios de teclado. | MEDIA | Requiere: cambiar `<div onClick>` por `<button>` nativo o agregar `tabIndex={0}` + `onKeyDown` con Enter/Space. La opcion nativa `<button>` es superior (semántica implícita, sin necesidad de ARIA manual). |
| aria-expanded en TeacherCard y GroupSection | WCAG 1.3.1: la informacion de estado debe estar disponible programáticamente. Sin aria-expanded, un lector de pantalla no sabe si el card esta expandido o colapsado. | BAJA | Un atributo en el elemento trigger: `aria-expanded={isExpanded}`. El estado ya existe en props/estado React. |
| aria-controls vinculando trigger al panel | W3C APG Accordion Pattern: el boton debe declarar que elemento controla con `aria-controls="id-del-panel"`. Permite navegacion semántica en lectores de pantalla. | BAJA | Requiere un `id` en el div del panel expandido y `aria-controls={ese-id}` en el boton. Sin este atributo la relacion trigger-panel es invisible para AT. |
| Atributos ARIA en componentes interactivos sin cobertura | GroupTabs ya usa `<button>` nativo pero falta `role="tablist"` en el contenedor y posiblemente `aria-selected` en las pestanas. StudentRow toggle ya tiene aria via ToggleSwitch. | MEDIA | Auditoria rapida de ARIA coverage: GroupTabs container necesita `role="tablist"`, cada boton `role="tab"` + `aria-selected`. |

### DOCS (Documentacion)

| Feature | Por que es esperada | Complejidad | Notas |
|---------|---------------------|-------------|-------|
| JSDoc en paginas principales (AttendancePage, DashboardPage, LoginPage, SavedPage) | Las paginas son el punto de entrada de cualquier desarrollador nuevo. Sin documentacion de su contrato (que reciben via location.state, que requieren en sessionStorage) el onboarding tarda el doble. | MUY BAJA | Inspeccion del codigo: AttendancePage, DashboardPage, LoginPage y SavedPage no tienen cabecera JSDoc. Los 4 hooks, todos los componentes ui/ y features/ ya tienen JSDoc. Solo faltan las paginas. |

### TEST (Cobertura)

| Feature | Por que es esperada | Complejidad | Notas |
|---------|---------------------|-------------|-------|
| @vitest/coverage-v8 instalado y configurado | Sin el proveedor de coverage instalado, `npm run test --coverage` falla con "MISSING DEPENDENCY". No se puede medir ni hablar de cobertura sin esto. | MUY BAJA | `npm i -D @vitest/coverage-v8`. Agregar config en vite.config.js. Una vez instalado, el score actual se puede medir. |
| Tests para AttendancePage | AttendancePage es la pantalla critica del negocio (guardar asistencia). No tiene ningun test. Cubre logica de grupo, contador de presentes, integracion con useStudents, y flujo de guardado. | ALTA | La pagina tiene 182 lineas con lógica de negocio real (guardarAsistencia, redirect a /saved, manejo de grupos). Riesgo de regresion sin tests. |
| Tests para DashboardPage | DashboardPage orquesta useDashboard, TeacherCard, Modal, SearchInput. No tiene test. La logica de filtrado de alumnos por busqueda y la apertura de popups no esta cubierta. | ALTA | 127 lineas, mayor parte delegada a useDashboard (que si tiene 3 tests), pero el render e integracion de componentes no esta cubierto. |

### SEC (Seguridad)

| Feature | Por que es esperada | Complejidad | Notas |
|---------|---------------------|-------------|-------|
| Validacion basica de origen en Apps Script | La URL publica de Apps Script acepta cualquier request de cualquier origen. Un atacante que conozca la URL puede leer todas las convocatorias, alumnos y estadisticas, y guardar asistencia falsa. Para una app interna de 8 usuarios, esto es riesgo real. | MEDIA | La autenticacion en Apps Script "Anyone" tiene limitaciones severas: no puede leer headers HTTP custom (X-API-Key) de forma confiable. El patron practico es un shared secret via query param o body. Ver seccion de analisis tecnico abajo. |

---

## Differentiators

Features que elevan la calidad mas alla de lo esperado, sin ser bloqueantes.

### A11Y

| Feature | Proposicion de valor | Complejidad | Notas |
|---------|----------------------|-------------|-------|
| Focus visible en TeacherCard con Tailwind `focus-visible:` | ToggleSwitch ya tiene `focus-visible:outline-burgundy`. Aplicar el mismo patron en TeacherCard/GroupSection con `<button>` nativo hace la navegacion con teclado visualmente clara. | MUY BAJA | Clases: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy`. Ya existe el patron en ToggleSwitch. Copiar-pegar. |
| aria-label descriptivo en ChevronIcon | El SVG chevron dentro de TeacherCard es decorativo. Sin `aria-hidden="true"` los lectores de pantalla lo anuncian como elemento vacio. | MUY BAJA | `aria-hidden="true"` en el SVG ChevronIcon. Una linea. |
| aria-label en SearchInput | El input de busqueda del Dashboard no tiene label visible. Sin aria-label el campo es anonimo para lectores de pantalla. | MUY BAJA | `aria-label="Buscar profesor"` en el input. Verificar si SearchInput expone un prop para ello. |

### DOCS

| Feature | Proposicion de valor | Complejidad | Notas |
|---------|----------------------|-------------|-------|
| JSDoc en helpers y utils (buildTeachersHierarchy, getAttendanceScheme) | Las funciones de transformacion de datos son las mas propensas a malentendidos. Documentar su contrato (input shape, output shape) previene bugs. | MUY BAJA | buildTeachersHierarchy.js y getAttendanceScheme en teachers.js son funciones criticas sin JSDoc. |
| JSDoc en subcomponentes internos (GroupSection, ChevronIcon en TeacherCard) | Son funciones privadas del modulo pero documentarlas hace el archivo mas legible para revisiones futuras. | MUY BAJA | Bajo ROI relativo — son implementaciones internas que rara vez se leen de forma aislada. |

### TEST

| Feature | Proposicion de valor | Complejidad | Notas |
|---------|----------------------|-------------|-------|
| Tests para TeacherCard (expandir/colapsar, ARIA) | Con los nuevos atributos ARIA de este milestone, un test que verifique `aria-expanded` pasa de ser diferenciador a tabla stakes. El valor es validar el comportamiento ARIA, no solo el render. | MEDIA | Requiere mock de datos de teacher con groups y students. Render + click = aria-expanded=true. Keyboard = Enter expande. |
| Tests para hooks en aislamiento (useStudents) | useConvocatorias y useDashboard ya tienen tests. useStudents no. Cubre la logica de cache de grupos y prefetch. | MEDIA | renderHook de @testing-library/react, mock de api.js. Valor: proteger la logica de cache que es critica para la UX de AttendancePage. |
| Coverage threshold en vite.config.js | Configurar thresholds (lines: 60, branches: 60) hace que el CI falle si la cobertura baja. Convierte el objetivo de 60% en un guardrail automatico. | MUY BAJA | 5 lineas de config en vite.config.js. Requiere @vitest/coverage-v8 instalado. |

### SEC

| Feature | Proposicion de valor | Complejidad | Notas |
|---------|----------------------|-------------|-------|
| Shared secret via PropertiesService (no hardcodeado en Code.gs) | El token de validacion debe estar en Script Properties, no en el codigo fuente. Script Properties son invisibles en el repositorio y en la interfaz compartida de la hoja. | BAJA | `PropertiesService.getScriptProperties().getProperty('API_SECRET')`. El secret se configura una vez en la UI de Apps Script y nunca aparece en codigo. |
| Logging de requests rechazados | Cuando un request llega sin secret valido, escribir una entrada en la hoja LOG. Permite detectar intentos de acceso no autorizado. | MUY BAJA | Una linea en la funcion de validacion: `writeLog('SISTEMA', 'ACCESS_DENIED', e.parameter.toString())`. |
| Rate limiting conceptual (no implementado) | Detectar y rechazar multiples requests rapidos del mismo origen podria prevenir abuso. Apps Script CacheService puede usarse para esto. | ALTA | Complejidad desproporcionada para 8 usuarios internos. Diferir indefinidamente. |

---

## Anti-Features

Features que parecen logicas pero introducen problemas o estan fuera de scope.

| Anti-Feature | Por que evitar | Que hacer en su lugar |
|--------------|----------------|----------------------|
| Headers HTTP custom (X-API-Key) en Apps Script | Apps Script Web Apps desplegadas como "Anyone" ejecutan codigo del servidor en el contexto del propietario. La documentacion oficial confirma que `e.parameter` y `e.postData` son accesibles, pero el acceso a headers HTTP arbitrarios NO esta garantizado ni documentado. En la practica, el proxy de Apps Script puede no reenviar headers custom. | Usar `e.parameter.token` (GET) o `body.token` (POST) como shared secret. Es el patron con soporte documentado y verificable. |
| OAuth2 completo para Apps Script | OAuth2 requiere flujo de autorizacion interactivo, redirect URIs, y manejo de tokens de refresh. Para una app de 8 usuarios internos es overhead extremo de implementacion y mantenimiento. | Shared secret via query param / body. Suficiente para el modelo de amenaza real: prevenir acceso externo a la URL publica. |
| Tests E2E (Playwright/Cypress) | Requieren browser headless, setup de CI separado, y mantenimiento de selectores. Para 89 tests unitarios que ya cubren flujos criticos, E2E no aporta proporcionalmente. | Unit + integration tests con Vitest + Testing Library. Los tests de LoginPage ya simulan flujos completos de navegacion. |
| Migracion de JSDoc a TypeScript | TypeScript daria tipos en tiempo de compilacion, pero migrar 32 archivos es semanas de trabajo sin beneficio funcional inmediato. | JSDoc bien escrito. VS Code infiere tipos de JSDoc con `// @ts-check` si se desea validacion sin TypeScript. |
| 100% de cobertura de tests | Cubrir todo el codigo incluyendo casos borde de error, mocks de CSS y variantes menores de UI cuesta 3x en tiempo vs llegar a 60%. El proyecto tiene 8 usuarios internos. | 60% de cobertura en lineas y branches. Cubrir las rutas criticas del negocio (login, attendance, saved). |
| Autenticacion de usuario en el backend (verificar si el profesor es quien dice ser) | Apps Script no puede verificar la identidad del usuario sin OAuth (que require login de Google). El modelo de amenaza real es: prevenir requests de actores externos, no verificar identidad de los 8 usuarios conocidos. | Shared secret para proteger el endpoint. La identidad del usuario se verifica en el frontend via sessionStorage y guardias de ruta. |

---

## Analisis Tecnico: Autenticacion en Apps Script

**Contexto critico para SEC-01:**

Apps Script Web Apps desplegadas con "Ejecutar como: Yo" + "Acceso: Cualquiera" funcionan sin autenticacion de Google. El objeto de evento tiene:

```javascript
// GET
function doGet(e) {
  e.parameter      // query params: { action: "...", token: "..." }
  e.parameters     // multiples valores por key
}

// POST
function doPost(e) {
  const body = JSON.parse(e.postData.contents)  // body.token accesible
}
```

**Patron recomendado (verificado, soporte documental):**

```javascript
// En Code.gs
const SECRET = PropertiesService.getScriptProperties().getProperty('API_SECRET')

function validateToken(token) {
  return token && token === SECRET
}

function doGet(e) {
  if (!validateToken(e.parameter.token)) {
    return jsonError('No autorizado', 401)
  }
  // ...
}
```

**En el frontend (src/services/api.js):**
```javascript
const TOKEN = import.meta.env.VITE_API_TOKEN  // en .env
// GET: agregar &token=${TOKEN} a cada URL
// POST: agregar token en el body JSON
```

**Limitaciones conocidas:**
- El token viaja en la URL (GET) o en el body (POST). No es perfectamente seguro (visible en logs de servidor, historial del navegador para GET), pero es suficiente para el modelo de amenaza real.
- HTTPS (Vercel + Apps Script) protege el transit.
- El token debe rotarse si la URL se comparte accidentalmente.
- PropertiesService.getScriptProperties() NO aparece en el historial de git. Correcto.

**Confianza:** MEDIUM — el patron `e.parameter.token` esta documentado en Google. La alternativa con headers HTTP custom tiene baja confianza (no documentado oficialmente para Web Apps).

---

## Analisis Tecnico: 60% de Cobertura con Vitest

**Que significa practicamente:**

Con `@vitest/coverage-v8` (proveedor recomendado para Node/Vite, mas rapido que Istanbul, mismo nivel de precision desde Vitest v3.2+):

- **Lines:** 60% de las lineas del codigo fuente son ejecutadas por al menos un test.
- **Branches:** 60% de los caminos de control de flujo (if/else, ternarios, &&, ||) son ejercitados.
- **Functions:** 60% de las funciones declaradas son llamadas en tests.
- **Statements:** 60% de las sentencias son ejecutadas.

**Estado actual estimado (sin medicion real — @vitest/coverage-v8 no instalado):**

Archivos con tests: Badge, Button, ConvocatoriaPage, ErrorBanner, LoadingSpinner, LoginPage,
Modal, NotFoundPage, ProtectedRoute, SavedPage, StatCard, StudentRow, UpdateBanner,
api.js, useDashboard, useFocusTrap.

Archivos SIN ningun test: AttendancePage, DashboardPage, TeacherCard, GroupTabs,
StudentDetailPopup, AlertList, Avatar, ProgressBar, SearchInput, PageHeader,
ConvocatoriaSelector, DashboardSkeleton, useStudents, useConvocatorias, useDebounce.

Estimacion: ~35-45% de cobertura actual (16 suites / ~30 archivos relevantes, con suites de densidad variable).

**Para llegar a 60%, los candidatos de mayor ROI:**

1. `AttendancePage.test.jsx` — archivo critico de negocio, 182 lineas. Un test de render + submit cubre ~60 lineas del archivo.
2. `DashboardPage.test.jsx` — 127 lineas, mayoria render. Un test de render cubre ~80%.
3. `TeacherCard.test.jsx` — util ademas para validar los nuevos atributos ARIA.
4. `useStudents.test.js` — lógica de cache, unico hook sin test.

**Configuracion en vite.config.js:**

```javascript
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    thresholds: {
      lines: 60,
      branches: 60,
      functions: 60,
      statements: 60,
    },
    exclude: [
      'src/tests/**',
      'src/main.jsx',
      'tailwind.config.js',
      'postcss.config.js',
    ]
  }
}
```

---

## Analisis Tecnico: ARIA para TeacherCard Expandible

**Patron de referencia:** W3C APG Disclosure Pattern (Card) + Accordion Pattern

**Implementacion correcta para TeacherCard:**

El trigger (actualmente `<div onClick>`) debe convertirse en `<button>` nativo o al menos exponer:

| Atributo | Valor | Donde |
|----------|-------|-------|
| `role="button"` | implicito si se usa `<button>` nativo | Elemento trigger |
| `aria-expanded` | `{isExpanded}` (booleano) | Elemento trigger |
| `aria-controls` | `"teacher-panel-{teacher.id}"` | Elemento trigger |
| `tabIndex` | `0` (implicito en `<button>`) | Elemento trigger |
| `onKeyDown` | Enter/Space = toggle (implicito en `<button>`) | Elemento trigger |
| `id` | `"teacher-panel-{teacher.id}"` | Div del panel expandido |

**Opcion recomendada:** Convertir `<div onClick>` a `<button type="button">`. Razon:
- Semantica implicita (no necesita role=button manual)
- Enter y Space funcionan nativamente sin onKeyDown
- Focus con Tab funciona nativamente sin tabIndex
- Menor codigo, mayor robustez

**ChevronIcon:** agregar `aria-hidden="true"` al SVG. Es decorativo, el estado ya
esta comunicado por aria-expanded del padre.

**Confianza:** HIGH — basado en W3C APG Disclosure Card example (w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-card/).

---

## Dependencias entre Features

```
A11Y — Soporte teclado TeacherCard
  └── requiere ──> convertir <div> a <button> (prerrequisito de aria-expanded)
  └── habilita ──> TEST — TeacherCard.test.jsx con ARIA assertions

DOCS — JSDoc en paginas
  └── independiente de todo, se puede hacer en cualquier orden

SEC — Shared secret via PropertiesService
  └── requiere ──> VITE_API_TOKEN en .env del frontend
  └── requiere ──> Script Property 'API_SECRET' en Apps Script
  └── requiere ──> modificar src/services/api.js para enviar token
  └── requiere ──> modificar doGet/doPost en Code.gs para validar token

TEST — @vitest/coverage-v8 instalado
  └── prerrequisito de ──> TEST — coverage threshold en vite.config.js
  └── prerrequisito de ──> poder medir si el objetivo 60% se cumple

TEST — AttendancePage.test.jsx
  └── independiente de A11Y (no necesita esperar a TeacherCard)
  └── dependencia de ──> entender el contrato de useStudents (mock necesario)

TEST — TeacherCard.test.jsx
  └── mejor hacerlo DESPUES de A11Y para que las assertions de ARIA sean validas
```

### Notas de dependencia

- **SEC requiere cambios en 3 capas:** Apps Script, .env del frontend, api.js. Los 3 deben hacerse en el mismo PR o en secuencia controlada para no romper la app en produccion.
- **A11Y TeacherCard antes que TEST TeacherCard:** Si se escribe el test con la estructura actual (div no accesible), el test tendra que reescribirse tras el fix de A11Y. Hacer A11Y primero.
- **DOCS es completamente independiente:** JSDoc en paginas es el cambio de menor riesgo del milestone. Puede ir en cualquier orden o en un PR separado.

---

## MVP del Milestone (Ola 4 — prioridad)

### Lanzar primero (Ola 4 — max impacto, menos riesgo)

- [ ] **A11Y-01:** Convertir TeacherCard trigger a `<button>` con aria-expanded + aria-controls — desbloquea la navegacion por teclado en la pantalla de CEO
- [ ] **A11Y-02:** Atributos ARIA en GroupTabs (role=tablist + role=tab + aria-selected), aria-hidden en ChevronIcon
- [ ] **DOCS-01:** JSDoc en AttendancePage, DashboardPage, LoginPage, SavedPage — cero riesgo de regresion
- [ ] **TEST-01:** Instalar @vitest/coverage-v8 + configurar thresholds — prerequisito de todo lo demas en TEST

### Agregar en Ola 5 (mayor complejidad)

- [ ] **SEC-01..SEC-06:** Shared secret en Apps Script + modificacion de api.js + .env — coordinar deploy frontend + Apps Script
- [ ] **TEST-02:** Tests para AttendancePage y DashboardPage hasta llegar a 60% real
- [ ] **TEST-03:** Tests para TeacherCard validando ARIA post-fix

### Diferir (v2 o nunca)

- [ ] Rate limiting en Apps Script — complejidad/beneficio desproporcionado para 8 usuarios
- [ ] OAuth2 completo — overhead extremo para el modelo de amenaza real
- [ ] Tests E2E — los unit tests actuales cubren los flujos criticos con menor overhead

---

## Matriz de Priorizacion

| Feature | Valor usuario/dev | Costo implementacion | Prioridad |
|---------|-------------------|----------------------|-----------|
| A11Y-01: TeacherCard accesible | ALTO (WCAG compliance) | MEDIO | P1 |
| A11Y-02: ARIA en GroupTabs | MEDIO | BAJO | P1 |
| DOCS-01: JSDoc en paginas | MEDIO (onboarding) | MUY BAJO | P1 |
| TEST-01: coverage-v8 + threshold | ALTO (guardrail) | MUY BAJO | P1 |
| TEST-02: tests AttendancePage | ALTO (protege flujo critico) | ALTO | P1 |
| SEC-01..06: shared secret | ALTO (seguridad) | MEDIO-ALTO | P1 |
| TEST-03: tests DashboardPage | MEDIO | MEDIO | P2 |
| TEST-04: tests TeacherCard ARIA | MEDIO (valida A11Y) | MEDIO | P2 |
| Logging de accesos rechazados (SEC) | BAJO | MUY BAJO | P2 |
| JSDoc en helpers (buildTeachersHierarchy) | BAJO | MUY BAJO | P3 |
| Rate limiting Apps Script | MUY BAJO (8 usuarios) | MUY ALTO | No implementar |

**Clave:** P1 = necesario para cerrar milestone, P2 = agregar si hay tiempo, P3 = cosmético.

---

## Notas de Confianza

| Area | Confianza | Fundamento |
|------|-----------|------------|
| ARIA patterns para TeacherCard | HIGH | W3C APG Disclosure Card example + Accordion pattern (docs oficiales) |
| Keyboard behavior de `<button>` nativo | HIGH | HTML spec — Enter/Space implicitos en button |
| Apps Script e.parameter para shared secret | MEDIUM | Documentacion Google para doGet/doPost; pattern verificado en comunidad |
| Apps Script headers HTTP custom | LOW | No documentado oficialmente para Web Apps desplegadas como "Anyone" |
| 60% coverage con los tests listados | MEDIUM | Estimacion basada en proporcion de archivos con tests vs total; sin medicion real aun |
| @vitest/coverage-v8 v4 compatibilidad | HIGH | Anuncio oficial Vitest — v8 provider recomendado desde v3.2+ |
| JSDoc coverage actual | HIGH | Inspeccion directa del codigo — confirmado linea a linea |

---

## Sources

- [W3C APG Disclosure Card Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-card/) (HIGH — fuente oficial)
- [W3C APG Accordion Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) (HIGH — fuente oficial)
- [Vitest Coverage Guide](https://vitest.dev/guide/coverage) (HIGH — docs oficiales)
- [Google Apps Script External APIs](https://developers.google.com/apps-script/guides/services/external) (MEDIUM — docs Google)
- [Apps Script Web Apps — tanaikech/taking-advantage-of-Web-Apps-with-google-apps-script](https://github.com/tanaikech/taking-advantage-of-Web-Apps-with-google-apps-script/blob/master/README.md) (MEDIUM — comunidad verificada)
- [Secure Secrets in Google Apps Script](https://justin.poehnelt.com/posts/secure-secrets-google-apps-script/) (MEDIUM — practica verificada)
- Inspeccion directa del codigo: TeacherCard.jsx, Modal.jsx, ToggleSwitch.jsx, GroupTabs.jsx (HIGH)
- Ejecucion de tests: `npx vitest run` confirma 89 tests / 16 suites pasando (HIGH)
- Verificacion JSDoc: script bash sobre todos los archivos src/ (HIGH)

---

*Feature research for: NovAttend v1.1 Hardening — A11Y, DOCS, SEC, TEST*
*Researched: 2026-03-31*
