# Phase 4: Documentacion y Accesibilidad - Research

**Researched:** 2026-04-01
**Domain:** WAI-ARIA patterns, JSDoc, ESLint plugins (jsx-a11y, jsdoc)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Teclado en TeacherCard (A11Y-01)**
- D-01: La cabecera entera de TeacherCard es un solo tab stop con `role="button"`. Enter/Space expande/colapsa, Escape colapsa.
- D-02: El contenido expandido (grupos, alumnos, stats) NO es navegable por teclado — es informacion visual del CEO, no elementos interactivos.
- D-03: El SVG chevron lleva `aria-hidden="true"` (decorativo). La cabecera lleva `aria-expanded="true/false"` para indicar estado al screen reader.

**Patron ARIA en GroupTabs (A11Y-02)**
- D-04: Implementar WAI-ARIA Tabs completo: contenedor con `role="tablist"` + `aria-label="Grupos"`, cada boton con `role="tab"` + `aria-selected`.
- D-05: Navegacion por teclado: Arrow Left/Right mueve entre tabs, Tab sale del grupo de tabs. Solo el tab activo esta en el tab order (`tabIndex={0}`), los demas tienen `tabIndex={-1}`.
- D-06: El contenedor de alumnos lleva `role="tabpanel"` con `aria-labelledby` apuntando al tab activo.

**Focus ring global (A11Y-03)**
- D-07: Ring global burgundy definido en `src/index.css` con `@layer base`: `outline: 2px solid #800000; outline-offset: 2px` en `:focus-visible`.
- D-08: Eliminar las clases `focus-visible:outline-*` custom de ToggleSwitch — todos los componentes usan el ring global. Cero duplicacion.

**ESLint plugins (DOCS-02, A11Y)**
- D-09: `eslint-plugin-jsx-a11y` en modo recommended (preset por defecto). Suficiente para WCAG 2.1 Nivel A sin falsos positivos excesivos.
- D-10: `eslint-plugin-jsdoc` con solo la regla require-jsdoc (warn) en funciones exportadas. No validar formato interno de @param types. Cubre DOCS-01 sin ser ruidoso.

### Claude's Discretion
- ARIA mecanico en ProgressBar (`role="progressbar"`, `aria-valuenow/min/max`), AlertList (divs clickables a `<button>`), StatCard (`role="button"` condicional cuando tiene onClick), y SVGs decorativos (`aria-hidden="true"`) — implementacion obvia, Claude ejecuta sin consultar.
- JSDoc faltante en 4 pages (AttendancePage, DashboardPage, LoginPage, SavedPage) — Claude escribe las cabeceras siguiendo el patron existente del codebase.
- Orden de ejecucion de tareas dentro de la fase — Claude organiza segun dependencias naturales.

### Deferred Ideas (OUT OF SCOPE)
Ninguna — la discusion se mantuvo dentro del scope de la fase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| A11Y-01 | Usuario puede operar TeacherCard expandible con teclado (Tab, Enter/Space, Escape) | D-01..D-03; patron keyboard handler con `handleKeyDown` en `div[role="button"]` |
| A11Y-02 | Componentes interactivos tienen roles ARIA correctos (GroupTabs tablist, AlertList buttons, ProgressBar progressbar, StatCard button condicional) | D-04..D-06; patron WAI-ARIA Tabs; ARIA semantico mecanico para el resto |
| A11Y-03 | Elementos interactivos muestran focus-visible ring al navegar con teclado | D-07..D-08; `@layer base` en `src/index.css` con `:focus-visible` global |
| A11Y-04 | SVGs decorativos tienen aria-hidden y SearchInput tiene aria-label descriptivo | Auditoria detecta 4+ SVGs sin `aria-hidden`; SearchInput ya tiene `aria-label` en boton limpiar — falta en el `<input>` en si |
| DOCS-01 | Todos los componentes, hooks y pages tienen cabecera JSDoc con @param documentados | 4 pages sin JSDoc confirmadas; patron existente en `src/components/` bien establecido |
| DOCS-02 | eslint-plugin-jsdoc configurado y pasando en `npm run lint` | Plugin v62.9.0; flat config via objeto declarativo; regla `jsdoc/require-jsdoc` en `warn` |
</phase_requirements>

