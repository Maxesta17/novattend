# Project Research Summary

**Project:** NovAttend v1.1 Hardening — A11Y, DOCS, SEC, TEST (Olas 4-5)
**Domain:** React 19 PWA hardening — accesibilidad, documentacion, autenticacion backend, cobertura de tests
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

NovAttend v1.0 es una PWA mobile-first (React 19 + Vite 7 + Tailwind 3) en produccion para 7 profesores y 1 CEO en LingNova Academy. Las Olas 1-3 cerraron bugs criticos, optimizaron el bundle y refactorizaron la arquitectura. Este milestone (Olas 4-5) cierra cuatro areas de deuda tecnica residual: WCAG 2.1 keyboard accessibility (A11Y), JSDoc en 11 componentes (DOCS), autenticacion server-side para el backend de Google Apps Script (SEC), y expansion de cobertura de tests desde un estimado de 35-45% hasta un 60% verificado (TEST). La investigacion confirma que todas estas areas tienen implementaciones claras y documentadas, sin cambios de framework ni dependencias nuevas en produccion.

El approach recomendado respeta el orden de dependencias: DOCS primero (cero riesgo de comportamiento), A11Y despues (cambios estructurales de DOM que los tests deben verificar despues de los cambios, no antes), SEC en tercer lugar (cambio coordinado de tres capas: Apps Script + .env + api.js), y TEST al final para escribir aserciones contra contratos estables. La unica nueva dependencia de desarrollo que es prerequisito bloqueante para todo el trabajo de TEST es `@vitest/coverage-v8` — sin ella, `npm test -- --coverage` falla con un error fatal y la cobertura no puede medirse en absoluto.

El riesgo mas critico de este milestone es la restriccion de Google Apps Script: enviar un header `Authorization` a un Web App de GAS provoca un CORS preflight OPTIONS que Apps Script no puede responder, bloqueando silenciosamente toda llamada API. El unico patron viable es pasar el shared secret como parametro de query string en GET y en el body de POST. Esto significa que el token es visible en los logs de red del navegador — un tradeoff aceptado para una herramienta interna de 8 usuarios, pero que debe documentarse explicitamente en lugar de asumirse como seguro. Un riesgo secundario es que `users.js` contiene contrasenas en texto plano en el bundle del cliente; el plan de SEC debe contener una decision explicita de scope: incluir la migracion a verificacion server-side de credenciales o documentarlo como riesgo aceptado con un item de seguimiento para v1.2.

---

## Key Findings

### Recommended Stack

El stack base no cambia. Cuatro dependencias de desarrollo son recomendadas — ninguna impacta el bundle de produccion:

| Dependencia | Version | Proposito | Por que esta eleccion |
|-------------|---------|----------|----------------------|
| `@vitest/coverage-v8` | `^4.1.2` | Reporte de cobertura | Proveedor V8 nativo de Node, mas rapido que Istanbul, misma precision desde Vitest 3.2+. La peer dep debe coincidir exactamente con la version de vitest instalada. |
| `jest-axe` | `^10.0.0` | Deteccion de violaciones ARIA en tests | `vitest-axe` no tiene mantenimiento activo (v0.1.0, 3 anos sin release). `jest-axe` v10 no tiene peer dep de Jest — funciona con Vitest + jsdom. |
| `eslint-plugin-jsx-a11y` | `^6.10.2` | Linting estatico de ARIA | Compatible con ESLint 9 flat config via `jsxA11y.flatConfigs.recommended`. Detecta gaps de role/keyboard que la revision manual pierde. |
| `eslint-plugin-jsdoc` | `^62.8.1` | Validacion de JSDoc | Fuerza que los `@param` coincidan con los parametros reales. Previene docs desactualizados. Compatible con flat config. |

La autenticacion de Apps Script no requiere dependencias npm. Se implementa con `PropertiesService.getScriptProperties()` (nativo de GAS) para almacenar el API key fuera del codigo fuente, y con comparacion de cadenas en tiempo constante para reducir el riesgo de timing attacks.

