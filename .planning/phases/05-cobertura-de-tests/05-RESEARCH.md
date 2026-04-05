# Phase 5: Cobertura de Tests - Research

**Researched:** 2026-04-05
**Domain:** Vitest coverage (V8 provider), Testing Library ARIA assertions, unit testing React hooks
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Usar aserciones manuales para verificar contratos ARIA de Phase 4: `getByRole`, `toHaveAttribute('aria-expanded')`, `toHaveAttribute('aria-selected')`, etc.
- **D-02:** No instalar jest-axe ni axe-core. Cero dependencias nuevas de testing A11Y.
- **D-03:** Priorizar flujos criticos para maximizar cobertura y valor: AttendancePage, DashboardPage, useStudents, buildTeachersHierarchy, TeacherCard, GroupTabs.
- **D-04:** Componentes simples (Avatar, ProgressBar, ToggleSwitch, SearchInput) solo se testean si falta cobertura para llegar al 60% despues de cubrir los criticos.
- **D-05:** Mock a nivel de servicio API (`getAlumnos`, `getResumen`, `getConvocatorias`, etc.). Los hooks reales se ejecutan con datos mock — verifica integracion hook-to-page.
- **D-06:** Seguir el patron existente de `LoginPage.test.jsx` y `api.test.jsx` para mocking de modulos y fetch.
- **D-07:** Agregar script dedicado `"test:coverage": "vitest run --coverage"` en package.json. `npm test` sigue rapido sin overhead de cobertura.
- **D-08:** Thresholds de 60% enforzados en `vite.config.js` bajo `test.coverage.thresholds` — el script falla automaticamente si baja del umbral.

### Claude's Discretion

- Orden exacto de escritura de test files dentro de la estrategia "criticos primero"
- Datos mock especificos para cada test suite (convocatorias, alumnos, asistencia)
- Cuantos tests por suite (mientras cubran los flujos relevantes)
- Si incluir componentes simples depende del % de cobertura tras cubrir criticos

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | @vitest/coverage-v8 instalado con thresholds de 60% enforzados en vite.config.js | Seccion Standard Stack + Code Examples (configuracion de thresholds) |
| TEST-02 | AttendancePage y DashboardPage tienen tests unitarios | Seccion Architecture Patterns + Code Examples (mock de hooks, MemoryRouter, waitFor) |
| TEST-03 | TeacherCard y GroupTabs tienen tests con aserciones ARIA (sin jest-axe, manual assertions) | Seccion Architecture Patterns + Code Examples (ARIA manual assertions) |
| TEST-04 | useStudents y buildTeachersHierarchy tienen tests unitarios | Seccion Architecture Patterns + Code Examples (renderHook, pure function testing) |
| TEST-05 | Cobertura total alcanza >= 60% verificada por threshold | Seccion Standard Stack + estimacion de cobertura por numero de archivos |
</phase_requirements>

---

## Summary

El proyecto ya tiene una infraestructura de testing madura: 16 suites, 89 tests, todos pasando, con patrones bien establecidos de mocking (vi.mock de servicios, useNavigate, sessionStorage) y testing async (waitFor). Lo que falta para la Phase 5 es exclusivamente: (1) instalar el proveedor de cobertura, (2) configurar thresholds en vite.config.js, (3) agregar el script npm, y (4) escribir tests para los 6 archivos criticos no cubiertos.

La version exacta a instalar es `@vitest/coverage-v8@4.0.18`, que coincide con la version instalada de vitest (4.0.18). Instalar la version latest (4.1.2) causaria conflicto de peer dependencies con vitest 4.0.18. Este punto es critico y fue identificado como blocker en STATE.md.

Para las aserciones ARIA (TEST-03), el patron exacto ya existe en el codebase: `getByRole` con opciones como `name`, `toHaveAttribute` para estados dinamicos (`aria-selected`, `aria-expanded`). No se necesita ninguna dependencia adicional.

