# Phase 3: Arquitectura y Accesibilidad - Research

**Researched:** 2026-03-31
**Domain:** React custom hooks (extraccion de logica), accesibilidad de modales (focus trap, ARIA)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Refactor DashboardPage (ARCH-01)**
- D-01: Extraer **todo** el estado, fetching, callbacks de UI y datos derivados a un hook `useDashboard.js` en `src/hooks/`. Incluye: los 8 useState, loadConvData, handleConvChange, el useEffect de carga reactiva, los 5 useMemo (totalStudents, globalAttendance, allStudents, alertStudents, searchResults), y los 5 useCallback (handleAlertClick, handleAlertClose, handleStudentClose, handleClear, handleTeacherToggle).
- D-02: DashboardPage queda como **puro JSX orquestador** (~100 lineas). Solo importa useDashboard, destructura lo que necesita, y renderiza. Cero logica de negocio en la page.
- D-03: **No se extraen subcomponentes** del JSX de DashboardPage. Solo el hook. El JSX restante (~100 lineas) esta bien bajo el limite de 250.

**Focus Trap Modal (ARCH-02)**
- D-04: Implementacion via **hook custom `useFocusTrap`** en `src/hooks/`. Cero dependencias externas.
- D-05: El hook maneja: Tab/Shift+Tab atrapado entre elementos focusables, Escape cierra el modal, y **foco inicial al primer elemento focusable**. Si no hay elementos focusables, el foco va al contenedor del modal.
- D-06: Modal consume useFocusTrap via ref. La logica de focus trap es interna al Modal — los consumidores no cambian su implementacion del trap.

**ARIA Modal**
- D-07: Agregar atributos ARIA minimos al Modal: `role="dialog"`, `aria-modal="true"`, y `aria-label` via nueva prop `ariaLabel` (string).
- D-08: AlertList y StudentDetailPopup pasan `ariaLabel` descriptivo al Modal.

### Claude's Discretion
- Estructura interna de useDashboard (orden de hooks, nombres de variables internas).
- Implementacion exacta del ciclo Tab en useFocusTrap (querySelectorAll de focusables).
- El eslint-disable en la linea 79 de DashboardPage se mantiene o resuelve al mover la logica al hook.

### Deferred Ideas (OUT OF SCOPE)
Ninguna — la discusion se mantuvo dentro del alcance de la fase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ARCH-01 | DashboardPage refactorizado a <250 lineas extrayendo useDashboard hook | Patron verificado en useConvocatorias.js; lineas actuales = 247 (ya en el limite); extraccion deja ~100 lineas de JSX puro |
| ARCH-02 | Modal tiene focus trap (foco no escapa) y cierra con Escape | Patron useFocusTrap con querySelectorAll + keydown handler; ARIA role/aria-modal ya definidos en D-07/D-08 |
</phase_requirements>

---

## Summary

La fase tiene dos trabajos distintos que no se tocan entre si: extraer logica de DashboardPage a `useDashboard`, y hacer `Modal` accesible por teclado.

**useDashboard** es un refactor de extraccion pura: todo lo que esta en DashboardPage.jsx (8 useState, 5 useMemo, 5 useCallback, loadConvData, handleConvChange, useEffect reactivo) se mueve a `src/hooks/useDashboard.js` siguiendo exactamente el patron de `useConvocatorias.js`. DashboardPage queda con ~100 lineas de JSX que importa y destructura el hook. No hay logica nueva, no hay riesgo de regresion funcional, solo reubicacion de codigo existente.

**useFocusTrap** es logica nueva que no existe en el proyecto. El patron esta bien documentado: un `useEffect` con un listener `keydown` en el contenedor del modal que intercepta Tab/Shift+Tab para ciclar entre todos los elementos focusables del DOM, y Escape para invocar `onClose`. El riesgo principal es olvidar restaurar el foco al elemento que abrio el modal al cerrarlo — esto es importante para la experiencia de teclado pero no es un requisito explicito en ARCH-02 (Decision D-05 solo menciona foco inicial al primer elemento).

Los 79 tests actuales (13 suites) no tocan DashboardPage ni Modal, por lo que el refactor no rompe ninguno. El Success Criterion SC3 pide que los tests pasen en verde — esto es satisfecho mientras el refactor no introduce errores de importacion ni cambia los contratos de componentes que si estan testeados.