**Nota critica de versiones:** `@vitest/coverage-v8` debe coincidir exactamente con la version instalada de `vitest`. La opcion `coverage.all` fue eliminada en Vitest v4 — usar `coverage.include` explicitamente o solo los archivos con tests aparecen en el reporte, inflando artificialmente el porcentaje.

### Expected Features

**Must have (table stakes — cierra deuda tecnica activa):**

- **A11Y-01: Soporte de teclado en TeacherCard** — WCAG 2.1 SC 2.1.1 (Nivel A). El trigger de expand/collapse es un `<div onClick>` sin `tabIndex`, `role` ni `onKeyDown`. El CEO no puede operarlo con teclado. Fix: convertir a `<button type="button">` con `aria-expanded={isExpanded}`. El boton nativo proporciona Enter/Space y foco por Tab de forma nativa.
- **A11Y-02: Atributos ARIA en GroupTabs, AlertList, ProgressBar, StatCard** — `GroupTabs` necesita `role="tablist"` + `role="tab"` + `aria-selected`. Los items de `AlertList` necesitan conversion a `<button>`. `ProgressBar` necesita `role="progressbar"` + `aria-valuenow/min/max`. `StatCard` necesita `role="button"` condicional cuando se provee `onClick`.
- **DOCS-01: JSDoc en 4 paginas y ~8 componentes adicionales** — `AttendancePage`, `DashboardPage`, `LoginPage` y `SavedPage` no tienen cabecera JSDoc. Son el punto de entrada de cualquier desarrollador nuevo. Adicionalmente, componentes ui/ y hooks menores (`Badge`, `ErrorBanner`, `UpdateBanner`, `LoadingSpinner`, `useConvocatorias`, `useStudents`, `useDebounce`, `buildTeachersHierarchy`) requieren verificacion y adicion de JSDoc.
- **TEST-01: Instalar `@vitest/coverage-v8` + configurar thresholds** — Sin el proveedor instalado, `--coverage` falla con error fatal. Sin `thresholds` en `vite.config.js`, el objetivo de 60% nunca se enforza automaticamente.
- **TEST-02: Tests para AttendancePage y DashboardPage** — `AttendancePage` (182 lineas, flujo critico de negocio) no tiene tests. `DashboardPage` (127 lineas) no tiene tests. Son los candidatos de mayor ROI para alcanzar 60%.
- **SEC-01 a SEC-06: Shared secret auth para Apps Script** — El endpoint de GAS es actualmente publico para cualquier llamante que conozca la URL. Agregar un shared secret almacenado en Script Properties, validado en `doGet`/`doPost` antes de cualquier acceso a datos.

**Should have (diferenciadores de calidad):**

- Focus-visible ring en elementos `<button>` convertidos (patron `focus-visible:outline-burgundy` ya existe en `ToggleSwitch` — copiar)
- `aria-hidden="true"` en el SVG ChevronIcon decorativo dentro de TeacherCard
- `aria-label="Buscar profesor"` en `SearchInput` del Dashboard
- Tests para `TeacherCard` con aserciones ARIA (valida el trabajo de A11Y)
- Tests para el hook `useStudents` (unico hook sin tests; protege la logica de cache de grupos)
- Tests para `buildTeachersHierarchy` (funcion pura, ROI alto, sin mocks necesarios)
- Logging de requests rechazados en Apps Script (una linea; habilita deteccion de accesos no autorizados)

**Defer (v2 o nunca):**

- Rate limiting via Apps Script CacheService — complejidad desproporcionada para 8 usuarios internos
- OAuth2 completo para Apps Script — requiere redirect URIs, manejo de token refresh; over-engineered para este scope
- Migracion de credenciales de `users.js` a verificacion server-side — mejora de seguridad valida pero constituye una rearquitectura completa de auth; diferir a v1.2 a menos que se incluya explicitamente en SEC
- Tests E2E (Playwright/Cypress) — los tests unitarios/de integracion existentes cubren los flujos criticos con menor overhead
- 100% de cobertura — la relacion costo/beneficio es desfavorable para 8 usuarios internos

