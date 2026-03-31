# Stack Research — NovAttend v1.1 Hardening (Olas 4-5)

**Domain:** PWA mobile-first React — ciclo de hardening (A11Y, DOCS, SEC, TEST)
**Researched:** 2026-03-31
**Scope:** Solo adiciones para las nuevas capacidades del milestone. Stack base no cambia.
**Confidence:** HIGH (versiones verificadas via npm registry + docs oficiales)

---

## Stack Base (No Tocar)

| Technology | Version Instalada | Rol |
|------------|-------------------|-----|
| React | ^19.2.0 | UI framework |
| Vite | ^7.3.1 | Build tool |
| react-router-dom | ^7.13.0 | SPA routing |
| vite-plugin-pwa | ^1.2.0 | PWA / Workbox |
| Tailwind CSS | ^3.4.19 | Styling |
| Vitest | ^4.0.18 | Test runner |
| @testing-library/react | ^16.3.2 | Component testing |
| @testing-library/user-event | ^14.6.1 | Keyboard/interaction simulation |
| @testing-library/jest-dom | ^6.9.1 | DOM matchers |

Nota: `useFocusTrap` custom ya existe en `src/hooks/useFocusTrap.js`. Modal ya tiene ARIA. No reinstalar focus-trap-react.

---

## Adiciones Recomendadas — Por Area

### A. Cobertura de Tests (`TEST-01..TEST-03`)

#### A1. `@vitest/coverage-v8`

| Campo | Valor |
|-------|-------|
| Paquete | `@vitest/coverage-v8` |
| Version | `^4.1.2` (debe coincidir exactamente con vitest instalado) |
| Peer dep | `vitest@4.1.2` — version exacta requerida |
| Proposito | Generar reporte de cobertura con proveedor V8 (nativo de Node) |
| Instalacion | `npm install -D @vitest/coverage-v8` |
| Comando | `vitest run --coverage` |

**Por que V8 y no Istanbul:** V8 no requiere pre-transpilacion (Istanbul instrumenta el codigo antes de ejecutarlo). Con Vitest 4, V8 usa analisis AST para remapear coverage, logrando precision comparable a Istanbul. Para este proyecto que ya corre en Node + jsdom, V8 es la opcion mas rapida sin dependencias adicionales.

**Configuracion para `vite.config.js`:**

```js
test: {
  coverage: {
    provider: 'v8',
    include: ['src/**/*.{js,jsx}'],
    exclude: [
      'src/tests/**',
      'src/main.jsx',
      'src/config/**',
      '**/*.config.*',
    ],
    thresholds: {
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60,
    },
    reporter: ['text', 'html'],
  },
}
```

**Nota critica para Vitest 4:** `coverage.all` fue eliminado en v4. Se debe especificar `coverage.include` explicitamente. Sin ello, solo los archivos que tienen tests aparecen en el reporte, lo que puede inflar artificialmente el porcentaje.

**Confianza:** HIGH — verificado en docs oficiales vitest.dev/guide/coverage + npm registry.

---

#### A2. `jest-axe` (A11Y testing en suites existentes)

| Campo | Valor |
|-------|-------|
| Paquete | `jest-axe` |
| Version | `^10.0.0` |
| Peer dep | Node >= 16 (sin peer deps de jest/vitest — funciona con ambos) |
| Proposito | Matchers `toHaveNoViolations` para tests ARIA/accesibilidad en Vitest |
| Instalacion | `npm install -D jest-axe` |

**Por que jest-axe y no vitest-axe:** `vitest-axe` (chaance/vitest-axe) esta en version 0.1.0, publicada hace 3 anos, sin actualizaciones. No es mantenido activamente. `jest-axe` 10.0.0 fue publicado hace menos de 12 meses y no tiene dependencias de Jest — el nombre es historico. Funciona con Vitest en entorno jsdom (unico requisito: no usar happy-dom, que ya no es el caso aqui).

**Setup en `src/tests/setup.js`:**

```js
import { configureAxe, toHaveNoViolations } from 'jest-axe'
import { expect } from 'vitest'

expect.extend(toHaveNoViolations)
```

**Patron de uso en tests:**