**Recomendacion primaria:** Implementar en este orden: (1) useDashboard.js, (2) DashboardPage refactor, (3) useFocusTrap.js, (4) Modal actualizado, (5) AlertList y StudentDetailPopup agregan ariaLabel.

---

## Standard Stack

### Core

| Library | Version | Purpose | Por que es el estandar |
|---------|---------|---------|------------------------|
| React | ^19.2.0 | useState, useEffect, useCallback, useMemo, useRef | Ya en el proyecto |
| Vitest | ^4.0.18 | Test runner | Ya configurado con jsdom |
| @testing-library/react | ^16.3.2 | renderizar y hacer queries en tests | Ya en setup.js |

### No hay dependencias nuevas

Ambos hooks son implementacion pura en JavaScript del proyecto. No se instala nada nuevo. Decision D-04 lo requiere explicitamente (cero dependencias externas).

---

## Architecture Patterns

### Patron del hook useDashboard

El patron exacto a seguir es `useConvocatorias.js` (69 lineas). La diferencia es que `useDashboard` consume `useConvocatorias` internamente (no lo reimplementa) y agrega la carga reactiva de datos de la convocatoria seleccionada.

**Estructura recomendada de useDashboard:**

```
src/hooks/useDashboard.js
  1. Imports (react, hooks propios, services, config, utils)
  2. export default function useDashboard()
  3. useConvocatorias() — consume el hook existente
  4. 8 useState (teachers, loading, error, expandedTeacher, searchQuery, selectedStudent, showAlertPopup)
  5. useDebounce (ya importado)
  6. 5 useCallback (handlers de UI)
  7. loadConvData (funcion async interna, no useCallback — solo la llaman el useEffect y handleConvChange)
  8. useEffect reactivo (deps: convsLoading, convsError, convocatoria)
  9. handleConvChange (funcion async, no useCallback — llamada desde JSX directamente, no prop de memo)
  10. 5 useMemo (totalStudents, globalAttendance, allStudents, alertStudents, searchResults)
  11. return { ...todo }
```

**Retorno del hook (contratos con DashboardPage):**

```javascript
return {
  // De useConvocatorias (re-expuestos)
  convocatorias,
  convocatoria,          // renombrado de selectedConvocatoria para brevedad en JSX
  reload,
  // Estado local
  teachers,
  loading,
  error,
  expandedTeacher,
  searchQuery,
  setSearchQuery,
  selectedStudent,
  setSelectedStudent,
  showAlertPopup,
  // Handlers
  handleAlertClick,
  handleAlertClose,
  handleStudentClose,
  handleClear,
  handleTeacherToggle,
  handleConvChange,
  // Datos derivados
  totalStudents,
  globalAttendance,
  alertStudents,
  searchResults,
}
```

**DashboardPage resultante (~100 lineas):**

```javascript
import useDashboard from '../hooks/useDashboard.js'
// + imports de componentes (mismos que hoy)

export default function DashboardPage() {
  const { convocatorias, convocatoria, loading, error, reload, ... } = useDashboard()
  const navigate = useNavigate()  // unico hook que queda en la page

  if (loading) return <DashboardSkeleton />
  if (error) return ( /* error UI */ )

  return ( /* JSX exactamente igual al actual */ )
}
```

### Patron del hook useFocusTrap

```javascript
// src/hooks/useFocusTrap.js
import { useEffect, useRef } from 'react'

/**
 * Hook que atrapa el foco dentro de un contenedor mientras el modal esta abierto.
 * @param {boolean} isOpen - Activa/desactiva el trap
 * @param {function} onClose - Llamado al presionar Escape
 * @returns {React.RefObject} ref - Asignar al contenedor del modal
 */
export default function useFocusTrap(isOpen, onClose) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !containerRef.current) return

    // Selectores de elementos focusables segun ARIA practices
    const FOCUSABLE = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    const container = containerRef.current

    // Foco inicial al primer elemento focusable
    const focusables = Array.from(container.querySelectorAll(FOCUSABLE))
    if (focusables.length > 0) {
      focusables[0].focus()
    } else {
      container.focus()
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key !== 'Tab') return

      const focusableNow = Array.from(container.querySelectorAll(FOCUSABLE))
      if (focusableNow.length === 0) return

      const first = focusableNow[0]
      const last = focusableNow[focusableNow.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return containerRef
}
```