**Recomendacion primaria:** Instalar `@vitest/coverage-v8@4.0.18` (version exacta), configurar thresholds en vite.config.js, luego escribir tests en orden: buildTeachersHierarchy (pure fn, trivial) -> useStudents (renderHook, mock API) -> GroupTabs (ARIA tablist) -> TeacherCard (ARIA role=button) -> AttendancePage -> DashboardPage.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @vitest/coverage-v8 | 4.0.18 (exacta) | Proveedor de cobertura V8 para Vitest | Peer dep exacta con vitest@4.0.18 instalado; V8 no requiere instrumentacion de codigo |
| vitest | 4.0.18 (ya instalada) | Test runner | Ya instalado, no cambiar |
| @testing-library/react | 16.3.2 (ya instalada) | render, screen, waitFor, renderHook | Ya instalado |
| @testing-library/user-event | 14.6.1 (ya instalada) | Simulacion de teclado (ArrowLeft/Right para GroupTabs) | Ya instalado |

### No instalar

| NO instalar | Razon |
|-------------|-------|
| jest-axe | Decision D-02: cero dependencias nuevas de A11Y |
| axe-core | Decision D-02: cero dependencias nuevas de A11Y |
| @vitest/coverage-istanbul | V8 es mas rapido, cero instrumentacion, suficiente para este proyecto |
| @vitest/coverage-v8 latest (4.1.2) | Peer dep conflicto: requiere vitest@4.1.2, instalado es 4.0.18 |

**Instalacion:**

```bash
npm install --save-dev @vitest/coverage-v8@4.0.18
```

**Verificacion de version:**

```bash
node -e "const lock = require('./package-lock.json'); console.log(lock.packages['node_modules/vitest']?.version)"
# Debe imprimir: 4.0.18
```

---

## Architecture Patterns

### Configuracion de Cobertura en vite.config.js

Agregar bajo la clave `test` existente:

```js
// Source: https://vitest.dev/config/#coverage
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/tests/setup.js',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    include: ['src/**/*.{js,jsx}'],
    exclude: [
      'src/tests/**',
      'src/main.jsx',
      'src/App.jsx',
    ],
    thresholds: {
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60,
    },
  },
},
```

**Notas criticas:**
- `provider: 'v8'` requiere que `@vitest/coverage-v8` este instalado (peer dep).
- `thresholds` hace que `vitest run --coverage` salga con codigo != 0 si la cobertura baja del umbral — el build/CI falla automaticamente.
- `include` limita el reporte a `src/` para evitar contar archivos de config de Vite/Tailwind.
- `exclude` debe incluir `src/tests/**` (los propios tests no se cuentan como codigo a cubrir) y archivos de entrada triviales.

### Script en package.json

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

`npm test` no cambia — sigue rapido. `npm run test:coverage` genera el reporte y aplica thresholds.

### Patron: Test de Funcion Pura (buildTeachersHierarchy)

Sin renderizado, sin mocks. Import directo, datos fixture en el test:

```js
// src/tests/buildTeachersHierarchy.test.js
import { describe, it, expect } from 'vitest'
import buildTeachersHierarchy from '../utils/buildTeachersHierarchy.js'

describe('buildTeachersHierarchy', () => {
  const PROFESORES = [{ id: 'prof-1', nombre: 'Samuel' }]
  const RESUMEN = [
    { profesor_id: 'prof-1', grupo: 'G1', alumno_id: 'a1', nombre: 'Ana', semanal: 90, quincenal: 85, mensual: 88 },
  ]

  it('mapea un profesor con un grupo y un alumno', () => {
    const result = buildTeachersHierarchy(PROFESORES, RESUMEN)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Samuel')
    expect(result[0].groups).toHaveLength(1)
    expect(result[0].groups[0].students).toHaveLength(1)
    expect(result[0].groups[0].students[0].monthly).toBe(88)
  })

  it('retorna array vacio si profesores es vacio', () => {
    expect(buildTeachersHierarchy([], [])).toEqual([])
  })
})
```

### Patron: Test de Hook con renderHook (useStudents)

`renderHook` ya esta disponible en `@testing-library/react` 16.x. El patron es testear el hook montandolo en un componente auxiliar o via renderHook con wrapper para mocks:

