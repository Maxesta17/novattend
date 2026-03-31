# Phase 3: Arquitectura y Accesibilidad - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 03-arquitectura-y-accesibilidad
**Areas discussed:** Refactor DashboardPage, Focus trap del Modal, Alcance de accesibilidad

---

## Refactor DashboardPage

### Q1: Que se extrae al hook useDashboard?

| Option | Description | Selected |
|--------|-------------|----------|
| Todo el estado + fetching (Recomendado) | Los 8 useState, loadConvData, handleConvChange, el useEffect, y los 5 useMemo van a useDashboard. DashboardPage solo tiene JSX + callbacks UI. ~150 lineas en page, ~100 en hook. | x |
| Solo fetching + estado crudo | useState de teachers/loading/error, loadConvData, handleConvChange y el useEffect van al hook. useMemo derivados quedan en page. ~180 lineas en page, ~70 en hook. | |
| Tu decides | Claude usa su criterio para la separacion optima. | |

**User's choice:** Todo el estado + fetching (Recomendado)
**Notes:** Ninguna

### Q2: Callbacks de UI dentro o fuera del hook?

| Option | Description | Selected |
|--------|-------------|----------|
| Dentro del hook (Recomendado) | useDashboard retorna todo: datos, estado, handlers. DashboardPage queda como puro JSX orquestador (~100 lineas). | x |
| En la page | Los callbacks de UI son responsabilidad de la vista. useDashboard solo retorna datos y funciones de fetching. | |

**User's choice:** Dentro del hook (Recomendado)
**Notes:** Ninguna

### Q3: Extraer subcomponentes del JSX?

| Option | Description | Selected |
|--------|-------------|----------|
| Solo el hook | El JSX queda como esta en DashboardPage (~100 lineas con el hook extraido). Menos archivos nuevos. | x |
| Hook + subcomponentes | Ademas del hook, extraer secciones del JSX a componentes como DashboardStats, DashboardSearch, TeacherList. | |
| Tu decides | Claude evalua si el JSX restante necesita fragmentarse o no. | |

**User's choice:** Solo el hook
**Notes:** Ninguna

---

## Focus Trap del Modal

### Q1: Como implementar el focus trap?

| Option | Description | Selected |
|--------|-------------|----------|
| Manual (Recomendado) | useEffect con keydown listener para Escape + logica manual de Tab/Shift+Tab. Cero dependencias. Evita issue VoiceOver. ~30 lineas. | |
| focus-trap-react | Libreria probada con API declarativa. Maneja edge cases. Pero tiene issues con VoiceOver en iOS Safari. | |
| Hook custom useFocusTrap | Implementacion manual encapsulada como hook reutilizable en src/hooks/. Modal lo consume via ref. Separacion limpia, testeable. | x |

**User's choice:** Hook custom useFocusTrap
**Notes:** Ninguna

### Q2: Foco inicial al abrir el modal?

| Option | Description | Selected |
|--------|-------------|----------|
| Primer focusable (Recomendado) | Al abrir, foco va al primer boton/link. Si no hay focusables, va al contenedor. Patron estandar WAI-ARIA. | x |
| Contenedor del modal | Foco va al div contenedor (tabIndex=-1). Usuario hace Tab para navegar. Mas simple. | |
| Tu decides | Claude elige segun best practices. | |

**User's choice:** Primer focusable (Recomendado)
**Notes:** Ninguna

---

## Alcance de Accesibilidad

### Q1: Agregar ARIA minimo al Modal?

| Option | Description | Selected |
|--------|-------------|----------|
| Si, ARIA minimo (Recomendado) | role="dialog", aria-modal="true", aria-label. Complementario al focus trap. Coste: ~3 lineas. | x |
| No, solo trap + Escape | Cenirse a ARCH-02. ARIA es scope de A11Y-02 diferido. | |

**User's choice:** Si, ARIA minimo (Recomendado)
**Notes:** Ninguna

### Q2: Como se pasa el aria-label?

| Option | Description | Selected |
|--------|-------------|----------|
| Prop nueva (Recomendado) | Modal recibe prop ariaLabel (string). Consumidores pasan label descriptivo. | x |
| Automatico por children | Modal detecta primer heading y usa aria-labelledby. Mas elegante pero fragil. | |

**User's choice:** Prop nueva (Recomendado)
**Notes:** Ninguna

---

## Claude's Discretion

- Estructura interna de useDashboard (orden de hooks, nombres de variables)
- Implementacion exacta del ciclo Tab en useFocusTrap (querySelectorAll selectores)
- Resolucion del eslint-disable en DashboardPage al mover logica al hook

## Deferred Ideas

None — discussion stayed within phase scope.
