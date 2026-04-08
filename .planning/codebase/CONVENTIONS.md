# Coding Conventions

**Analysis Date:** 2026-03-30

## Naming Patterns

**Files:**
- PascalCase for React components: `LoginPage.jsx`, `StudentRow.jsx`, `Button.jsx`
- camelCase for non-component JS modules: `api.js`, `users.js`
- camelCase prefixed with `use` for hooks: `useConvocatorias.js`, `useStudents.js`
- Test files mirror component name with `.test.jsx` suffix: `Button.test.jsx`

**Components:**
- PascalCase, named exports via `export default function ComponentName()`: every component uses this pattern
- Private/helper components defined as plain functions in the same file (e.g., `LoginInput` in `src/pages/LoginPage.jsx`)

**Functions:**
- camelCase for all functions: `handleLogin`, `toggleStudent`, `loadStudents`
- Event handlers prefixed with `handle` in components: `handleClick`, `handleLogin`, `handleGroupChange`
- Callbacks prefixed with `on` in props: `onClick`, `onToggle`, `onLogout`

**Variables:**
- camelCase for all variables: `loadingStudents`, `selectedGroup`, `presentCount`
- UPPER_SNAKE_CASE for module-level constants: `GROUPS`, `MOCK_GROUPS`, `USERS`

**Types/Props:**
- No TypeScript. Props documented via JSDoc `@param` tags in component headers.

## Code Style

**Formatting:**
- No Prettier config detected. Formatting is manual/editor-based.
- 2-space indentation observed throughout.
- Single quotes for strings.
- No trailing semicolons inconsistency -- semicolons are NOT used (implicit ASI).
- Wait: semicolons ARE used consistently. Correction after re-checking files: no semicolons at end of import lines in some files, but generally inconsistent. Actually re-checking: imports do NOT have semicolons in `api.js` lines but DO in test files. The codebase is inconsistent on semicolons -- no enforced rule.

**Linting:**
- ESLint 9 with flat config: `eslint.config.js`
- Plugins: `eslint-plugin-react-hooks` (flat recommended), `eslint-plugin-react-refresh` (vite config)
- Custom rules: `no-unused-vars` set to error with `varsIgnorePattern: '^[A-Z_]'` (allows unused PascalCase/CONSTANT imports)
- Run with: `npm run lint`

## Language Policy

- **UI text, comments, commit messages:** Spanish
- **Code identifiers (variables, functions, components):** English
- Example: component named `StudentRow`, prop named `isPresent`, but label text reads `"Presentes"`

## Import Organization

**Order (observed pattern):**
1. React/framework imports (`react`, `react-router-dom`)
2. Internal config/services (`../config/api`, `../services/api`)
3. Component imports (`../components/ui/Button.jsx`)

**Path style:**
- Relative paths only (`../`, `./`). No path aliases configured.
- `.jsx` extension included in component imports: `import Button from '../components/ui/Button.jsx'`
- `.js` extension omitted for non-component modules: `import { API_URL } from '../config/api'`

**No barrel files:** Each component is imported directly by path. No `index.js` re-exports.

## Component Patterns

**All functional components.** No class components except `src/components/ErrorBoundary.jsx` (React requirement).

**Default exports:** Every component uses `export default function Name()`. Named exports used only for constants (`export { GROUPS }` in `src/hooks/useStudents.js`).

**Props destructuring:** Always destructured in function signature with defaults:
```jsx
export default function Button({
  variant = 'primary',
  loading = false,
  fullWidth = false,
  children,
  onClick,
  className = '',
  ...rest
}) {
```

**Variant pattern:** Components use a `variant` prop with a map of Tailwind class strings:
```jsx
const variants = {
  primary: 'bg-burgundy text-white shadow-lg',
  ghost: 'bg-transparent border border-gold/25 text-white/80',
  disabled: 'bg-[#CCCCCC] text-white cursor-not-allowed',
}
```