```js
// src/tests/useStudents.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import useStudents, { GROUPS } from '../hooks/useStudents.js'

vi.mock('../config/api', () => ({ isApiEnabled: vi.fn(() => false) }))
vi.mock('../services/api', () => ({ getAlumnos: vi.fn() }))

import { isApiEnabled } from '../config/api'

describe('useStudents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isApiEnabled.mockReturnValue(false)
  })

  it('carga alumnos mock en modo sin API', async () => {
    const { result } = renderHook(() => useStudents(null, null))
    await waitFor(() => {
      expect(result.current.loadingStudents).toBe(false)
    })
    expect(result.current.students.length).toBeGreaterThan(0)
  })

  it('toggleStudent alterna el estado present de un alumno', async () => {
    const { result } = renderHook(() => useStudents(null, null))
    await waitFor(() => expect(result.current.loadingStudents).toBe(false))
    const before = result.current.students[0].present
    result.current.toggleStudent(0)
    // re-render ocurre; verificar con waitFor o act
    await waitFor(() => {
      expect(result.current.students[0].present).toBe(!before)
    })
  })
})
```

### Patron: Test de Componente ARIA (GroupTabs)

Usar `getByRole` con opciones y `toHaveAttribute` para contratos ARIA de Phase 4:

```jsx
// src/tests/GroupTabs.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GroupTabs from '../components/features/GroupTabs.jsx'

const GROUPS = ['G1', 'G2', 'G3', 'G4']

describe('GroupTabs', () => {
  it('tiene role=tablist con aria-label="Grupos"', () => {
    render(<GroupTabs groups={GROUPS} selected="G1" onChange={vi.fn()} />)
    expect(screen.getByRole('tablist', { name: 'Grupos' })).toBeInTheDocument()
  })

  it('tab activo tiene aria-selected=true, los demas false', () => {
    render(<GroupTabs groups={GROUPS} selected="G1" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: /Grupo G1/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Grupo G2/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('tab activo tiene tabIndex=0, los demas tabIndex=-1', () => {
    render(<GroupTabs groups={GROUPS} selected="G1" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: /Grupo G1/ })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: /Grupo G2/ })).toHaveAttribute('tabindex', '-1')
  })

  it('ArrowRight mueve seleccion al siguiente grupo', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<GroupTabs groups={GROUPS} selected="G1" onChange={onChange} />)
    await user.keyboard('{ArrowRight}')
    // onChange es llamado con el siguiente grupo
    expect(onChange).toHaveBeenCalledWith('G2')
  })
})
```

### Patron: Test de Componente ARIA (TeacherCard)

Contratos de Phase 4: `role="button"`, `aria-expanded`, navegacion teclado Enter/Space/Escape:

```jsx
// src/tests/TeacherCard.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TeacherCard from '../components/features/TeacherCard.jsx'

const MOCK_TEACHER = {
  id: 'prof-1',
  name: 'Samuel',
  initial: 'S',
  groups: [{
    id: 'G1-prof-1',
    number: 1,
    students: [{ id: 'a1', name: 'Ana', weekly: 90, biweekly: 85, monthly: 88 }],
  }],
}

describe('TeacherCard', () => {
  it('tiene role=button en la cabecera', () => {
    render(<TeacherCard teacher={MOCK_TEACHER} isExpanded={false} onToggle={vi.fn()} onStudentClick={vi.fn()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('aria-expanded refleja el estado isExpanded', () => {
    const { rerender } = render(
      <TeacherCard teacher={MOCK_TEACHER} isExpanded={false} onToggle={vi.fn()} onStudentClick={vi.fn()} />
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
    rerender(
      <TeacherCard teacher={MOCK_TEACHER} isExpanded={true} onToggle={vi.fn()} onStudentClick={vi.fn()} />
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })

  it('llama onToggle al presionar Enter', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(<TeacherCard teacher={MOCK_TEACHER} isExpanded={false} onToggle={onToggle} onStudentClick={vi.fn()} />)
    await user.tab() // mover foco al button
    await user.keyboard('{Enter}')
    expect(onToggle).toHaveBeenCalled()
  })

  it('llama onToggle al presionar Escape cuando esta expandido', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(<TeacherCard teacher={MOCK_TEACHER} isExpanded={true} onToggle={onToggle} onStudentClick={vi.fn()} />)
    await user.tab()
    await user.keyboard('{Escape}')
    expect(onToggle).toHaveBeenCalled()
  })
})
```

### Patron: Test de Pagina Compleja (AttendancePage)