---

## Summary

Phase 4 implementa dos familias de cambios ortogonales: (1) accesibilidad WCAG 2.1 Nivel A sobre los componentes interactivos del codebase, y (2) documentacion JSDoc uniforme + enforcement por ESLint. Ambas familias son principalmente aditivas — se agregan atributos, handlers y comentarios sin reestructurar la logica existente.

La mayor complejidad tecnica esta en GroupTabs (WAI-ARIA Tabs completo con navegacion por flechas) y en la integracion de los dos ESLint plugins con ESLint 9 flat config. El resto de los cambios (TeacherCard keyboard, focus ring global, ARIA mecanico, JSDoc en pages) son aplicacion directa de patrones ya presentes en el codebase.

El codebase ya tiene infraestructura util: `useFocusTrap.js` (Phase 3) como referencia de patron keyboard, `Modal.jsx` con ARIA completo como referencia, y JSDoc en todos los componentes `ui/` y `features/` como plantilla para las pages.

**Primary recommendation:** Ejecutar en este orden: (1) focus ring global — base para verificar visualmente todos los cambios; (2) ESLint plugins — define los contratos de lint antes de escribir JSDoc; (3) JSDoc en pages; (4) ARIA mecanico (ProgressBar, StatCard, AlertList, SVGs, SearchInput); (5) GroupTabs WAI-ARIA Tabs; (6) TeacherCard keyboard.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| eslint-plugin-jsx-a11y | 6.10.2 | Reglas ESLint para accesibilidad JSX | Estandar de facto en ecosistema React para WCAG estatico |
| eslint-plugin-jsdoc | 62.9.0 | Reglas ESLint para JSDoc | Plugin oficial de referencia para enforcement de documentacion |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (ninguna nueva) | — | Los cambios ARIA y JSDoc no requieren runtime deps | — |

**Version verification (npm view, 2026-04-01):**
- `eslint-plugin-jsx-a11y`: 6.10.2 (confirmado)
- `eslint-plugin-jsdoc`: 62.9.0 (confirmado)

**Installation:**
```bash
npm install --save-dev eslint-plugin-jsx-a11y eslint-plugin-jsdoc
```

---

## Architecture Patterns

### Recommended Project Structure (sin cambios)
La estructura de `src/` no cambia. Los archivos modificados son aditivos (nuevos atributos, nuevos handlers, nuevas lineas JSDoc). Se agrega `@layer base` en `src/index.css`.

---

### Pattern 1: Keyboard Handler en `div[role="button"]` (TeacherCard)

**What:** Un `div` que actua como boton interactivo necesita `role="button"`, `tabIndex={0}`, y un `onKeyDown` que responda a Enter, Space y Escape.

**When to use:** Cuando un elemento no-boton debe ser operable desde teclado (WAI-ARIA: "keyboard interaction for button role").

**Resumen del estado actual de TeacherCard:** La cabecera es un `<div onClick={onToggle}>` sin atributos de teclado. Los cambios requeridos son:
- Agregar `role="button"` + `tabIndex={0}` al `<div>` de la cabecera
- Agregar `aria-expanded={isExpanded}` al mismo `<div>`
- Agregar `handleKeyDown` que dispara `onToggle` en Enter/Space y colapsa en Escape
- Agregar `aria-hidden="true"` al `<ChevronIcon>` SVG

**Example:**
```jsx
// Patron WAI-ARIA button role con teclado
const handleKeyDown = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    onToggle()
  } else if (e.key === 'Escape' && isExpanded) {
    e.preventDefault()
    onToggle()
  }
}

<div
  role="button"
  tabIndex={0}
  aria-expanded={isExpanded}
  onClick={onToggle}
  onKeyDown={handleKeyDown}
  className="..."
>
  ...
  <ChevronIcon rotated={isExpanded} />  {/* aria-hidden="true" va en el SVG dentro */}
</div>
```