```jsx
import { axe } from 'jest-axe'
import { render } from '@testing-library/react'

it('no debe tener violaciones ARIA', async () => {
  const { container } = render(<TeacherCard teacher={mockTeacher} />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

**Limitacion conocida:** Los checks de contraste de color no funcionan en jsdom. `jest-axe` los desactiva por defecto. Esto es correcto — el contraste del design system ya esta auditado manualmente.

**Confianza:** HIGH — npm confirma v10.0.0, Node >= 16, sin peer deps de Jest.

---

### B. Accesibilidad A11Y (`A11Y-01`, `A11Y-02`)

#### B1. `eslint-plugin-jsx-a11y`

| Campo | Valor |
|-------|-------|
| Paquete | `eslint-plugin-jsx-a11y` |
| Version | `^6.10.2` |
| Peer dep | ESLint >= 9 (compatible con flat config) |
| Proposito | Reglas de linting estatico para atributos ARIA, roles, keyboard support |
| Instalacion | `npm install -D eslint-plugin-jsx-a11y` |

**Por que:** La version 6.10.x exporta `jsxA11y.flatConfigs.recommended` para ESLint 9 flat config. El proyecto ya usa ESLint 9 con flat config en `eslint.config.js` — la integracion es directa. Captura clases de errores ARIA que las revisiones manuales pierden: roles interactivos sin handlers de teclado, `img` sin `alt`, etc.

**Integracion en `eslint.config.js`:**

```js
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  // ... configs existentes ...
  {
    ...jsxA11y.flatConfigs.recommended,
    files: ['**/*.{js,jsx}'],
  },
]
```

**Confianza:** HIGH — npm v6.10.2, flat config soporte confirmado en GitHub issue #978 y releases.

---

No se requieren otras dependencias de produccion para A11Y. El soporte de teclado en `TeacherCard` se implementa con atributos HTML nativos (`role="button"`, `tabIndex={0}`, `onKeyDown`) — zero dependencias nuevas.

---

### C. Documentacion JSDoc (`DOCS-01`)

#### C1. `eslint-plugin-jsdoc`

| Campo | Valor |
|-------|-------|
| Paquete | `eslint-plugin-jsdoc` |
| Version | `^62.8.1` |
| Peer dep | ESLint >= 9 (compatible con flat config) |
| Proposito | Valida que los JSDoc existan y sean correctos (parametros, tipos) |
| Instalacion | `npm install -D eslint-plugin-jsdoc` |

**Por que:** El milestone requiere JSDoc en 11 componentes. Sin validacion automatica, el JSDoc se vuelve stale con el tiempo. `eslint-plugin-jsdoc` en modo `flat/recommended` valida que los `@param` declarados coincidan con los parametros reales de la funcion, y que los tipos en `@returns` existan. Con ESLint 9 flat config, la integracion es una linea.

**Configuracion minima en `eslint.config.js`:**

```js
import jsdoc from 'eslint-plugin-jsdoc'

export default [
  // ... configs existentes ...
  {
    ...jsdoc.configs['flat/recommended'],
    files: ['src/components/**/*.jsx', 'src/hooks/**/*.js'],
    rules: {
      // El proyecto usa JSDoc descriptivo, no requiere @returns en todos
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-description': 'off',
      // Si hay @param declarado, debe coincidir con los params reales
      'jsdoc/check-param-names': 'error',
      'jsdoc/require-param': 'warn',
    },
  },
]
```

**Por que no JSDoc CLI (generacion de HTML):** El milestone pide JSDoc en componentes como documentacion inline para el equipo dev, no un sitio de docs publico. La validacion via ESLint es suficiente y se integra en el flujo `npm run lint` existente. Un sitio generado seria overhead sin audiencia (8 usuarios internos, dev team de 1).

**Confianza:** HIGH — npm v62.8.1, mantenimiento activo (gajus/eslint-plugin-jsdoc), flat config soporte documentado.

---

### D. Autenticacion Server-Side en Apps Script (`SEC-01..SEC-06`)

No requiere nuevas dependencias npm. El backend vive en `apps-script/Codigo.js` (Google Apps Script V8 runtime). La autenticacion se implementa con primitivas nativas de Apps Script.

#### D1. Patron recomendado: API Key en PropertiesService + HMAC-SHA256

**Por que PropertiesService y no Secret Manager:** Para 8 usuarios internos en una academia, Secret Manager (GCP) es over-engineering. PropertiesService es la solucion nativa de Apps Script: datos aislados del codigo, no visibles en el editor a usuarios sin acceso al script.

**Flujo de autenticacion:**

```
Cliente (React)                         Apps Script (doGet/doPost)
-----------                             --------------------------
1. Envia X-Api-Key en header           2. Lee PropertiesService.getScriptProperties()
   O como parametro ?key=...              .getProperty('API_KEY')
                                       3. Compara con tiempo constante (evita timing attacks)
                                       4. Si no coincide → jsonError('No autorizado', 401)
                                       5. Si coincide → procesa request