Mock de servicio API + mock de `useLocation` para inyectar `location.state.convocatoria`:

```jsx
// src/tests/AttendancePage.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: { convocatoria: { id: 'conv-1', nombre: 'Enero 2026' } } }),
  }
})

vi.mock('../services/api', () => ({
  getAlumnos: vi.fn(),
  guardarAsistencia: vi.fn(),
}))

vi.mock('../config/api', () => ({
  isApiEnabled: vi.fn(() => false),
}))

import AttendancePage from '../pages/AttendancePage'

function renderPage() {
  sessionStorage.setItem('user', JSON.stringify({ username: 'samuel', name: 'Samuel', role: 'teacher' }))
  return render(<MemoryRouter><AttendancePage /></MemoryRouter>)
}

describe('AttendancePage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockNavigate.mockClear()
    vi.clearAllMocks()
  })

  it('renderiza el nombre del profesor del sessionStorage', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Samuel')).toBeInTheDocument()
    })
  })

  it('muestra las StatCards de presentes, ausentes y asistencia', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Presentes')).toBeInTheDocument())
    expect(screen.getByText('Ausentes')).toBeInTheDocument()
    expect(screen.getByText('Asistencia')).toBeInTheDocument()
  })

  it('boton Guardar comienza deshabilitado (0 presentes)', async () => {
    renderPage()
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Guardar asistencia/i })
      // variant disabled implica que tiene clase bg-disabled
      expect(btn.className).toMatch(/bg-disabled|disabled/)
    })
  })
})
```

### Patron: Test de Pagina Compleja (DashboardPage)

Mock de `useDashboard` directamente (hook ya tiene su propio test; aqui interesa la pagina):

```jsx
// src/tests/DashboardPage.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Mock del hook completo para aislar la pagina
vi.mock('../hooks/useDashboard.js', () => ({
  default: vi.fn(),
}))

import DashboardPage from '../pages/DashboardPage'
import useDashboard from '../hooks/useDashboard.js'

const MOCK_DASHBOARD_STATE = {
  convocatorias: [{ id: 'c1', nombre: 'Enero 2026' }],
  convocatoria: { id: 'c1', nombre: 'Enero 2026' },
  reload: vi.fn(),
  teachers: [],
  loading: false,
  error: null,
  expandedTeacher: null,
  searchQuery: '',
  setSearchQuery: vi.fn(),
  selectedStudent: null,
  setSelectedStudent: vi.fn(),
  showAlertPopup: false,
  handleAlertClick: vi.fn(),
  handleAlertClose: vi.fn(),
  handleStudentClose: vi.fn(),
  handleClear: vi.fn(),
  handleTeacherToggle: vi.fn(),
  handleConvChange: vi.fn(),
  totalStudents: 48,
  globalAttendance: 83,
  alertStudents: [],
  searchResults: [],
}

function renderPage() {
  sessionStorage.setItem('user', JSON.stringify({ username: 'admin', name: 'Admin', role: 'ceo' }))
  return render(<MemoryRouter><DashboardPage /></MemoryRouter>)
}

describe('DashboardPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockNavigate.mockClear()
    vi.clearAllMocks()
    useDashboard.mockReturnValue(MOCK_DASHBOARD_STATE)
  })

  it('renderiza titulo Dashboard', () => {
    renderPage()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('muestra el total de alumnos', () => {
    renderPage()
    expect(screen.getByText('48')).toBeInTheDocument()
  })

  it('muestra estado de error con boton Reintentar', () => {
    useDashboard.mockReturnValue({ ...MOCK_DASHBOARD_STATE, loading: false, error: 'Error de red' })
    renderPage()
    expect(screen.getByText('Error de red')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument()
  })
})
```

### Anti-Patrones a Evitar