### Architecture Approach

Todos los cambios del hardening son modificaciones a archivos existentes dentro de la arquitectura de cuatro capas actual (pages → features → ui → hooks/services). No se requieren nuevos directorios ni patrones arquitectonicos nuevos ni dependencias de produccion. El trabajo toca cinco de las seis capas: feature components (A11Y), ui components (A11Y), pages (DOCS + TEST), services (SEC), y el backend de Apps Script (SEC). La capa de hooks gana nuevos archivos de test. La capa de config (`users.js`) gana un campo `token` por usuario.

**Puntos de cambio principales:**

1. `src/components/features/TeacherCard.jsx` — A11Y-01: conversion de div a button + aria-expanded + aria-controls. Actualmente 143 lineas; llegara a ~160 lineas despues del cambio, por debajo del limite de 250.
2. `apps-script/Codigo.js` + `src/services/api.js` + `src/config/users.js` — SEC: cambio coordinado en tres archivos. Token en Script Properties, inyectado transparentemente por `apiGet`/`apiPost`, validado antes del cache lookup en `doGet`/`doPost`.
3. `vite.config.js` — TEST: agregar bloque `test.coverage` con proveedor V8, reporter, thresholds e `include`/`exclude` explicitos. Sin esto, la cobertura no se mide.
4. Cinco nuevos archivos de test: `TeacherCard.test.jsx`, `GroupTabs.test.jsx`, `AlertList.test.jsx`, `buildTeachersHierarchy.test.js`, `useStudents.test.jsx`.

**Patrones establecidos a seguir:**

- Elementos interactivos accesibles: siempre `<button type="button">` en lugar de `<div role="button">` — el boton nativo proporciona comportamiento de teclado, cursor y semantica de forma nativa con menos codigo
- ARIA disclosure widget: `aria-expanded={isExpanded}` en el trigger; omitir `aria-controls` si el contenido se renderiza condicionalmente con `&&` (el elemento del DOM no existira para ser referenciado cuando este colapsado)
- Inyeccion de token en el boundary del servicio: `api.js` lee de `sessionStorage` una vez por request, sin prop drilling a traves de componentes
- Script Properties para secrets: nunca en el codigo fuente de `Code.gs`, siempre en `PropertiesService.getScriptProperties()`

### Critical Pitfalls

1. **Header Authorization a Apps Script provoca CORS preflight fatal** — GAS Web Apps no pueden responder al OPTIONS preflight que los headers `Authorization` o `X-API-Key` requieren. La llamada API falla antes de llegar al servidor, con un error de CORS en consola, no un error de auth. Prevencion: pasar el shared secret como `?api_key=` en GET y en el body de POST. Sin excepciones.

2. **`VITE_API_KEY` queda embebido en el bundle de produccion** — Las variables `VITE_*` se sustituyen estaticamente en tiempo de build. La clave es legible en DevTools > Sources en cualquier build deployado. Prevencion: aceptar esta limitacion explicitamente, documentarla en el plan de implementacion, y no usar nombres de variable que impliquen falsa seguridad. Rotacion: actualizar Script Properties + variable de entorno de Vercel si se compromete.

3. **Conversion de div a button rompe el layout flex** — Un `<button>` es inline por defecto. Convertir un `<div class="flex items-center gap-3">` a `<button>` colapsa el ancho y rompe el alineado de Avatar/Chevron. Prevencion: agregar `w-full flex text-left type="button"` a cada button convertido. Probar cada conversion visualmente de forma aislada antes de continuar con la siguiente.

4. **`aria-controls` referencia contenido que no esta en el DOM** — Cuando el contenido se renderiza condicionalmente con `&&`, `aria-controls="panel-id"` apunta a un elemento inexistente cuando esta colapsado. Los lectores de pantalla reportan una referencia rota. Prevencion: usar `aria-expanded` solo (suficiente segun WCAG); agregar `aria-controls` solo si el panel usa `hidden={!isExpanded}` en lugar de `&&`.

