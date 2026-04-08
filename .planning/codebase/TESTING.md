# Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: inline in `vite.config.js` under `test` key
- Environment: `jsdom` (via `jsdom` 28.1.0)
- Globals: `true` (describe/it/expect available without import, but tests explicitly import from `vitest` anyway)

**Assertion Library:**
- Vitest built-in `expect`
- `@testing-library/jest-dom` 6.9.1 for DOM matchers (`.toBeInTheDocument()`, etc.)
- Setup file: `src/tests/setup.js` (single line: `import '@testing-library/jest-dom'`)

**Rendering:**
- `@testing-library/react` 16.3.2
- `@testing-library/user-event` 14.6.1

**Run Commands:**
```bash
npm test              # Run all tests once (vitest run)
npm run test:watch    # Watch mode (vitest)
```

## Test File Organization

**Location:** Centralized in `src/tests/` directory (not co-located with source files).

**Naming:** `{ComponentName}.test.jsx` -- matches the source component name exactly.

**Current test files (8 suites, 55 tests):**
- `src/tests/Button.test.jsx` (6 tests) - UI component
- `src/tests/Badge.test.jsx` (5 tests) - UI component
- `src/tests/StatCard.test.jsx` (4 tests) - UI component
- `src/tests/StudentRow.test.jsx` (8 tests) - Feature component
- `src/tests/ProtectedRoute.test.jsx` (4 tests) - Route guard
- `src/tests/LoginPage.test.jsx` (9 tests) - Page with async logic
- `src/tests/ConvocatoriaPage.test.jsx` (7 tests) - Page with navigation
- `src/tests/api.test.jsx` (12 tests) - Service layer

## Test Structure

**Suite Organization:**
```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ComponentName from '../components/ui/ComponentName'

describe('ComponentName', () => {
  it('descripcion en espanol del comportamiento', () => {
    render(<ComponentName prop="value" />)
    expect(screen.getByText('texto')).toBeInTheDocument()
  })
})
```

**Test descriptions:** Written in Spanish, describing behavior: `'renderiza el texto'`, `'ejecuta onClick al hacer click'`, `'redirige a login si no hay sesion'`.

**Setup/teardown:**
- `beforeEach` used for clearing state (`sessionStorage.clear()`, `mockNavigate.mockClear()`, `vi.clearAllMocks()`)
- `afterEach` used in API tests for `vi.restoreAllMocks()`
- No shared fixtures or factory files

**User interaction pattern:**
```jsx
// Pattern 1: inline setup
await userEvent.click(screen.getByRole('button'))

// Pattern 2: explicit setup (used in some tests)
const user = userEvent.setup()
await user.click(screen.getByText('Ana Garcia'))
```

## Mocking

**Framework:** Vitest `vi.mock()` and `vi.fn()`

**Module mocking (react-router-dom):**
```jsx
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})
```

**Service mocking (API layer):**
```jsx
vi.mock('../services/api', () => ({
  getConvocatorias: vi.fn(),
}))
// Then in tests:
getConvocatorias.mockResolvedValue([{ id: 'conv-1', nombre: 'Test' }])
```

**Config mocking:**
```jsx
vi.mock('../config/api', () => ({
  API_URL: 'https://script.google.com/test',
  isApiEnabled: vi.fn(() => true),
}))
```

**Global fetch mocking (API service tests):**
```jsx
beforeEach(() => {
  global.fetch = vi.fn()
})
// In test:
global.fetch.mockResolvedValue({
  json: () => Promise.resolve({ status: 'ok', data: mockData }),
})
```

**What to mock:**
- `useNavigate` from react-router-dom (to verify navigation calls)
- `useLocation` when page reads `location.state`
- API service functions when testing pages
- `global.fetch` when testing the API service itself
- `isApiEnabled` config function to toggle API on/off

**What NOT to mock:**
- UI components (render real Button, Badge, Avatar etc.)
- `sessionStorage` (use the real jsdom implementation, clear in beforeEach)
- React hooks (test through component rendering)

## Router Testing

**Pattern for route-dependent components:**
```jsx
import { MemoryRouter, Routes, Route } from 'react-router-dom'

function renderWithRouter(allowedRole) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/" element={<div>Login</div>} />
        <Route path="/protected" element={
          <ProtectedRoute allowedRole={allowedRole}>
            <div>Contenido protegido</div>
          </ProtectedRoute>
        } />
      </Routes>
    </MemoryRouter>
  )
}
```

**Pattern for pages with useNavigate (mocked):**
```jsx
function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}
```

## Async Testing

**Pattern with waitFor:**
```jsx
import { waitFor } from '@testing-library/react'

it('navega tras API call', async () => {
  getConvocatorias.mockResolvedValue([mockConv])
  renderLogin()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /iniciar sesion/i }))

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith('/attendance', {
      state: { convocatoria: mockConv },
    })
  })
})
```