- **Mock del hook useStudents en lugar de mockearlo a nivel de API:** Decision D-05 dice mock a nivel de servicio API para que los hooks reales se ejecuten — verifica integracion hook-to-page. La excepcion es DashboardPage donde mockear `useDashboard` directamente es pragmatico (el hook ya tiene su propio test).
- **Usar `fireEvent` en vez de `userEvent` para teclado:** `fireEvent.keyDown` no reproduce el ciclo completo de eventos del navegador. Usar `userEvent.keyboard` para tests de navegacion por teclado (ArrowLeft/Right, Enter, Escape).
- **`getByRole('tab', { name: 'G1' })` cuando el texto real es 'Grupo G1':** Verificar el texto exacto renderizado. En GroupTabs el boton renderiza "Grupo G1", no "G1".
- **`toHaveAttribute('aria-selected', true)` (booleano):** Los atributos ARIA son siempre strings en el DOM. Usar `toHaveAttribute('aria-selected', 'true')` (string).
- **Instalar @vitest/coverage-v8 sin pinear la version:** `npm install @vitest/coverage-v8` sin version instala la latest (actualmente 4.1.2) que tiene peer dep vitest@4.1.2 — conflicto con la 4.0.18 instalada. SIEMPRE usar `@vitest/coverage-v8@4.0.18`.

---

## Don't Hand-Roll

| Problema | No construir | Usar en cambio | Por que |
|----------|-------------|----------------|---------|
| Verificacion de cobertura | Script bash que cuenta lineas | `@vitest/coverage-v8` + thresholds | Thresholds nativos en Vitest: enforcement automatico, reporte HTML, integrable en CI |
| Aserciones ARIA | Funciones helper custom que inspeccionan el DOM | `getByRole` + `toHaveAttribute` de Testing Library + jest-dom | Ya instalados, semanticamente correctos, API official |
| Testing de hooks | Montar componente wrapper manual en cada test | `renderHook` de `@testing-library/react` 16.x | Ya disponible en el codebase, patron ya usado en `useDashboard.test.jsx` |
| Simulacion de teclado | `document.dispatchEvent(new KeyboardEvent(...))` manual | `userEvent.keyboard` de `@testing-library/user-event` | Simula correctamente el ciclo focus->keydown->keyup, ya instalado |

---

## Common Pitfalls

### Pitfall 1: Version mismatch de @vitest/coverage-v8

**Que va mal:** `npm install @vitest/coverage-v8` instala la latest (4.1.2) con peer dep `vitest: '4.1.2'`. El proyecto tiene vitest 4.0.18. npm puede instalar con advertencia pero el proveedor puede fallar en runtime.
**Por que ocurre:** npm no bloquea peer deps por defecto desde npm 7.
**Como evitar:** Pinear la version exacta: `npm install --save-dev @vitest/coverage-v8@4.0.18`.
**Signos de alerta:** Warning "WARN Could not resolve peer dependency" durante npm install.

### Pitfall 2: useLocation no mockeable en MemoryRouter estatico

**Que va mal:** `AttendancePage` lee `location.state?.convocatoria` via `useLocation`. Si no se mockea, `location.state` es `null` y el componente muestra la fecha sin nombre de convocatoria — potencialmente falla aserciones.
**Por que ocurre:** `MemoryRouter` inicializa `location.state` como `null` por defecto.
**Como evitar:** Mockear `useLocation` junto con `useNavigate` en el mismo `vi.mock('react-router-dom', ...)`, o usar `<MemoryRouter initialEntries={[{ pathname: '/attendance', state: { convocatoria: mockConv } }]}>`.
**Signos de alerta:** Tests que fallan buscando texto del nombre de convocatoria.

### Pitfall 3: act() warnings con hooks que tienen useEffect async

**Que va mal:** `useStudents` tiene un `useEffect` que llama `getAlumnos` de forma async. Sin `waitFor`, las aserciones se ejecutan antes de que el estado se actualice — React emite warnings "act()" y los tests son flaky.
**Por que ocurre:** Los updates de estado async no estan envueltos automaticamente en `act()`.
**Como evitar:** Siempre usar `await waitFor(() => expect(result.current.loadingStudents).toBe(false))` despues de `renderHook` para esperar que el estado asentarse.
**Signos de alerta:** Warning en consola "Warning: An update to useStudents inside a test was not wrapped in act(...)".

### Pitfall 4: aria-selected como booleano en lugar de string