**Class composition:** Array of strings joined with `.join(' ')` or `.filter(Boolean).join(' ')`:
```jsx
const classes = [
  ...base,
  variants[variant] || variants.primary,
  fullWidth ? 'w-full' : '',
  className,
].filter(Boolean).join(' ')
```

**Hooks usage:**
- `useState`, `useEffect`, `useCallback`, `useRef` from React
- `useNavigate`, `useLocation` from react-router-dom
- Custom hooks in `src/hooks/`: `useConvocatorias`, `useStudents`

## Styling Approach

**Tailwind CSS 3 exclusively.** No CSS Modules, no styled-components.

**Zero inline styles rule:** `style={{}}` is prohibited. Only 3 documented exceptions exist for dynamic values (e.g., `animationDelay` in `StudentRow`).

**Design tokens:** All colors and fonts configured in `tailwind.config.js` under `extend`. Use token classes directly:
- Colors: `bg-burgundy`, `text-gold`, `text-error`, `bg-dark-bg`, `border-border-light`
- Fonts: `font-cinzel` (headings), `font-montserrat` (body)
- Status colors: `text-success` (>=80%), `text-warning` (60-79%), `text-error` (<60%)

**No hardcoded hex values.** Use Tailwind tokens. Exception: `bg-[#CCCCCC]` in Button disabled variant (should use a token).

**Custom animations:** Defined in `src/styles/animations.css` as CSS `@keyframes`. Do NOT add keyframes to `tailwind.config.js`.

**Mobile-first:** Max width 430px, enforced by `MobileContainer` wrapper.

## Error Handling

**Patterns:**
- `try/catch` in async functions with user-facing error messages in Spanish
- Error state managed via `useState`: `const [error, setError] = useState(null)`
- API errors thrown as `new Error(json.error || 'Error desconocido de la API')` in `src/services/api.js`
- Cleanup pattern with `cancelled` flag in `useEffect` to prevent state updates after unmount:
```jsx
useEffect(() => {
  let cancelled = false
  const init = async () => {
    // ...fetch data...
    if (cancelled) return
    setState(data)
  }
  init()
  return () => { cancelled = true }
}, [])
```

## Comments & Documentation

**JSDoc headers:** Required on all new components. Every component in `src/components/ui/` and `src/components/features/` has a JSDoc block documenting props:
```jsx
/**
 * Boton reutilizable con variantes de estilo.
 * @param {object} props
 * @param {'primary'|'ghost'|'disabled'} [props.variant='primary'] - Estilo visual
 * @param {boolean} [props.loading=false] - Muestra spinner y deshabilita
 */
```

**Inline comments:** In Spanish, used sparingly for section labels (`{/* Avatar */}`, `{/* Formulario */}`) and logic explanations.

**Section separators:** Used in service files with `// ====` lines:
```js
// ============================================================
// Endpoints de lectura
// ============================================================
```

**Hook return types:** Custom hooks document return shape in JSDoc `@returns`:
```jsx
/**
 * @returns {{
 *   convocatorias: Array,
 *   selectedConvocatoria: Object|null,
 *   loading: boolean,
 *   error: string|null,
 *   reload: () => Promise<void>
 * }}
 */
```

## Commit Conventions

**Format:** Conventional Commits in Spanish
- `feat:` for new features
- `fix:` for bug fixes
- `refactor:` for restructuring
- `docs:` for documentation
- `chore:` for maintenance

**Examples from history:**
- `feat: actualizarEstadisticasGrupo -- stats auto tras guardar asistencia`
- `refactor: auditoria baseline-ui -- 15 correcciones de diseno en 18 archivos`
- `docs: fase 13 -- CacheService en Apps Script + deploy Vercel + E2E`

## Module Design

**Exports:** One default export per component file. Named exports only for utility constants.

**Barrel files:** Not used. Import directly from file path.

**Service layer:** `src/services/api.js` exports individual named async functions, one per API endpoint. Internal helpers (`apiGet`, `apiPost`) are not exported.

**Config layer:** `src/config/api.js` exports `API_URL` constant and `isApiEnabled` function. `src/config/users.js` exports `USERS` array.

---

*Convention analysis: 2026-03-30*