**Error testing:**
```jsx
it('muestra error si API falla', async () => {
  getConvocatorias.mockRejectedValue(new Error('Network error'))
  renderLogin()
  // ...trigger action...
  await waitFor(() => {
    expect(screen.getByText('Error al conectar con el servidor. Reintenta.')).toBeInTheDocument()
  })
})
```

## Assertion Patterns

**DOM presence:**
```jsx
expect(screen.getByText('Guardar')).toBeInTheDocument()
expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
```

**CSS class checking:**
```jsx
expect(screen.getByText('Test').className).toContain('bg-gold')
expect(container.firstChild.className).toContain('bg-burgundy-soft')
```

**Click handler verification:**
```jsx
const handleClick = vi.fn()
render(<Button onClick={handleClick}>Click</Button>)
await userEvent.click(screen.getByRole('button'))
expect(handleClick).toHaveBeenCalledOnce()
```

**Navigation verification:**
```jsx
expect(mockNavigate).toHaveBeenCalledWith('/attendance', {
  state: { convocatoria: mockConv },
})
```

## Coverage

**Requirements:** None enforced. No coverage threshold configured.

**No coverage script defined** in `package.json`. To run coverage manually:
```bash
npx vitest run --coverage
```
Note: a coverage provider (`@vitest/coverage-v8` or `@vitest/coverage-istanbul`) would need to be installed first.

## Test Types

**Unit Tests (UI components):**
- Test rendering, props, variants, CSS classes, click handlers
- Files: `Button.test.jsx`, `Badge.test.jsx`, `StatCard.test.jsx`, `StudentRow.test.jsx`

**Integration Tests (pages):**
- Test full page behavior with mocked dependencies
- Include user flows (type credentials, click login, verify navigation)
- Files: `LoginPage.test.jsx`, `ConvocatoriaPage.test.jsx`

**Service Tests (API layer):**
- Test URL construction, request/response handling, error paths
- Mock `global.fetch` directly
- File: `api.test.jsx`

**Infrastructure Tests (route guards):**
- Test session validation and role-based access
- File: `ProtectedRoute.test.jsx`

**E2E Tests:** Not configured. No Playwright/Cypress setup.

## Test Coverage Gaps

**Untested UI components (4 files):**
- `src/components/ui/Avatar.jsx` - No dedicated test
- `src/components/ui/Modal.jsx` - No dedicated test
- `src/components/ui/ProgressBar.jsx` - No dedicated test
- `src/components/ui/SearchInput.jsx` - No dedicated test
- `src/components/ui/ToggleSwitch.jsx` - No dedicated test

**Untested feature components (5 files):**
- `src/components/features/AlertList.jsx` - No test
- `src/components/features/ConvocatoriaSelector.jsx` - No test
- `src/components/features/GroupTabs.jsx` - No test
- `src/components/features/PageHeader.jsx` - No test
- `src/components/features/StudentDetailPopup.jsx` - No test
- `src/components/features/TeacherCard.jsx` - No test

**Untested pages (3 files):**
- `src/pages/AttendancePage.jsx` - No test (complex page with hooks)
- `src/pages/DashboardPage.jsx` - No test (CEO analytics view)
- `src/pages/SavedPage.jsx` - No test

**Untested infrastructure:**
- `src/components/MobileContainer.jsx` - No test
- `src/components/ErrorBoundary.jsx` - No test
- `src/hooks/useConvocatorias.js` - No test
- `src/hooks/useStudents.js` - No test
- `src/App.jsx` - No test (routing integration)

**Priority gaps:**
- **High:** `useStudents.js` hook (complex caching/prefetch logic, core to attendance flow)
- **High:** `AttendancePage.jsx` (main teacher workflow)
- **Medium:** `DashboardPage.jsx` (CEO view, API-connected)
- **Medium:** `ErrorBoundary.jsx` (error recovery path)
- **Low:** Simple UI components (Avatar, ProgressBar, ToggleSwitch)

## Adding New Tests

**Where to place:** `src/tests/{ComponentName}.test.jsx`

**Boilerplate for a UI component test:**
```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ComponentName from '../components/ui/ComponentName'

describe('ComponentName', () => {
  it('renderiza correctamente con props por defecto', () => {
    render(<ComponentName requiredProp="value" />)
    expect(screen.getByText('value')).toBeInTheDocument()
  })
})
```

**Boilerplate for a page test with mocked navigation:**
```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import PageName from '../pages/PageName'

function renderPage() {
  return render(
    <MemoryRouter>
      <PageName />
    </MemoryRouter>
  )
}

describe('PageName', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockNavigate.mockClear()
  })

  it('renderiza correctamente', () => {
    renderPage()
    expect(screen.getByText('titulo')).toBeInTheDocument()
  })
})
```

---

*Testing analysis: 2026-03-30*