**Que va mal:** `toHaveAttribute('aria-selected', true)` — el valor booleano. El atributo en el DOM es siempre un string.
**Por que ocurre:** Confusion entre la prop JSX (`aria-selected={true}`) y el atributo DOM (`aria-selected="true"`).
**Como evitar:** Siempre `toHaveAttribute('aria-selected', 'true')` y `toHaveAttribute('aria-selected', 'false')`.
**Signos de alerta:** El test falla aunque el elemento tenga el atributo correcto.

### Pitfall 5: ArrowLeft/Right en GroupTabs requiere foco en el tablist o en un tab

**Que va mal:** `userEvent.keyboard('{ArrowRight}')` no dispara el handler si ningun elemento dentro del tablist tiene foco.
**Por que ocurre:** `onKeyDown` esta en el contenedor `div[role="tablist"]`, no en el documento. Los eventos de teclado se disparan desde el elemento con foco y burbujean.
**Como evitar:** Hacer `await user.tab()` primero para mover el foco al primer tab activo (que tiene `tabIndex={0}`), luego `await user.keyboard('{ArrowRight}')`.
**Signos de alerta:** `onChange` nunca es llamado en tests de navegacion por teclado.

### Pitfall 6: Thresholds configurados en la clave incorrecta de vite.config.js

**Que va mal:** Poner `thresholds` fuera de `coverage`, o poner `coverage` fuera de `test`. Si la clave esta mal anidada, Vitest la ignora silenciosamente y nunca falla por cobertura baja.
**Por que ocurre:** La API de Vitest es `test.coverage.thresholds`, no `test.thresholds` ni `coverage.thresholds`.
**Como evitar:** Verificar la estructura exacta: `defineConfig({ test: { coverage: { provider: 'v8', thresholds: { lines: 60 } } } })`.
**Signos de alerta:** `npm run test:coverage` pasa aunque la cobertura sea 20%.

---

## Code Examples

### Configuracion completa de coverage en vite.config.js

```js
// Source: https://vitest.dev/config/#coverage-thresholds
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/tests/setup.js',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    include: ['src/**/*.{js,jsx}'],
    exclude: [
      'src/tests/**',
      'src/main.jsx',
      'src/App.jsx',
    ],
    thresholds: {
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60,
    },
  },
},
```

### Mock de useLocation con state

```jsx
// Para AttendancePage que depende de location.state.convocatoria
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: { convocatoria: { id: 'conv-1', nombre: 'Enero 2026' } },
    }),
  }
})
```

### renderHook con mock de API para useStudents

```jsx
// Patron ya usado en useDashboard.test.jsx
import { renderHook, waitFor } from '@testing-library/react'
import useStudents, { GROUPS } from '../hooks/useStudents.js'

const { result } = renderHook(() => useStudents(null, null))
await waitFor(() => expect(result.current.loadingStudents).toBe(false))
```

### Aserciones ARIA manuales (sin jest-axe)

```jsx
// getByRole busca el rol nativo o ARIA explicitamente
const tablist = screen.getByRole('tablist', { name: 'Grupos' })
expect(tablist).toBeInTheDocument()

// Para atributos con valor dinamico
expect(screen.getByRole('tab', { name: /Grupo G1/ })).toHaveAttribute('aria-selected', 'true')
expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vite.config.js` (inline bajo clave `test`) |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | @vitest/coverage-v8 instalado, thresholds 60% en vite.config.js | Infrastructure | `npm run test:coverage` | ❌ Wave 0: package.json + vite.config.js changes |
| TEST-02 | AttendancePage: renderiza flujos criticos (carga alumnos, stats, boton guardar) | Integration | `npm test` | ❌ Wave 0: `src/tests/AttendancePage.test.jsx` |
| TEST-02 | DashboardPage: renderiza, muestra error, muestra datos | Integration | `npm test` | ❌ Wave 0: `src/tests/DashboardPage.test.jsx` |
| TEST-03 | GroupTabs: tablist/tab ARIA, aria-selected, ArrowLeft/Right | Unit ARIA | `npm test` | ❌ Wave 0: `src/tests/GroupTabs.test.jsx` |
| TEST-03 | TeacherCard: role=button, aria-expanded, Enter/Space/Escape | Unit ARIA | `npm test` | ❌ Wave 0: `src/tests/TeacherCard.test.jsx` |
| TEST-04 | useStudents: carga mock, toggleStudent, toggleAll, stats derivadas | Unit hook | `npm test` | ❌ Wave 0: `src/tests/useStudents.test.jsx` |
| TEST-04 | buildTeachersHierarchy: transformacion plana->arbol, edge cases | Unit pure fn | `npm test` | ❌ Wave 0: `src/tests/buildTeachersHierarchy.test.js` |
| TEST-05 | Cobertura >= 60% verificada por threshold | Threshold gate | `npm run test:coverage` | ❌ Depende de TEST-01 + todos los anteriores |