**Modal actualizado (integracion de useFocusTrap + ARIA):**

```javascript
import useFocusTrap from '../../hooks/useFocusTrap.jsx'

export default function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = '360px',
  className = '',
  ariaLabel = '',        // NUEVA prop — D-07
}) {
  const containerRef = useFocusTrap(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div
      className="animate-fade-in fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-5"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}         // necesario si no hay elementos focusables dentro
        className={`animate-pop-up bg-white rounded-[20px] p-6 w-full shadow-2xl ${className}`}
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
```

**Nota sobre el `style={{ maxWidth }}`:** Este inline style ya existe en el Modal actual y es una de las 3 excepciones documentadas en CLAUDE.md (valores dinamicos que no tienen equivalente directo en Tailwind para valores arbitrarios pasados por prop). No se toca.

### Anti-Patrones a Evitar

- **No duplicar useConvocatorias en useDashboard:** useDashboard llama `useConvocatorias()` internamente y re-expone sus valores. No copiar la logica de fetch de convocatorias.
- **No convertir `loadConvData` en useCallback:** es una funcion async interna que se llama dentro de useEffect y handleConvChange. Envolverla en useCallback agrega complejidad sin beneficio porque no es pasada como prop.
- **No agregar `tabIndex={-1}` al overlay:** el foco debe quedar dentro del contenedor del modal, no en el overlay. El `tabIndex={-1}` va solo en el `<div>` interior del Modal (el que tiene `ref={containerRef}`).
- **No usar `focus-trap-react`:** Decision D-04 prohibe dependencias externas. Ademas existe un issue documentado con VoiceOver en iOS Safari (referenciado en STATE.md).
- **No cambiar la API publica del Modal** mas alla de agregar `ariaLabel`: AlertList y StudentDetailPopup deben seguir funcionando con sus props actuales. `ariaLabel` tiene default `''` para no romper nada.

---

## Don't Hand-Roll

| Problema | No construir | Usar en su lugar | Por que |
|----------|-------------|------------------|---------|
| Focus trap | Biblioteca externa focus-trap-react | useFocusTrap custom (D-04) | La decision esta tomada; la implementacion manual son ~40 lineas |
| Estado global del dashboard | Redux/Zustand | useDashboard hook (D-01) | El proyecto ya usa React local state + hooks, no hay estado cross-page |
| Selectores CSS de focusables | Lista manual parcial | Selector compuesto estandar ARIA | La lista `a[href], button:not([disabled])...` es el estandar WAI-ARIA; no inventar |

---

## Common Pitfalls

### Pitfall 1: El eslint-disable en DashboardPage linea 79 (exhaustive-deps)

**Que pasa mal:** La linea 89 del DashboardPage actual tiene `// eslint-disable-line react-hooks/exhaustive-deps` para suprimir la dependencia de `convocatoria` en el useEffect. Al mover el useEffect a useDashboard, la advertencia aparece en el nuevo archivo.

**Por que ocurre:** El useEffect depende de `[convsLoading, convsError, convocatoria]` — esas son las dependencias correctas. La supresion existe porque `loadConvData` no esta en el array de deps (es una funcion definida dentro del scope del hook pero no con useCallback). Al moverlo al hook, la solucion limpia es definir `loadConvData` con `useCallback` O mantener el eslint-disable con un comentario explicativo. Dado que `loadConvData` es una funcion puramente local usada solo dentro del useEffect y handleConvChange, un useCallback agrega ruido sin beneficio real. **Recomendacion:** mantener el eslint-disable con comentario explicativo en el nuevo hook. Esto esta cubierto en Claude's Discretion.

**Senales de alerta:** Si el linter falla en `npm run lint` despues del refactor.

### Pitfall 2: `useNavigate` en useDashboard vs DashboardPage

**Que pasa mal:** Si se mueve el handler de logout (`sessionStorage.removeItem('user'); navigate('/')`) a useDashboard, el hook asume que React Router esta disponible en ese contexto. Esto es correcto — hooks pueden llamar `useNavigate`. Pero lo hace mas dificil de testear y viola la separacion de responsabilidades (el navigate es logica de UI, no de datos).