**Nota critica:** D-02 dice que el contenido expandido NO es navegable por teclado. Los `<div onClick={...}>` de GroupSection y los estudiantes dentro de TeacherCard permanecen como divs. No se les agrega `tabIndex` ni `role`.

---

### Pattern 2: WAI-ARIA Tabs (GroupTabs)

**What:** Patron completo de `tablist/tab/tabpanel` con navegacion por flechas segun WAI-ARIA Authoring Practices Guide.

**Resumen del estado actual de GroupTabs:** Es un `<div>` con `<button>` elements. No tiene roles ARIA. Los cambios requeridos son:
- Contenedor: `role="tablist"` + `aria-label="Grupos"` en el `<div>` externo
- Cada boton: `role="tab"` + `aria-selected={selected === g}` + `tabIndex={selected === g ? 0 : -1}` + `id` para `aria-labelledby`
- El contenedor de alumnos en `AttendancePage` necesita `role="tabpanel"` + `aria-labelledby={activeTabId}`
- Handler `onKeyDown` en el contenedor tablist para Arrow Left/Right

**Example:**
```jsx
// GroupTabs con WAI-ARIA Tabs completo
export default function GroupTabs({ groups, selected, onChange }) {
  const handleKeyDown = (e) => {
    const currentIdx = groups.indexOf(selected)
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const next = groups[(currentIdx + 1) % groups.length]
      onChange(next)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const prev = groups[(currentIdx - 1 + groups.length) % groups.length]
      onChange(prev)
    }
  }

  return (
    <div role="tablist" aria-label="Grupos" onKeyDown={handleKeyDown} className="flex gap-1.5">
      {groups.map(g => (
        <button
          key={g}
          id={`tab-grupo-${g}`}
          role="tab"
          aria-selected={selected === g}
          tabIndex={selected === g ? 0 : -1}
          onClick={() => onChange(g)}
          className={...}
        >
          Grupo {g}
        </button>
      ))}
    </div>
  )
}
```

**Panel en AttendancePage:**
```jsx
<div
  role="tabpanel"
  aria-labelledby={`tab-grupo-${selectedGroup}`}
>
  {/* lista de alumnos */}
</div>
```

**Pitfall de foco:** Cuando la navegacion por flechas cambia el tab activo, el foco debe moverse al nuevo tab activo. Esto se logra con `useEffect` o `useRef` que llame `.focus()` sobre el elemento tab cuando `selected` cambia via teclado.

---

### Pattern 3: Focus Ring Global en `src/index.css`

**What:** Un `:focus-visible` global en `@layer base` de Tailwind que aplica a todos los elementos sin duplicar clases individuales.

**When to use:** Cuando multiples componentes necesitan el mismo anillo de foco y se quiere un unico punto de control.

**Resumen:** `src/index.css` actualmente solo tiene las tres directivas de Tailwind. El bloque a agregar:

```css
/* src/index.css — despues de @tailwind utilities */
@layer base {
  :focus-visible {
    outline: 2px solid #800000;
    outline-offset: 2px;
  }
}
```

**Nota:** D-07 especifica el hex `#800000` directamente. Aunque CLAUDE.md prohíbe hex hardcodeados en Tailwind classes, este es CSS puro dentro de `@layer base` — no una clase de Tailwind. Aceptable por ser el equivalente del token `burgundy`.

**Accion en ToggleSwitch.jsx (D-08):** Eliminar las clases `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy` de la cadena de clases. El global las reemplaza con comportamiento identico.

---

### Pattern 4: ARIA Mecanico en Componentes UI

**ProgressBar:** Agregar `role="progressbar"` + `aria-valuenow={value}` + `aria-valuemin={0}` + `aria-valuemax={100}` al `<div>` contenedor exterior.

```jsx
<div
  role="progressbar"
  aria-valuenow={Math.min(100, Math.max(0, value))}
  aria-valuemin={0}
  aria-valuemax={100}
  className={...}
>
```