### Sampling Rate

- **Por tarea (commit):** `npm test` — 89 tests existentes + nuevos tests de la tarea
- **Por wave merge:** `npm run test:coverage` — verifica threshold 60%
- **Phase gate:** `npm run test:coverage` verde antes de `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/tests/buildTeachersHierarchy.test.js` — cubre TEST-04 (funcion pura)
- [ ] `src/tests/useStudents.test.jsx` — cubre TEST-04 (hook con cache)
- [ ] `src/tests/GroupTabs.test.jsx` — cubre TEST-03 (ARIA tablist)
- [ ] `src/tests/TeacherCard.test.jsx` — cubre TEST-03 (ARIA role=button)
- [ ] `src/tests/AttendancePage.test.jsx` — cubre TEST-02 (pagina teacher)
- [ ] `src/tests/DashboardPage.test.jsx` — cubre TEST-02 (pagina CEO)
- [ ] `package.json` — agregar script `test:coverage` + devDep `@vitest/coverage-v8@4.0.18`
- [ ] `vite.config.js` — agregar `test.coverage` con provider, include, exclude, thresholds

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 18+ | npm install, vitest | Si | Windows/proyecto | — |
| npm | Instalacion @vitest/coverage-v8 | Si | Presente en proyecto | — |
| @vitest/coverage-v8@4.0.18 | TEST-01: cobertura V8 | No instalado aun | — | Ninguno (es el objetivo) |
| vitest@4.0.18 | Test runner | Si (instalado) | 4.0.18 | — |
| @testing-library/react@16.3.2 | renderHook, render, waitFor | Si (instalado) | 16.3.2 | — |
| @testing-library/user-event@14.6.1 | Teclado en GroupTabs/TeacherCard | Si (instalado) | 14.6.1 | — |

**Dependencias faltantes sin fallback:**
- `@vitest/coverage-v8@4.0.18` — necesario para TEST-01 y TEST-05. Debe instalarse como primer paso de Wave 0.

**Ninguna dependencia externa de red, base de datos ni servicio externo es requerida.** Todos los tests usan mocks de `global.fetch` o `vi.mock` de servicios — sin llamadas reales a Google Apps Script.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `renderHook` de `@testing-library/react-hooks` (paquete separado) | `renderHook` incluido en `@testing-library/react` 13+ | @testing-library/react 13.1.0 (2022) | No instalar el paquete separado; ya disponible |
| `fireEvent.keyDown` para tests de teclado | `userEvent.keyboard` | @testing-library/user-event 14 (2022) | Simula ciclo completo de eventos; mas fiel al comportamiento real |
| `@vitest/coverage-istanbul` (instrumentacion JS) | `@vitest/coverage-v8` (motor V8 nativo) | Vitest 0.26+ | V8 es mas rapido, no modifica el codigo instrumentado |

**Obsoleto / a evitar:**
- `@testing-library/react-hooks`: Deprecado desde que `renderHook` se integro en `@testing-library/react`. El codebase ya usa el patron correcto en `useDashboard.test.jsx`.
- `jest-axe`: Decision D-02 lo descarta explicitamente. Las aserciones manuales son suficientes para verificar contratos ARIA conocidos.

---

## Open Questions

1. **Cuanto coverage aporta cubrir solo los 6 archivos criticos sin componentes simples**
   - Lo que sabemos: Los archivos criticos (AttendancePage, DashboardPage, useStudents, buildTeachersHierarchy, TeacherCard, GroupTabs) son los mas grandes y complejos del codebase. Con 89 tests existentes ya hay coverage de Button, Badge, StatCard, StudentRow, LoginPage, ConvocatoriaPage, api.js, ProtectedRoute, y otros.
   - Lo que no sabemos: El % exacto de cobertura actual sin el proveedor instalado.
   - Recomendacion: Ejecutar `npm run test:coverage` despues de instalar el proveedor pero ANTES de escribir tests nuevos para medir el baseline. Si el baseline es >= 50%, los 6 archivos criticos probablemente alcanzan el 60%. Si esta en 35-40%, puede ser necesario agregar algun componente simple (D-04).

