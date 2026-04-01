# Phase 4: Documentacion y Accesibilidad - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 04-documentacion-y-accesibilidad
**Areas discussed:** Teclado en TeacherCard, Patron ARIA en GroupTabs, Diseno del focus ring, Strictness de ESLint A11Y

---

## Teclado en TeacherCard

### Pregunta 1: Modelo de interaccion por teclado

| Option | Description | Selected |
|--------|-------------|----------|
| Card como boton | Cabecera entera es un solo tab stop con role="button". Enter/Space expande/colapsa, Escape colapsa. Contenido expandido NO navegable. | ✓ |
| Chevron como boton | Solo el icono chevron es un button focusable. Cabecera clickable con mouse pero Tab solo para en chevron. | |
| Card + contenido navegable | Cabecera como boton + items internos (alumnos, stats) tambien son tab stops. | |

**User's choice:** Card como boton (Recomendado)
**Notes:** El contenido expandido es informacion visual del CEO, no requiere interaccion por teclado.

### Pregunta 2: ARIA attributes

| Option | Description | Selected |
|--------|-------------|----------|
| aria-expanded + aria-hidden | Cabecera con aria-expanded, chevron SVG con aria-hidden="true". Screen reader anuncia estado. | ✓ |
| Solo aria-expanded | aria-expanded en cabecera sin tocar SVG. SVG podria ser leido como contenido sin sentido. | |

**User's choice:** Si, aria-expanded + aria-hidden (Recomendado)

---

## Patron ARIA en GroupTabs

### Pregunta 1: Patron de roles ARIA

| Option | Description | Selected |
|--------|-------------|----------|
| WAI-ARIA Tabs completo | role="tablist" en contenedor, role="tab" + aria-selected en botones. Arrow keys entre tabs. | ✓ |
| Botones simples | Mantener buttons sin roles tab. Tab navega secuencialmente. | |

**User's choice:** WAI-ARIA Tabs completo (Recomendado)
**Notes:** Patron estandar que screen readers reconocen automaticamente.

### Pregunta 2: Tabpanel para contenido

| Option | Description | Selected |
|--------|-------------|----------|
| Si, tabpanel completo | Contenedor de alumnos con role="tabpanel" + aria-labelledby. | ✓ |
| Sin tabpanel | Solo roles en tabs, contenido sin markup ARIA extra. | |

**User's choice:** Si, tabpanel completo (Recomendado)

---

## Diseno del focus ring

### Pregunta 1: Estilo del focus ring

| Option | Description | Selected |
|--------|-------------|----------|
| Ring global burgundy | Estilo en index.css: outline 2px solid #800000 en :focus-visible. Consistente con design system. | ✓ |
| Ring global gold | Mismo enfoque con gold (#C5A059). Mayor contraste en fondos oscuros. | |
| Por componente | Clases focus-visible manualmente en cada componente. | |

**User's choice:** Ring global burgundy (Recomendado)

### Pregunta 2: Limpieza de custom focus

| Option | Description | Selected |
|--------|-------------|----------|
| Quitar custom, usar global | Eliminar focus-visible custom de ToggleSwitch. Todo usa ring global. | ✓ |
| Mantener ambos | Dejar custom en ToggleSwitch ademas del global. Redundante. | |

**User's choice:** Quitar custom, usar global (Recomendado)

---

## Strictness de ESLint A11Y

### Pregunta 1: eslint-plugin-jsx-a11y

| Option | Description | Selected |
|--------|-------------|----------|
| Recommended | Preset por defecto. Reglas sensatas, pocos falsos positivos. Suficiente para WCAG 2.1 A. | ✓ |
| Strict | Reglas mas agresivas. Mas catches pero mas falsos positivos. | |
| Recommended + cherry-pick | Empezar con recommended, anadir 2-3 reglas de strict. | |

**User's choice:** Recommended (Recomendado)

### Pregunta 2: eslint-plugin-jsdoc

| Option | Description | Selected |
|--------|-------------|----------|
| Solo require-jsdoc | Enforzar existencia de JSDoc en funciones exportadas. No validar formato interno. | ✓ |
| require-jsdoc + require-param | Validar existencia + que @param coincida con parametros reales. | |
| Recomendado completo | Preset recommended completo. Valida tags, tipos, descripciones. Ruidoso sin TS. | |

**User's choice:** Solo require-jsdoc (Recomendado)

---

## Claude's Discretion

- ARIA mecanico: ProgressBar, AlertList, StatCard, SVGs decorativos
- JSDoc faltante en 4 pages
- Orden de ejecucion de tareas

## Deferred Ideas

None — discussion stayed within phase scope.