**StatCard:** Agregar `role="button"` + `tabIndex={0}` condicionalmente solo cuando `onClick` esta definido. StatCard usa `React.memo` — los atributos ARIA son props del `<div>` raiz.

```jsx
<div
  className={containerClasses}
  onClick={onClick}
  role={onClick ? 'button' : undefined}
  tabIndex={onClick ? 0 : undefined}
>
```

**AlertList:** Los `<div onClick>` de cada alumno deben convertirse a `<button>`. Cambio de `<div onClick={...} className="...">` a `<button onClick={...} className="...">`. Verificar que las clases Tailwind resultantes sigan siendo validas en `<button>`.

**SearchInput:** El `<input type="text">` no tiene `aria-label`. Agregar `aria-label` prop al componente y pasarla al `<input>`. El boton "limpiar" ya tiene `aria-label="Limpiar busqueda"` — correcto.

```jsx
// SearchInput: nueva prop ariaLabel
export default function SearchInput({ ..., ariaLabel = 'Buscar' }) {
  return (
    ...
    <input aria-label={ariaLabel} ... />
```

**SVGs decorativos:** Agregar `aria-hidden="true"` a los SVGs en:
- `Button.jsx`: spinner SVG dentro del `<button>` (decorativo cuando el boton ya tiene texto)
- `SearchInput.jsx`: icono lupa
- `PageHeader.jsx`: icono de logout (el boton tiene `aria-label`, el SVG es decorativo)
- `LoginPage.jsx`: cualquier SVG decorativo presente
- `ChevronIcon` en `TeacherCard.jsx` (ya cubierto en D-03)

---

### Pattern 5: ESLint Flat Config con jsx-a11y y jsdoc

**Estado actual de `eslint.config.js`:** ESLint 9 flat config con `defineConfig`, `globalIgnores`, y `@eslint/js` + `react-hooks` + `react-refresh`.

**eslint-plugin-jsx-a11y** expone `flatConfigs.recommended` para ESLint 9. Se integra como un objeto adicional en el array:

```javascript
// eslint.config.js (version final)
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import jsdoc from 'eslint-plugin-jsdoc'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'apps-script']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      jsdoc,
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'jsdoc/require-jsdoc': ['warn', {
        require: {
          FunctionDeclaration: true,
          ArrowFunctionExpression: false,
          FunctionExpression: false,
        },
        publicOnly: true,
      }],
    },
  },
])
```

**Critico — `publicOnly: true`:** Con esta opcion, `require-jsdoc` solo exige JSDoc en funciones exportadas. Los componentes helpers privados (como `GroupSection`, `ChevronIcon` en `TeacherCard.jsx`) quedan exentos. Alineado con D-10.

**Critico — `jsxA11y.flatConfigs.recommended` vs objeto manual:** Usar `flatConfigs.recommended` es el metodo documentado para ESLint 9. Agrega automaticamente el plugin y sus reglas recommended en un solo paso. Confianza HIGH (verificado en documentacion oficial del repo).

---

### Anti-Patterns to Avoid