2. **Si DashboardPage debe mockearse a nivel de hook o a nivel de servicio API**
   - Lo que sabemos: `useDashboard` es un hook complejo que compone `useConvocatorias` + fetches paralelos. Mockearlo completo aisla la pagina limpiamente (Decision D-05 dice mock de servicios, pero para DashboardPage el hook es la frontera natural).
   - Recomendacion: Mockear `useDashboard` directamente para los tests de `DashboardPage` (el hook ya tiene su propio test en `useDashboard.test.jsx`). Para `useStudents`, mockear solo `getAlumnos` de servicios.

---

## Project Constraints (from CLAUDE.md)

Directivas mandatorias que el planificador debe verificar en cada tarea:

| Directiva | Aplicacion en Phase 5 |
|-----------|----------------------|
| Cero estilos inline | Los archivos de test no generan JSX con estilos; los componentes testeados ya cumplen la regla |
| Maximo 250 lineas por archivo | Cada test file debe mantenerse bajo 250 lineas; si un suite crece, dividir por categoria |
| Solo tokens Tailwind (no hex) | No aplica directamente a tests; los componentes ya cumplen |
| Idioma: UI/comentarios en espanol, codigo en ingles | Descripciones de tests en espanol (`'renderiza correctamente'`), nombres de variables en ingles (`mockNavigate`, `MOCK_TEACHER`) |
| `npm run lint` antes de entregar | Ejecutar despues de cada test file nuevo — ESLint con jsx-a11y puede emitir warnings en JSX auxiliar de tests |
| Commits: Conventional Commits en espanol | `test: cobertura GroupTabs y TeacherCard -- aserciones ARIA Phase 4` |
| No cambiar framework (React 19 + Vite 7 + Tailwind 3) | Solo se agrega @vitest/coverage-v8 como devDep, no se cambia nada del stack de produccion |
| Backend Google Apps Script — no se toca | Tests usan exclusivamente mocks; cero llamadas reales al backend |

---

## Sources

### Primary (HIGH confidence)

- Vitest official docs (https://vitest.dev/config/#coverage) — configuracion de coverage, thresholds, provider v8
- npm registry — version exacta `@vitest/coverage-v8@4.0.18` y sus peer deps verificadas con `npm view`
- @testing-library/react 16.x docs — `renderHook` incluido en el paquete principal
- Codebase: `src/tests/useDashboard.test.jsx` — patron real de renderHook ya en uso
- Codebase: `src/tests/LoginPage.test.jsx` — patron real de mocking de servicios + useNavigate
- Codebase: `src/components/features/GroupTabs.jsx` — contratos ARIA exactos implementados en Phase 4
- Codebase: `src/components/features/TeacherCard.jsx` — contratos ARIA exactos implementados en Phase 4

### Secondary (MEDIUM confidence)

- `package.json` + `package-lock.json` — versiones instaladas verificadas en filesystem local
- `.planning/codebase/TESTING.md` — inventario de tests existentes, patrones establecidos
- `.planning/phases/04-documentacion-y-accesibilidad/04-CONTEXT.md` — contratos ARIA definitivos (D-01..D-06)

### Tertiary (LOW confidence)

Ninguno — todas las afirmaciones criticas verificadas con fuentes PRIMARY o SECONDARY.

---

## Metadata

**Confidence breakdown:**
- Standard stack (version @vitest/coverage-v8): HIGH — verificado con `npm view` contra registry real
- Configuracion de thresholds: HIGH — verificado contra docs oficiales de Vitest
- Patrones de test ARIA: HIGH — basados en implementacion real de los componentes + API official de Testing Library
- Estimacion de cobertura >= 60%: MEDIUM — baseline desconocido hasta instalar proveedor; los 6 archivos criticos son los de mayor superficie

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (ecosystem estable; vitest 4.x es current major)