5. **El proveedor de cobertura faltante bloquea todo el trabajo de TEST** — `vitest run --coverage` falla con `Error: Failed to load coverage provider "v8"` sin `@vitest/coverage-v8` instalado. Ademas, sin `thresholds` en `vite.config.js`, el objetivo de 60% nunca se enforza. Prevencion: instalar `@vitest/coverage-v8` como primera accion de la fase TEST, y configurar los thresholds en el mismo commit.

---

## Implications for Roadmap

Basado en la investigacion, la estructura de 3 fases para Olas 4-5 es la correcta. El orden esta determinado por dependencias tecnicas y perfil de riesgo.

### Fase 1 (Ola 4, Parte A): DOCS + A11Y Foundation

**Razon:** DOCS (adiciones de JSDoc) son cambios de cero riesgo verificables puramente por inspeccion de codigo — ideal para arrancar el milestone con momentum. A11Y sigue inmediatamente porque los cambios estructurales del DOM (conversiones div-to-button) deben estar completos antes de que se escriban los tests que los verifican. Escribir tests contra la estructura pre-ARIA y luego cambiar la estructura crea suites de tests con fallo falso y retrabajo innecesario.

**Entrega:** Compliance WCAG 2.1 Nivel A en todos los componentes interactivos; cobertura JSDoc completa en los 32+ archivos; reglas de ESLint que enforzan A11Y y calidad de JSDoc automaticamente.

**Features de FEATURES.md:** A11Y-01 (teclado TeacherCard), A11Y-02 (GroupTabs, AlertList, ProgressBar, StatCard ARIA), DOCS-01 (paginas + componentes + hooks + utils).

**Evita:** Escribir tests de A11Y antes de que los cambios de A11Y esten estables (anti-patron de ARCHITECTURE.md); JSDoc que duplica nombres de props sin agregar contexto (Pitfall 7 de PITFALLS.md).

**Instalar en esta fase:** `eslint-plugin-jsx-a11y`, `eslint-plugin-jsdoc`.

---

### Fase 2 (Ola 4, Parte B + Ola 5, Parte A): TEST Foundation + Coverage Push

**Razon:** Los tests se escriben contra los contratos de componentes finales y A11Y-estables de la Fase 1. El proveedor de cobertura se instala primero porque desbloquea la medicion del baseline real — sin el, "60% de cobertura" es un objetivo sin medidor. Los nuevos tests para `TeacherCard`, `GroupTabs`, `AlertList`, `buildTeachersHierarchy` y `useStudents` tanto validan el trabajo de A11Y de la Fase 1 como empujan la cobertura hacia el umbral del 60%.

**Entrega:** `@vitest/coverage-v8` instalado y configurado con thresholds enforzados; 5 nuevos archivos de test; cobertura en o por encima del 60% verificada por el umbral.

**Features de FEATURES.md:** TEST-01 (instalar + configurar cobertura), TEST-02 (tests AttendancePage + DashboardPage), TEST-03 (tests TeacherCard ARIA post-fix).

**Evita:** Coverage gaming con tests de solo render (Pitfall 8 de PITFALLS.md); proveedor de cobertura faltante en build time (Pitfall 9).

**Instalar en esta fase:** `jest-axe`, `@vitest/coverage-v8`.

---

### Fase 3 (Ola 5, Parte B): SEC — Backend Auth Hardening

**Razon:** SEC es la ultima porque es la unica fase que requiere un deploy coordinado multi-capa: `users.js` (agregar campos `token`), `src/services/api.js` (inyectar token en cada request), `apps-script/Codigo.js` (validar token antes de cualquier acceso a datos). Ejecutarla despues de que los tests se estabilicen significa que las adiciones de test post-SEC (aserciones de inyeccion de token en `api.test.jsx` y `LoginPage.test.jsx`) pueden escribirse contra un contrato finalizado. Deployar SEC a mitad del milestone romperia la app para usuarios en produccion mientras los tests aun estan siendo escritos.