```

**Problema critico de Apps Script:** Los headers HTTP custom (`X-Api-Key`) NO son accesibles en `doGet(e)` — el objeto `e` solo expone `e.parameter`, `e.parameters`, `e.postData`, `e.queryString`, `e.pathInfo`. Google no expone `e.headers` para Web Apps desplegados como "Anyone".

**Solucion correcta:** Pasar el API key como parametro de query string (`?key=...`) o en el body del POST (`postData`). Esto expone la clave en la URL (logs, historial de browser) — mitigar con HTTPS (ya es el caso) y using POST para operaciones de escritura.

**Implementacion en `Codigo.js`:**

```js
// En PropertiesService (configurar una sola vez desde el editor de Apps Script)
// PropertiesService.getScriptProperties().setProperty('API_KEY', 'VALOR_SECRETO_AQUI')

function validateAuth(e) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('API_KEY')
  if (!apiKey) return false  // Key no configurada — falla closed

  const incoming = e.parameter.key || ''
  // Comparacion de longitud constante para evitar timing attacks
  if (incoming.length !== apiKey.length) return false
  return Utilities.computeHmacSha256Signature(incoming, 'salt') ===
         Utilities.computeHmacSha256Signature(apiKey, 'salt')
}

function doGet(e) {
  if (!validateAuth(e)) return jsonError('No autorizado', 401)
  // ... resto del handler
}
```

**Alternativa con HMAC por request (mayor seguridad):** Firmar cada request con `timestamp + action` usando la clave compartida. Previene replay attacks. Recomendado si la app crece en usuarios externos. Para 8 usuarios internos, el API key estatico con HTTPS es pragmaticamente suficiente.

**Donde guardar el API_KEY en el frontend:** En `.env` como `VITE_API_SECRET`, nunca hardcodeado. Ya existe el patron `VITE_API_URL` en el proyecto — seguir el mismo patron.

**Confianza:** MEDIUM — `Utilities.computeHmacSha256Signature` verificado en docs oficiales de Apps Script. La limitacion de que `e.headers` no esta disponible en Web Apps publicos es conocida en la comunidad pero no esta documentada explicitamente por Google (confirmada via busqueda de comunidad + inspeccion de la API reference). La recomendacion de usar `e.parameter.key` es un workaround establecido.

---

## Instalacion — Solo Nuevas Dependencias

```bash
# Dev dependencies (no afectan bundle de produccion)
npm install -D @vitest/coverage-v8 jest-axe eslint-plugin-jsx-a11y eslint-plugin-jsdoc
```

**Impacto en bundle de produccion:** Cero. Todas son `devDependencies`. El bundle final no cambia.

---

## Alternativas Consideradas y Descartadas

| Categoria | Recomendado | Alternativa | Por que No |
|-----------|-------------|-------------|------------|
| A11Y tests | `jest-axe@^10.0.0` | `vitest-axe@0.1.0` | vitest-axe sin mantenimiento activo (3 anos sin release) |
| A11Y tests | `jest-axe@^10.0.0` | `@axe-core/react` | Requiere componente wrapper en produccion, no en tests |
| Coverage | `@vitest/coverage-v8` | `@vitest/coverage-istanbul` | Istanbul mas lento; V8 precision comparable desde Vitest 3.2+ |
| JSDoc validation | `eslint-plugin-jsdoc` | `jsdoc` CLI (generacion HTML) | HTML docs no tiene audiencia; validacion inline es suficiente |
| Apps Script auth | PropertiesService API key | Google Cloud Secret Manager | Over-engineering para 8 usuarios internos |
| Apps Script auth | PropertiesService API key | OAuth 2.0 con ScriptApp.getOAuthToken() | Expone OAuth token al cliente — riesgo de seguridad segun docs oficiales |
| A11Y keyboard | libreria externa | Atributos HTML nativos | `role="button"` + `tabIndex={0}` + `onKeyDown` es suficiente para TeacherCard; cero dependencias |

---

## Compatibilidad de Versiones

| Paquete A | Compatible Con | Notas |
|-----------|----------------|-------|
| `@vitest/coverage-v8@4.1.2` | `vitest@4.0.18` | Peer dep requiere version identica de vitest. Si vitest se actualiza a 4.1.x, actualizar coverage-v8 tambien. |
| `jest-axe@10.0.0` | `vitest@cualquier` | No tiene peer dep de jest/vitest. Requiere `jsdom` (ya configurado). No usar con `happy-dom`. |
| `eslint-plugin-jsx-a11y@6.10.2` | `eslint@9.39.1` | Flat config via `jsxA11y.flatConfigs.recommended`. API legacy de eslintrc no aplica. |
| `eslint-plugin-jsdoc@62.8.1` | `eslint@9.39.1` | Flat config via `jsdoc.configs['flat/recommended']`. |

---

## Lo que NO Agregar

| Evitar | Por que | Usar En Su Lugar |
|--------|---------|-----------------|
| `@axe-core/react` | Requiere componente `<Axe>` en el arbol de React — afecta produccion si no se condiciona bien | `jest-axe` en tests — mismo motor, zero impacto en produccion |
| `vitest-axe` | Sin mantenimiento desde 2022, version 0.1.0 | `jest-axe@10.0.0` — funciona con Vitest+jsdom |
| `jsdoc` (CLI) | Genera HTML que nadie va a leer; team de 1 dev, 8 usuarios internos | `eslint-plugin-jsdoc` — valida inline en lint |
| `@vitejs/coverage-istanbul` | Mas lento que V8; precision ya comparable en Vitest 4 | `@vitest/coverage-v8` |
| `typedoc` | Requiere TypeScript; proyecto es JSX puro | `eslint-plugin-jsdoc` con tipos en JSDoc comments |
| JWT en Apps Script | Implementacion manual sin libreria validada; complejidad alta | API key en PropertiesService — seguridad suficiente para el scope |

---

## Sources

- `@vitest/coverage-v8` version: npm registry verificado 2026-03-31
- Vitest coverage config (v4): [vitest.dev/guide/coverage](https://vitest.dev/guide/coverage) — proveedor V8, `coverage.include`, thresholds
- Vitest v4 migration (coverage.all removido): [vitest.dev/guide/migration](https://vitest.dev/guide/migration.html)
- `jest-axe` v10.0.0: npm registry verificado, Node >= 16, sin peer dep de Jest
- `jest-axe` happy-dom limitacion: [github.com/chaance/vitest-axe README](https://github.com/chaance/vitest-axe/blob/main/README.md)
- `eslint-plugin-jsx-a11y` flat config: [github.com/jsx-eslint/eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) issue #978
- `eslint-plugin-jsdoc` v62: [github.com/gajus/eslint-plugin-jsdoc](https://github.com/gajus/eslint-plugin-jsdoc) — flat config documentado
- Apps Script Utilities HMAC: [developers.google.com/apps-script/reference/utilities](https://developers.google.com/apps-script/reference/utilities/utilities) — `computeHmacSha256Signature` verificado
- Apps Script PropertiesService: [developers.google.com/apps-script/guides/properties](https://developers.google.com/apps-script/guides/properties)
- Apps Script Web App event object (sin `e.headers`): [developers.google.com/apps-script/guides/web](https://developers.google.com/apps-script/guides/web)
- HMAC timing-safe comparison pattern: [authgear.com/post/hmac-api-security](https://www.authgear.com/post/hmac-api-security)

---

*Stack research para: NovAttend v1.1 Hardening — A11Y, DOCS, SEC, TEST*
*Researched: 2026-03-31*