- **`onKeyDown` en el contenedor tablist sin `e.preventDefault()`:** Las flechas del teclado hacen scroll de pagina por defecto. `e.preventDefault()` es obligatorio en Arrow Left/Right dentro del handler de tabs.
- **Agregar `role="tab"` sin gestionar `tabIndex`:** El patron WAI-ARIA Tabs requiere que SOLO el tab activo tenga `tabIndex={0}`. Los demas deben tener `tabIndex={-1}`. Sin esto, Tab navega por todos los tabs en vez de salir del grupo.
- **`role="button"` sin `onKeyDown`:** Agregar solo el rol sin el handler de teclado viola WCAG 2.1 SC 2.1.1.
- **Usar `jsxA11y.configs.recommended` (legacy) en vez de `jsxA11y.flatConfigs.recommended`:** La API legacy usa `plugins` y `rules` separados para ESLint 8. En ESLint 9 flat config, usar siempre `flatConfigs`.
- **`jsdoc/require-jsdoc` sin `publicOnly: true`:** Sin este flag, la regla exige JSDoc en funciones helpers privadas (como `GroupSection`, `LoginInput`), generando ~30+ warnings en archivos que no son responsabilidad de esta fase.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Navegacion por flechas en tabs | Loop custom con indices | Patron WAI-ARIA Tabs con `ArrowLeft`/`ArrowRight` + `tabIndex` management | El patron es estandar y bien documentado |
| Focus ring visual | CSS custom complejo | `@layer base { :focus-visible { ... } }` en `src/index.css` | Un solo punto de control; Tailwind `@layer base` es el mecanismo correcto |
| A11Y linting | Reglas manuales de revision | `eslint-plugin-jsx-a11y` recommended | 30+ reglas WCAG cubiertas automaticamente |
| JSDoc enforcement | Revision manual de PRs | `eslint-plugin-jsdoc` `require-jsdoc` | Fallo en `npm run lint` antes del commit |

**Key insight:** Todos los problemas de A11Y en esta fase son atributos HTML estandarizados por WAI-ARIA. No se necesitan librerias de terceros para implementarlos.

---

## Common Pitfalls

### Pitfall 1: GroupTabs — Foco no sigue la navegacion por flechas

**What goes wrong:** La navegacion con Arrow Left/Right actualiza `selected` via `onChange` pero el foco del navegador queda en el tab anterior. El screen reader anuncia el tab correcto pero visualmente el foco ring se ve en el lugar equivocado.

**Why it happens:** `onChange` actualiza estado de React (re-render) pero no llama `.focus()` en el nuevo elemento DOM.

**How to avoid:** Usar `useRef` con un objeto de refs keyed por grupo, y llamar `.focus()` en el handler de teclado inmediatamente despues de `onChange(next)`. Alternativa: `useEffect` que dispara `.focus()` cuando `selected` cambia si el cambio provino de teclado (flag via `useRef`).

**Warning signs:** El ring visual no se mueve al navegar con flechas aunque `aria-selected` cambie correctamente.

---

### Pitfall 2: jsx-a11y — Reglas que generan falsos positivos en el codebase

**What goes wrong:** Algunas reglas del preset `recommended` de jsx-a11y pueden marcar como error patrones validos del codebase (ej: `interactive-supports-focus` en elementos con `onClick` que ya son focusables).

**Why it happens:** El preset recommended incluye ~30 reglas. Algunas asumen contextos especificos.

**How to avoid:** Despues de instalar y ejecutar `npm run lint`, revisar cada nuevo error antes de corregirlo. Si un error es un falso positivo documentado, desactivar esa regla especifica en `eslint.config.js` en vez de suprimir con `eslint-disable`. Reglas con mayor probabilidad de conflicto en este codebase:
- `jsx-a11y/click-events-have-key-events`: Disparara en los `<div onClick>` existentes (TeacherCard GroupSection, StudentRow). Estos se corrigen en la fase segun scope.
- `jsx-a11y/no-static-element-interactions`: Mismo patron.
- `jsx-a11y/img-redundant-alt`: Logo en PageHeader tiene `alt="logo"` — puede requerir cambiar a texto mas descriptivo.

**Warning signs:** `npm run lint` falla con >20 errores nuevos tras instalar jsx-a11y.

---

### Pitfall 3: jsdoc/require-jsdoc — Exige JSDoc en funciones de arrow exportadas

**What goes wrong:** La regla con `ArrowFunctionExpression: true` marcaria como error todos los arrow functions exportados, incluyendo hooks que retornan objetos.

**Why it happens:** Los hooks custom (`useStudents`, `useConvocatorias`, etc.) usan `export default function` — correcto. Pero si algun archivo usa `export const fn = () => {}`, se generaria un warning.

**How to avoid:** Configurar `ArrowFunctionExpression: false` en la regla (ver codigo en Pattern 5). El codebase usa consistentemente `export default function` en todos los componentes y hooks — los arrow function exports son raros.

