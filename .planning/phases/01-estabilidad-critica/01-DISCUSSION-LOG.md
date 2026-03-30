# Phase 1: Estabilidad Critica - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 01-estabilidad-critica
**Areas discussed:** Feedback de errores, Pagina 404, Tokens deshabilitados

---

## Feedback de errores

### Formato del error

| Option | Description | Selected |
|--------|-------------|----------|
| Banner inline | Banner rojo dentro de la pagina, arriba del contenido o junto al boton. Desaparece al reintentar. | ✓ |
| Mensaje bajo boton | Texto pequeno text-error debajo del boton de guardar, estilo validacion de formularios. | |
| Tu decides | Claude elige el patron segun contexto. | |

**User's choice:** Banner inline
**Notes:** Out of Scope descarta toast libraries. Banner inline es el patron nativo recomendado.

### Reutilizabilidad

| Option | Description | Selected |
|--------|-------------|----------|
| Componente ui/ | ErrorBanner.jsx en src/components/ui/ con props message y onDismiss. Reutilizable. | ✓ |
| Inline en cada pagina | JSX directo en AttendancePage. Mas rapido pero se duplica. | |
| Tu decides | Claude elige segun complejidad. | |

**User's choice:** Componente ui/
**Notes:** Sigue el patron existente de componentes atomicos en ui/.

---

## Pagina 404

### Nivel de elaboracion

| Option | Description | Selected |
|--------|-------------|----------|
| Branded minima | Fondo dark-bg, heading Cinzel "404" en gold, mensaje Montserrat, boton burgundy a /login. Sin animaciones. | ✓ |
| Solo texto plano | Pagina blanca, texto "404 - No encontrada", enlace de texto a /login. | |
| Tu decides | Claude elige el nivel apropiado. | |

**User's choice:** Branded minima
**Notes:** Consistente con el tema dark de la app sin sobreingenieria.

---

## Tokens deshabilitados

### Nombre del token

| Option | Description | Selected |
|--------|-------------|----------|
| disabled | Token semantico 'disabled' (#CCCCCC). bg-disabled en ambos componentes. | ✓ |
| gray con escala | Token generico 'gray-light' (#CCCCCC). Reutilizable para otros contextos. | |
| Tu decides | Claude elige el nombre mas consistente. | |

**User's choice:** disabled
**Notes:** Nombre semantico que indica el proposito. Un solo token unifica Button (#CCCCCC) y ToggleSwitch (#CDCDCD).

---

## Claude's Discretion

- Fixes mecanicos PWA-01, PWA-02, PWA-03, ERR-01, ERR-03, COMP-02, COMP-03: implementacion obvia, sin consulta necesaria.

## Deferred Ideas

None — discussion stayed within phase scope.