**Entrega:** Endpoint de Apps Script protegido por shared secret validado en `doGet`/`doPost` antes del cache lookup; token almacenado en Script Properties (no en el codigo fuente); token inyectado transparentemente en `api.js`; variable de entorno de Vercel actualizada con el nuevo `VITE_API_KEY`.

**Features de FEATURES.md:** SEC-01 a SEC-06 (validacion de shared secret, almacenamiento en PropertiesService, inyeccion de token, logging de requests rechazados).

**Evita:** CORS preflight por header Authorization (Pitfall 1 — critico); auth check despues del cache lookup (Integration Gotcha de PITFALLS.md); decision de scope de credenciales `users.js` como oversight en lugar de decision explicita (Pitfall 3).

**Sin nuevas dependencias npm.**

---

### Phase Ordering Rationale

- **DOCS y A11Y agrupados:** Ambos son cambios de calidad de codigo sin dependencias externas. Agruparlos en una fase reduce el context-switching y permite que los plugins de ESLint enforzen ambas preocupaciones desde el mismo commit.
- **TEST despues de A11Y:** Los tests deben verificar los contratos ARIA finales. Si la estructura de `aria-expanded` de TeacherCard cambia a mitad del sprint, cualquier test escrito antes del cambio debe reescribirse. La secuencia es mas segura.
- **SEC al final antes de adiciones de test:** Los cambios de `api.js` (inyeccion de token) afectan el `api.test.jsx` existente. Implementar SEC despues del push principal de tests significa que los tests existentes siguen pasando durante SEC, y las aserciones especificas de SEC se agregan en un batch enfocado y de scope claro.
- **Ninguna fase requiere `/gsd:research-phase`:** Todos los patrones estan establecidos y bien documentados (W3C APG, docs oficiales de Vitest, docs oficiales de Apps Script). El unico area de confianza MEDIUM (token de Apps Script via query param) tiene verificacion comunitaria suficiente para proceder sin investigacion adicional.

### Research Flags

Fases con patrones estandar (sin necesidad de `/gsd:research-phase`):
- **Fase 1 (DOCS + A11Y):** Los patrones W3C APG y la configuracion de flat config de ESLint estan completamente documentados. Confianza HIGH en todas las decisiones de implementacion.
- **Fase 2 (TEST):** El proveedor V8 de Vitest y los patrones de Testing Library son documentacion oficial. La integracion de jest-axe es un setup de 2 lineas. Confianza HIGH.
- **Fase 3 (SEC):** El patron de shared secret via query param tiene confianza MEDIUM (verificado por la comunidad, no documentado oficialmente por Google para este caso de uso exacto). Suficiente para proceder, pero el plan de implementacion debe incluir una nota de fallback: si el token via query param es rechazado por algun motivo, la alternativa es token embebido en el body para todas las requests (ya es el patron de POST; GET necesitaria convertirse a POST).

Necesita investigacion adicional solo si el scope se expande:
- Mover credenciales de `users.js` a verificacion server-side (si se incluye explicitamente en el scope de SEC) — requiere diseniar un flujo `doPost({ action: "login" })` e issuance de session token en Apps Script.
- IP allowlisting en Vercel (si el equipo trabaja desde una IP de oficina fija) — simple de implementar pero necesita confirmacion de la estabilidad de IP del equipo.

---

## Confidence Assessment

| Area | Confianza | Notas |
|------|-----------|-------|
| Stack | HIGH | Versiones de todos los paquetes verificadas en npm registry 2026-03-31. La peer dep constraint de vitest/coverage-v8 es un requerimiento duro documentado en docs oficiales. |
| Features | HIGH | Basado en inspeccion directa del codigo (auditoria archivo por archivo) + patrones oficiales W3C APG. Los patrones ARIA para TeacherCard y GroupTabs verificados contra los ejemplos Disclosure y Tabs del W3C APG. |
| Architecture | HIGH | Verificado contra el codebase real (todos los archivos revisados). Sin ambiguedad arquitectonica — todos los cambios son modificaciones a archivos existentes usando patrones ya presentes en el codebase (ToggleSwitch como referencia de A11Y, api.js como referencia del boundary de servicio). |
| Pitfalls | HIGH | El CORS preflight de GAS es una restriccion documentada a nivel de plataforma. El layout break de div-to-button es un comportamiento conocido de HTML. El error del proveedor de cobertura esta documentado en las guias de migracion de Vitest. Solo item MEDIUM: comportamiento exacto del token de GAS via query param a escala (verificado por la comunidad pero no probado oficialmente en esta configuracion de deploy exacta). |