**Recomendacion de Claude's Discretion:** Dejar `useNavigate` en DashboardPage. El handler de logout tiene una linea, es el unico caso de navegacion, y `navigate` en un hook de datos es un smell arquitectural. DashboardPage pasa `onLogout` como prop al PageHeader igual que hoy.

**Impacto:** useDashboard no necesita importar useNavigate. DashboardPage mantiene exactamente un `const navigate = useNavigate()`.

### Pitfall 3: Re-query del DOM en cada keydown del focus trap

**Que pasa mal:** Si `focusables` se calcula una sola vez al montar el listener y el contenido del modal cambia dinamicamente (ej: StudentDetailPopup carga faltas de la API), el array de focusables queda desactualizado.

**Por que ocurre:** `useEffect` con `isOpen` como dependencia solo corre al abrir el modal, no cuando cambia el contenido.

**Como evitar:** Dentro del handler `handleKeyDown`, recalcular `focusableNow` con `container.querySelectorAll(FOCUSABLE)` en cada keydown. Esto es lo que muestra el patron en Code Examples mas arriba — `focusableNow` se re-evalua en cada pulsacion de Tab, no se cachea.

**Senales de alerta:** Tab deja de funcionar correctamente en StudentDetailPopup mientras carga (o deja de cargar) la lista de faltas.

### Pitfall 4: El `tabIndex={-1}` en el contenedor del modal

**Que pasa mal:** Sin `tabIndex={-1}` en el `<div>` interno del Modal (el `containerRef`), si no hay elementos focusables dentro (edge case), `containerRef.current.focus()` no funciona y lanza un error silencioso o no hace nada.

**Como evitar:** Siempre agregar `tabIndex={-1}` al contenedor que recibe `ref={containerRef}`. Esto lo hace programaticamente focusable sin que aparezca en el orden de Tab del resto de la pagina.

### Pitfall 5: Tests actuales rompen por cambio de contratos de importacion

**Que pasa mal:** Si DashboardPage cambia sus importaciones o la firma de componentes que si estan testeados (Button, Badge, StatCard), los tests pueden fallar aunque el comportamiento no haya cambiado.

**Como evitar:** DashboardPage no expone ninguna API publica (no es importada en tests). Los cambios son internos. Confirmar que `npm test` pasa verde inmediatamente despues de cada sub-tarea del refactor.

**Estado actual de tests:** 79 tests en 13 suites — todos pasan en verde verificado en ejecucion directa.

---

## Code Examples

### useDashboard — estructura minima del retorno

```javascript
// src/hooks/useDashboard.js
// Fuente: patron observado en src/hooks/useConvocatorias.js (proyecto)

import { useState, useEffect, useCallback, useMemo } from 'react'
import useConvocatorias from './useConvocatorias.js'
import useDebounce from './useDebounce.js'
import { TEACHERS_DATA } from '../config/teachers.js'
import { isApiEnabled } from '../config/api.js'
import { getProfesores, getResumen } from '../services/api.js'
import buildTeachersHierarchy from '../utils/buildTeachersHierarchy.js'

/**
 * Hook de datos y estado para DashboardPage.
 * Encapsula todas las llamadas API, estado local y valores derivados.
 * @returns {{ teachers, loading, error, convocatorias, convocatoria, reload,
 *   expandedTeacher, searchQuery, setSearchQuery, selectedStudent, setSelectedStudent,
 *   showAlertPopup, handleAlertClick, handleAlertClose, handleStudentClose,
 *   handleClear, handleTeacherToggle, handleConvChange,
 *   totalStudents, globalAttendance, alertStudents, searchResults }}
 */
export default function useDashboard() {
  const {
    convocatorias,
    selectedConvocatoria: convocatoria,
    setSelectedConvocatoria,
    loading: convsLoading,
    error: convsError,
    reload,
  } = useConvocatorias()

  // ... estados y logica movidos de DashboardPage ...

  return { /* objeto completo */ }
}
```

### Modal con focus trap integrado

```javascript
// src/components/ui/Modal.jsx — version post-fase-3
// Fuente: implementacion propia basada en WAI-ARIA Authoring Practices

import useFocusTrap from '../../hooks/useFocusTrap.js'

export default function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = '360px',
  className = '',
  ariaLabel = '',
}) {
  const containerRef = useFocusTrap(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div
      className="animate-fade-in fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-5"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`animate-pop-up bg-white rounded-[20px] p-6 w-full shadow-2xl ${className}`}
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
```