**Warning signs:** Warnings de jsdoc en archivos que ya tienen JSDoc en su cabecera (indicaria que la regla esta afectando sub-funciones no documentadas).

---

### Pitfall 4: TeacherCard — `GroupSection` como div clickable queda fuera del scope

**What goes wrong:** jsx-a11y marcara `GroupSection` y los divs de estudiantes en TeacherCard como errores (`click-events-have-key-events`), pero D-02 dice que ese contenido NO debe ser navegable por teclado.

**Why it happens:** D-02 es una decision de diseno de UX — el contenido expandido es puramente informativo para el CEO.

**How to avoid:** Para GroupSection y los divs de alumno dentro de TeacherCard: desactivar la regla especifica con un comentario `eslint-disable-next-line` o configurar una override en `eslint.config.js` para ese archivo. Documentar el motivo.

**Warning signs:** `npm run lint` falla en `TeacherCard.jsx` con errores de `click-events-have-key-events` en los divs internos.

---

### Pitfall 5: `@layer base` y especificidad CSS con Tailwind

**What goes wrong:** El `@layer base` en Tailwind tiene la especificidad mas baja. Un componente con `outline-none` en sus clases puede sobreescribir el global.

**Why it happens:** `outline-none` es una clase de Tailwind que establece `outline: 2px solid transparent` o `outline: none`, sobreescribiendo el `@layer base`.

**How to avoid:** Buscar `outline-none` en el codebase y verificar que no esta en elementos interactivos que deban mostrar el ring. En el codebase actual: `SearchInput` tiene `outline-none` en su `<input>` — este input no es el problema (el `<input>` no es el foco que se quiere ringear, sino el contenedor). Verificar con inspeccion visual.

**Warning signs:** Despues de agregar el `@layer base`, algunos botones o inputs no muestran el ring al tabular.

---

## Code Examples

### JSDoc pattern en pages (DOCS-01)

Patron establecido en el codebase para pages orquestadoras:

```jsx
/**
 * Pagina de marcado de asistencia para profesores.
 * Carga alumnos del grupo seleccionado, permite marcar presentes/ausentes y guardar.
 * @returns {JSX.Element}
 */
export default function AttendancePage() {
```

```jsx
/**
 * Dashboard analitico para el CEO.
 * Muestra estadisticas globales, listado de profesores y busqueda de alumnos.
 * @returns {JSX.Element}
 */
export default function DashboardPage() {
```

```jsx
/**
 * Pagina de autenticacion. Valida credenciales y redirige segun rol.
 * @returns {JSX.Element}
 */
export default function LoginPage() {
```

```jsx
/**
 * Pagina de confirmacion post-guardado de asistencia.
 * Muestra resumen de presentes/ausentes y boton de retorno.
 * @returns {JSX.Element}
 */
export default function SavedPage() {
```

---

### aria-hidden en SVG decorativo (referencia: LoadingSpinner pattern)

```jsx
// Patron ya establecido en LoadingSpinner.jsx
<svg aria-hidden="true" ...>
  ...
</svg>
```

---

### ProgressBar con role="progressbar"

