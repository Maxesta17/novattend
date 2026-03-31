# Phase 2: Rendimiento y Bundle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 02-rendimiento-y-bundle
**Areas discussed:** Prompt de actualizacion SW, Fallback de carga (Suspense), Feedback visual del debounce

---

## Prompt de actualizacion SW

### Pregunta 1: Como debe verse el aviso?

| Option | Description | Selected |
|--------|-------------|----------|
| Banner inferior | Barra fija en parte inferior, texto + boton Actualizar. No bloquea interaccion. | ✓ |
| Banner superior | Similar pero arriba, debajo del header. Mas visible, empuja contenido. | |
| Modal centrado | Dialogo modal que requiere accion. Mas intrusivo. | |

**User's choice:** Banner inferior (Recomendado)
**Notes:** Patron comun en PWAs, no intrusivo.

### Pregunta 2: Si el profesor ignora el banner?

| Option | Description | Selected |
|--------|-------------|----------|
| Persistente | Se queda visible, sin boton X. Solo desaparece al pulsar Actualizar. | ✓ |
| Descartable con recordatorio | Boton X para cerrar, reaparece al navegar. | |
| Tu decides | Claude elige segun patron existente. | |

**User's choice:** Persistente (Recomendado)
**Notes:** Garantiza que eventualmente actualice.

---

## Fallback de carga (Suspense)

### Pregunta 1: Que ven los profesores mientras carga?

| Option | Description | Selected |
|--------|-------------|----------|
| Spinner branded | Circulo animado burgundy/gold centrado, texto "Cargando..." | ✓ |
| Logo + spinner | Logo NovAttend con spinner debajo. Mas branded. | |
| Flash minimo | Solo bg-dark-bg vacio. Carga es rapida, no mostrar nada. | |

**User's choice:** Spinner branded (Recomendado)
**Notes:** Simple, consistente con design system.

### Pregunta 2: Componente o inline?

| Option | Description | Selected |
|--------|-------------|----------|
| Componente LoadingSpinner | Nuevo en src/components/ui/. Reutilizable. | ✓ |
| Inline en App.jsx | Div con spinner CSS directamente en fallback. | |
| Tu decides | Claude elige segun patron del codebase. | |

**User's choice:** Componente LoadingSpinner (Recomendado)
**Notes:** Sigue patron de ui/ (componente puro).

---

## Feedback visual del debounce

### Pregunta 1: Que ve el CEO durante el debounce?

| Option | Description | Selected |
|--------|-------------|----------|
| Silencioso | Sin indicador. 300ms imperceptible, lista se filtra directo. | ✓ |
| Texto 'Buscando...' | Texto sutil debajo del input durante debounce. | |
| Opacity reducida | Lista al 50% opacity durante debounce. | |

**User's choice:** Silencioso (Recomendado)
**Notes:** Menos complejidad, mas limpio. 300ms es imperceptible.

---

## Claude's Discretion

- PERF-02 (memoizacion): React.memo + useCallback — implementacion mecanica
- PERF-04 (manualChunks): vendor split en Vite — implementacion mecanica
- PERF-05 (Promise.all): Paralelizar API en Dashboard — implementacion mecanica

## Deferred Ideas

None — discussion stayed within phase scope.