### AlertList con ariaLabel

```javascript
// src/components/features/AlertList.jsx — unico cambio
<Modal isOpen onClose={onClose} className="max-h-[70vh] overflow-auto" ariaLabel="Lista de alumnos en alerta">
```

### StudentDetailPopup con ariaLabel

```javascript
// src/components/features/StudentDetailPopup.jsx — unico cambio
<Modal isOpen onClose={onClose} ariaLabel="Detalle de asistencia del alumno">
```

---

## Runtime State Inventory

Esta fase es un refactor de arquitectura pura (extraccion de logica + accesibilidad). No hay estado runtime afectado.

| Categoria | Items encontrados | Accion requerida |
|-----------|-------------------|------------------|
| Datos almacenados | Ninguno — fase no toca datos ni claves de sessionStorage | Ninguna |
| Config de servicios | Ninguno — no se toca backend ni PWA | Ninguna |
| Estado OS | Ninguno | Ninguna |
| Secrets/env vars | Ninguno | Ninguna |
| Artefactos de build | dist/ puede estar obsoleto tras el refactor | `npm run build` en verificacion final |

---

## Environment Availability

Esta fase es puramente cambios de codigo. Las unicas herramientas externas son Node.js y npm, ya verificados como disponibles en el proyecto.

| Dependencia | Requerida por | Disponible | Version | Fallback |
|-------------|--------------|-----------|---------|----------|
| Node.js 18+ | npm test, npm run lint | si | detectada via proyecto activo | — |
| Vitest | npm test | si | ^4.0.18 en package.json | — |

---

## Validation Architecture

### Test Framework

| Propiedad | Valor |
|-----------|-------|
| Framework | Vitest ^4.0.18 + @testing-library/react ^16.3.2 |
| Archivo de config | `vite.config.js` (seccion `test:`) |
| Setup file | `src/tests/setup.js` |
| Comando rapido | `npm test` |
| Suite completa | `npm test` (no hay modo watch en CI) |

### Phase Requirements - Test Map

| Req ID | Comportamiento | Tipo de test | Comando automatizado | Archivo existe? |
|--------|---------------|--------------|---------------------|----------------|
| ARCH-01 | useDashboard retorna todos los valores que DashboardPage necesita | unit | `npm test -- useDashboard` | No — Wave 0 gap |
| ARCH-01 | DashboardPage renderiza correctamente usando useDashboard | smoke | Tests existentes pasan (no rompe nada) | Indirecto — via suite actual |
| ARCH-02 | useFocusTrap atrapa Tab dentro del contenedor | unit | `npm test -- useFocusTrap` | No — Wave 0 gap |
| ARCH-02 | useFocusTrap invoca onClose con Escape | unit | `npm test -- useFocusTrap` | No — Wave 0 gap |
| ARCH-02 | Modal renderiza role="dialog" y aria-modal="true" | unit | `npm test -- Modal` | No — Wave 0 gap |
| SC3 | Los 79 tests actuales siguen en verde | regression | `npm test` | Si — todos existentes |

### Sampling Rate

- **Por tarea:** `npm test` (rapido, 5.9s para 79 tests)
- **Por wave merge:** `npm test` (suite completa)
- **Phase gate:** Suite completa verde antes de `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/tests/useDashboard.test.jsx` — cubre ARCH-01: verifica que el hook retorna loading/error/teachers/handlers
- [ ] `src/tests/useFocusTrap.test.jsx` — cubre ARCH-02: simula keydown Tab y Escape con jsdom
- [ ] `src/tests/Modal.test.jsx` — cubre ARCH-02: verifica role="dialog", aria-modal, aria-label prop

**Nota:** Los tests de hooks (useDashboard, useFocusTrap) requieren `renderHook` de `@testing-library/react` que ya esta disponible en el proyecto. No se necesita instalar nada.

---

## Open Questions

1. **Orden de los items en el retorno de useDashboard**
   - Que sabemos: el contrato debe incluir todo lo que DashboardPage usa actualmente
   - Que no esta claro: si exponer `setSearchQuery` y `setSelectedStudent` directamente o envolverlos en handlers
   - Recomendacion: exponer los setters directamente ya que son usados inline en JSX (`onChange={e => setSearchQuery(e.target.value)}`). Envolverlos en handlers seria sobre-ingenieria.