```jsx
<div
  role="progressbar"
  aria-valuenow={Math.min(100, Math.max(0, value))}
  aria-valuemin={0}
  aria-valuemax={100}
  className={`${heights[size] || heights.sm} bg-border-light rounded-full overflow-hidden ${className}`}
>
  <div
    className={`h-full ${barBg} transition-[width] duration-[450ms] ease-out rounded-full`}
    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
  />
</div>
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install | Si | v24.14.0 | — |
| npm | Instalar plugins | Si | 11.9.0 | — |
| eslint-plugin-jsx-a11y | DOCS-02 / A11Y | No (a instalar) | 6.10.2 | — |
| eslint-plugin-jsdoc | DOCS-02 | No (a instalar) | 62.9.0 | — |

**Missing dependencies con fallback:** Ninguna.
**Missing dependencies blocking:** `eslint-plugin-jsx-a11y` y `eslint-plugin-jsdoc` deben instalarse con `npm install --save-dev` antes de modificar `eslint.config.js`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `vite.config.js` (seccion `test`) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| A11Y-01 | TeacherCard responde a Enter/Space/Escape | unit | `npm test -- --reporter verbose` | ❌ Wave 0 |
| A11Y-02 | GroupTabs tiene role=tablist/tab y aria-selected | unit | `npm test -- --reporter verbose` | ❌ Wave 0 |
| A11Y-02 | ProgressBar tiene role=progressbar + aria-value* | unit | `npm test -- --reporter verbose` | ❌ Wave 0 |
| A11Y-03 | Focus ring visible al navegar — visual, no automatizable | manual-only | Inspeccion visual en navegador | — |
| A11Y-04 | SVGs tienen aria-hidden, SearchInput tiene aria-label | unit | `npm test -- --reporter verbose` | ❌ Wave 0 |
| DOCS-01 | JSDoc presente en todas las pages | lint | `npm run lint` | — |
| DOCS-02 | npm run lint pasa con jsx-a11y y jsdoc activos | lint | `npm run lint` | — |

**Nota sobre A11Y-03:** El focus ring es un efecto CSS (`:focus-visible`). No es testeable con Testing Library de forma significativa — la verificacion es visual en el navegador con navegacion por Tab.

### Sampling Rate
- **Per task commit:** `npm run lint`
- **Per wave merge:** `npm test && npm run lint`
- **Phase gate:** `npm test && npm run lint` full suite green antes de `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/tests/TeacherCard.test.jsx` — cubre A11Y-01 (keyboard) y ARIA attrs
- [ ] `src/tests/GroupTabs.test.jsx` — cubre A11Y-02 (tablist/tab/aria-selected, arrow keys)
- [ ] `src/tests/ProgressBar.test.jsx` — cubre A11Y-02 (role=progressbar, aria-value*)
- [ ] `src/tests/A11Y-SVGs.test.jsx` — cubre A11Y-04 (aria-hidden en SVGs de Button, SearchInput, PageHeader)

**Nota:** Los tests de ARIA en `TeacherCard` y `GroupTabs` son requisito de REQUIREMENTS.md TEST-03 (Phase 5). Phase 4 crea los stubs RED ahora para que Phase 5 los complete con `jest-axe`. Si el planner lo determina, estos tests pueden ser stubs RED (al estilo Phase 3) en lugar de tests completos en Phase 4.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `eslint-plugin-jsx-a11y` legacy config (`plugins: { 'jsx-a11y': ... }`) | `jsxA11y.flatConfigs.recommended` | ESLint 9 (2024) | Config mas simple, sin objeto manual de rules |
| `require-jsdoc` built-in ESLint rule | `jsdoc/require-jsdoc` via `eslint-plugin-jsdoc` | ESLint v9 (regla built-in removida) | La regla built-in fue deprecada en ESLint v5.10.0 y removida en v9 |
| `aria-controls` en tabs | omitido con renderizado condicional `&&` | Decision Phase 3 (D del CONTEXT) | `aria-expanded` solo es suficiente para WCAG 2.1 con renderizado condicional |

**Deprecated/outdated:**
- `require-jsdoc` built-in de ESLint: removida en ESLint v9. No usar. Usar `jsdoc/require-jsdoc` del plugin.
- `jsxA11y.configs.recommended` (legacy): para ESLint 8. En ESLint 9 flat config usar `jsxA11y.flatConfigs.recommended`.

---

## Open Questions

1. **jsx-a11y falsos positivos en divs clickables de GroupSection/estudiantes en TeacherCard**
   - What we know: D-02 los excluye del scope de teclado; jsx-a11y `recommended` incluye `click-events-have-key-events`
   - What's unclear: Si la regla generara errores de lint que bloqueen el build o solo warnings
   - Recommendation: Ejecutar `npm run lint` tras instalar jsx-a11y (antes de otros cambios) para inventariar el impacto real. Si hay errores, configurar overrides especificos en `eslint.config.js` para esos patrones.

2. **`role="tabpanel"` y `aria-labelledby` — ubicacion en AttendancePage**
   - What we know: D-06 requiere que el contenedor de alumnos tenga `role="tabpanel"` + `aria-labelledby`; GroupTabs es un componente hijo de AttendancePage
   - What's unclear: El `<div role="tabpanel">` debe estar en `AttendancePage.jsx` (donde se renderiza la lista de alumnos), no en `GroupTabs.jsx`. El planner debe asignar esa tarea a `AttendancePage.jsx` ademas de `GroupTabs.jsx`.
   - Recommendation: Tratar como dos archivos afectados para A11Y-02: `GroupTabs.jsx` (tablist/tab) y `AttendancePage.jsx` (tabpanel wrapper).

---

## Project Constraints (from CLAUDE.md)

| Directiva | Impacto en Phase 4 |
|-----------|-------------------|
| Cero inline styles (`style={{...}}`) | No aplica — ninguna solucion A11Y requiere inline styles |
| Max 250 lineas por archivo | `TeacherCard.jsx` (143 lineas) y `GroupTabs.jsx` (30 lineas) quedan muy por debajo tras los cambios |
| Tokens Tailwind, no hex hardcodeados | El hex `#800000` en `@layer base` de `src/index.css` es CSS puro, no clase Tailwind — aceptable como excepcion documentada |
| UI/comentarios en espanol, codigo en ingles | Handlers se llaman `handleKeyDown`, `handleTabKeyDown`; mensajes de error en espanol |
| `npm run lint` con 0 errores antes de entrega | Los nuevos plugins pueden generar warnings/errores; se deben resolver en la misma tarea |
| JSDoc obligatorio en cabecera de componentes nuevos | Phase 4 agrega JSDoc a los 4 existentes sin el; no crea componentes nuevos |
| Commits en Conventional Commits espanol | Commits seran: `feat: accesibilidad teclado TeacherCard`, `feat: WAI-ARIA tabs GroupTabs`, etc. |