**Overall confidence:** HIGH

### Gaps to Address

- **Scope de contrasenas en `users.js`:** La investigacion identifica esto como un riesgo de seguridad activo pero el scope de SEC de v1.1 no lo resuelve completamente (la verificacion server-side de credenciales requiere un nuevo flujo `doPost action: "login"`). El plan de implementacion de la Fase 3 debe contener una decision explicita: incluirlo o documentarlo como riesgo conocido aceptado con un item de seguimiento para v1.2. No puede quedar como oversight.
- **Version lock de peer dep de Vitest:** Si `vitest` se actualiza (ej. de 4.0.18 a 4.1.x) durante el milestone, `@vitest/coverage-v8` debe actualizarse a la misma version minor en el mismo commit. Esto es una trampa de mantenimiento si se ignora en una actualizacion rapida de dependencias. Marcar en el plan de la Fase TEST.
- **`aria-controls` y renderizado condicional:** La investigacion de arquitectura recomienda omitir `aria-controls` cuando el contenido usa renderizado `&&`. Esta es la eleccion pragmatica pero diverge del patron completo del W3C APG accordion. El plan de implementacion debe confirmar esta decision — `aria-expanded` solo es WCAG-compliant.

---

## Sources

### Primary (HIGH confidence)
- W3C APG Disclosure Card Pattern — https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/ — patron expanded/controls para TeacherCard
- W3C APG Tabs Pattern — https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ — role/aria-selected para GroupTabs
- WCAG 2.1 Keyboard Accessible (2.1.1) — https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html — base para todos los table stakes de A11Y
- Vitest Coverage Guide — https://vitest.dev/guide/coverage — proveedor V8, thresholds, coverage.include
- Vitest v4 Migration — https://vitest.dev/guide/migration.html — eliminacion de coverage.all, requerimiento de include
- Google Apps Script PropertiesService — https://developers.google.com/apps-script/guides/properties — patron Script Properties para secrets
- Google Apps Script Web Apps docs — https://developers.google.com/apps-script/guides/web — acceso a e.parameter, sin soporte de OPTIONS
- npm registry — jest-axe@10.0.0, @vitest/coverage-v8@4.1.2, eslint-plugin-jsx-a11y@6.10.2, eslint-plugin-jsdoc@62.8.1 — verificado 2026-03-31
- Auditoria directa del codebase (2026-03-31) — TeacherCard.jsx, Modal.jsx, ToggleSwitch.jsx, users.js, api.js, Codigo.js — HIGH confidence, verificado linea por linea

### Secondary (MEDIUM confidence)
- tanaikech — Taking Advantage of Web Apps with GAS — https://github.com/tanaikech/taking-advantage-of-Web-Apps-with-google-apps-script — comportamiento CORS de GAS, patron de auth via query param
- justin.poehnelt.com — Secure Secrets in Google Apps Script — patron de shared secret via Script Properties
- eslint-plugin-jsx-a11y GitHub issue #978 — soporte de flat config confirmado para ESLint 9
- iith.dev/blog/app-script-cors/ — CORS fix para GAS Web Apps, comportamiento OPTIONS no soportado

### Tertiary (LOW confidence — necesita validacion durante implementacion)
- Disponibilidad de `e.headers` en Apps Script: no documentado oficialmente para Web Apps deployadas como "Anyone". Consenso comunitario: headers no reenviados de forma confiable. Decision: no usar headers para auth.

---
*Research completed: 2026-03-31*
*Ready for roadmap: yes*