2. **Restaurar foco al elemento que abrio el modal (al cerrar)**
   - Que sabemos: D-05 solo requiere foco inicial al primer elemento focusable al abrir
   - Que no esta claro: si la decision implicitamente espera restauracion del foco al cerrar (practica estandar de accesibilidad)
   - Recomendacion: implementar restauracion del foco en `useFocusTrap` — es ~3 lineas (`const trigger = document.activeElement` antes de establecer foco, `trigger?.focus()` en el cleanup del useEffect). Mejora la experiencia de teclado sin violar ninguna decision. **Si el planner quiere ser conservador**, omitirlo es aceptable dado que D-05 no lo requiere explicitamente.

---

## State of the Art

| Enfoque antiguo | Enfoque actual | Cuando cambio | Impacto |
|----------------|---------------|---------------|---------|
| Todo en el componente de pagina (monolitico) | Hook custom dedicado por dominio | React 16.8+ (hooks) | Logica reutilizable y testeable independientemente |
| `aria-label` en boton cerrar del modal | `role="dialog"` + `aria-modal` + `aria-label` en el contenedor | WAI-ARIA 1.1+ | Screen readers anuncian el dialogo y ocultan el fondo |
| Focus trap con `focus-trap-react` | Hook custom con querySelectorAll | Siempre fue posible; la preferencia por custom crece | Evita bugs de compatibilidad iOS VoiceOver documentados |

---

## Project Constraints (from CLAUDE.md)

Directivas aplicables a esta fase:

- **Cero estilos inline:** El `style={{ maxWidth }}` en Modal es una de las 3 excepciones documentadas. Se mantiene.
- **Atomicidad 250 lineas:** useDashboard tendra ~120-140 lineas. Modal pasara de 33 a ~45 lineas. useFocusTrap sera ~55 lineas. Todos bajo el limite.
- **Sistema de diseno:** No se agregan clases. No aplica directamente.
- **Idioma:** Comentarios y UI en espanol, nombres de variables/funciones en ingles. useDashboard sigue este patron.
- **Trabajo fino:** Esta fase tiene un PLAN antes de ejecutar — cumple con el requisito de esquema previo.
- **Commits en espanol:** `refactor: extraer useDashboard — DashboardPage a <250 lineas`, `feat: useFocusTrap — focus trap + Escape + ARIA en Modal`.
- **JSDoc obligatorio:** useDashboard y useFocusTrap necesitan JSDoc con `@returns` documentado.
- **No tocar backend:** Esta fase es 100% frontend. Ninguna modificacion a Google Apps Script.

---

## Sources

### Primary (HIGH confidence)
- `src/pages/DashboardPage.jsx` — codigo fuente completo leido directamente (247 lineas actuales)
- `src/components/ui/Modal.jsx` — codigo fuente completo leido directamente (33 lineas)
- `src/hooks/useConvocatorias.js` — patron de referencia verificado
- `src/hooks/useDebounce.js` — hook existente que useDashboard importa
- `.planning/phases/03-arquitectura-y-accesibilidad/03-CONTEXT.md` — decisiones bloqueadas
- `.planning/codebase/CONVENTIONS.md` — convenciones del proyecto
- `.planning/codebase/CONCERNS.md` — problemas documentados incluyendo el eslint-disable
- `.planning/codebase/ARCHITECTURE.md` — estructura de capas

### Secondary (MEDIUM confidence)
- WAI-ARIA Authoring Practices 1.1 — patron de selectores focusables (`a[href], button:not([disabled])...`) es el estandar de la industria, ampliamente reproducido en MDN y React docs
- Ejecucion de `npm test` en proyecto — confirma 79 tests en 13 suites, todos verdes

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todo es codigo existente del proyecto + implementacion manual
- Architecture (useDashboard): HIGH — extraccion directa del codigo existente, patron identico a useConvocatorias.js
- Architecture (useFocusTrap): HIGH — patron WAI-ARIA estandar, sin dependencias externas, ~55 lineas
- Pitfalls: HIGH — identificados directamente del codigo fuente y decisiones del CONTEXT.md
- Tests: HIGH — suite actual verificada en ejecucion directa

**Research date:** 2026-03-31
**Valid until:** 2026-05-01 (dependencias estables, no hay APIs externas en cambio)