---

## Sources

### Primary (HIGH confidence)
- `docs/auditoria/06-score-calidad.md` — Inventario de gaps ARIA del codebase (accesibilidad 5.0/10)
- `.planning/phases/04-documentacion-y-accesibilidad/04-CONTEXT.md` — Decisiones bloqueadas D-01 a D-10
- `.planning/codebase/CONVENTIONS.md` — Patron JSDoc establecido en el codebase
- `src/hooks/useFocusTrap.js` — Patron keyboard handler ya implementado (referencia)
- `src/components/ui/Modal.jsx` / `src/hooks/useFocusTrap.js` — Patron ARIA dialog + focus trap (Phase 3)
- WAI-ARIA Authoring Practices Guide: Tabs Pattern (roles tablist/tab/tabpanel, arrow key navigation)

### Secondary (MEDIUM confidence)
- npm registry (2026-04-01): `eslint-plugin-jsx-a11y@6.10.2`, `eslint-plugin-jsdoc@62.9.0` — versiones confirmadas
- WebSearch + github.com/jsx-eslint/eslint-plugin-jsx-a11y: `flatConfigs.recommended` es el API para ESLint 9 flat config
- WebSearch + WebFetch github.com/gajus/eslint-plugin-jsdoc: objeto declarativo con `plugins: { jsdoc }` + regla `jsdoc/require-jsdoc` funciona en ESLint 9

### Tertiary (LOW confidence)
- Ninguna — todos los claims criticos verificados con fuentes primarias o secundarias.

---

## Metadata

**Confidence breakdown:**
- Standard stack (plugins + versiones): HIGH — verificado via npm registry
- Architecture patterns (ARIA, keyboard, CSS): HIGH — WAI-ARIA APG + codigo existente del codebase
- ESLint flat config syntax: MEDIUM — verificado en documentacion del repo + WebSearch, sin ejecutar localmente
- Pitfalls: HIGH — derivados directamente del analisis del codigo fuente actual

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (ESLint plugin versions pueden cambiar; ARIA specs son estables)
