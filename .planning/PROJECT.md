# NovAttend — Sistema de Control de Asistencia

## What This Is

Sistema de control de asistencia para LingNova Academy. PWA mobile-first usada por 7 profesores y 1 CEO. Shipped v1.0 con estabilidad critica, rendimiento optimizado y arquitectura accesible.

## Core Value

La app debe ser estable y rapida: cero errores silenciosos, carga optimizada, y la funcionalidad offline que la PWA promete debe funcionar de verdad.

## Current Milestone: v1.1 Hardening (Olas 4-5)

**Goal:** Cerrar toda la deuda tecnica identificada en la auditoria — accesibilidad, documentacion, seguridad backend y cobertura de tests.

**Target features:**
- Soporte de teclado en TeacherCard expandible (A11Y)
- Atributos ARIA en componentes clave (A11Y)
- JSDoc en 11 componentes faltantes (DOCS)
- Autenticacion server-side en Apps Script (SEC)
- Subir cobertura de tests a 60% (TEST)

## Current State

**Phase 06 complete (2026-04-05)** — Autenticacion server-side con shared secret en Apps Script + inyeccion de API key en frontend.

- **Stack:** React 19 + Vite 7 + Tailwind 3 + vite-plugin-pwa + Google Apps Script
- **Bundle:** Code-split por ruta (62KB gzip main, vendors separados)
- **Tests:** 131 tests, 22 suites (Vitest + Testing Library + @vitest/coverage-v8)
- **Cobertura:** Statements 64%, Branches 62%, Functions 62%, Lines 67% — thresholds 60% enforzados
- **Lint:** 0 errores, 0 warnings (jsx-a11y + jsdoc plugins activos)
- **A11Y:** Focus-visible global, WAI-ARIA Tabs, keyboard nav en TeacherCard, HTML semantico
- **JSDoc:** Todos los componentes, hooks y pages documentados
- **PWA:** Offline funcional, SW prompt mode, UpdateBanner
- **Deployment:** Vercel (frontend) + Google Apps Script (backend)

## Requirements

### Validated

- ✓ Login con roles teacher/ceo — existing
- ✓ Marcar asistencia por grupo/convocatoria — existing
- ✓ Dashboard CEO con estadisticas — existing
- ✓ PWA con precache del app shell — existing
- ✓ Selector de convocatorias multiples — existing
- ✓ Backend Google Apps Script con endpoints REST — existing
- ✓ Guardias de ruta por rol — existing
- ✓ PWA offline funcional (navigateFallback + regex cache) — v1.0
- ✓ Error handling visible (ErrorBanner + api.js res.ok) — v1.0
- ✓ SavedPage present===0 bug fix — v1.0
- ✓ Pagina 404 branded — v1.0
- ✓ Compliance Tailwind (tokens, lang="es", npm audit) — v1.0
- ✓ Code-splitting React.lazy + Suspense (4 rutas) — v1.0
- ✓ React.memo + debounce + useCallback optimizations — v1.0
- ✓ SW registerType prompt + UpdateBanner — v1.0
- ✓ DashboardPage refactorizado a <250 lineas (useDashboard hook) — v1.0
- ✓ Modal accesible con focus trap + Escape + ARIA — v1.0
- ✓ Soporte de teclado en TeacherCard expandible — Validated in Phase 04
- ✓ Atributos ARIA en componentes clave (tabs, buttons, dialogs) — Validated in Phase 04
- ✓ JSDoc en todos los componentes, hooks y pages — Validated in Phase 04
- ✓ Focus-visible ring global + HTML semantico (0 errores jsx-a11y) — Validated in Phase 04

### Active

- ✓ Autenticacion server-side en Apps Script (SEC-01..SEC-06) — Validated in Phase 06
- ✓ Subir cobertura de tests a 60% (TEST-01..TEST-05) — Validated in Phase 05

### Out of Scope

- Migracion a TypeScript — no solicitada, app funciona en JSX
- Rediseno visual — UI score 9.0/10, no necesita cambios
- Background Sync (IndexedDB queue) — complejidad alta, 8 usuarios internos no lo justifican

## Constraints

- **Stack:** React 19 + Vite 7 + Tailwind 3 — no cambiar framework
- **Atomicidad:** Max 250 lineas por archivo (regla CLAUDE.md)
- **Estilos:** Cero inline styles, solo Tailwind tokens
- **Idioma:** UI/comentarios en espanol, codigo en ingles
- **Mobile-first:** Max-width 430px, no romper layout existente

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Olas 1-3 primero, 4-5 despues | 80% de mejoras funcionales con ~19h vs 42h totales | ✓ Good — shipped v1.0 en 2 dias |
| No tocar backend Apps Script | Seguridad requiere cambios complejos en Code.gs, se difiere | ✓ Good — scope controlado |
| Priorizar estabilidad + rendimiento | Bugs silenciosos y carga lenta son lo que mas impacta a usuarios | ✓ Good — 0 bugs criticos, bundle split |
| Hook extraction vs subcomponents | DashboardPage solo necesita hook, no subcomponentes JSX | ✓ Good — 127 lineas sin fragmentar JSX |
| Custom focus trap vs libreria | Zero dependencias externas, hook reutilizable de 81 lineas | ✓ Good — sin bloat |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-04-05 after Phase 06 completion*

## Milestone v1.2 — Migracion a Supabase + Panel de Administracion (en curso, 2026-10-01)

**Por que ahora.** La app empezo a dar fallos visibles para los profesores y para
Aurora. El diagnostico del 2026-09-23 encontro dos causas distintas, y ninguna
era "Google Sheets va lento":

1. **Latencia del borde de Apps Script.** El backend responde en 1-2s medido
   desde dentro de Google y en 14-45s desde fuera, que es por donde entra el
   profesor. Medido de nuevo el 23/09 tras desplegar: 2,6s / 23,9s / 1,5s en el
   mismo minuto. No se arregla desde el codigo: solo saliendo de Apps Script.
2. **La hoja es a la vez base de datos e interfaz de Aurora, y las dos mitades
   se desincronizan.** Las pestanas de grupo de abril fueron renombradas a mano
   anadiendo " B1"/" B2", y ese espacio rompe el patron que dispara la
   sincronizacion: **6 de 11 pestanas no guardan nada**. Aurora escribia alumnos
   que la app no veia jamas, y las estadisticas de esas hojas no se actualizaban
   nunca porque el codigo busca un nombre de pestana que no existe y hace
   `return` en silencio.

**Decisiones tomadas.**
- Destino: **Supabase** (Postgres gestionado).
- Corte **por fases**, endpoint a endpoint, con Apps Script vivo de respaldo.
  7 profesores usan la app a diario: ningun dia sin poder pasar lista.
- Aurora pasa a **usuario propio con rol admin** y panel web que sustituye su
  trabajo en la hoja. Revierte la decision de julio de darle las credenciales
  del CEO: va a poder cambiar datos que lee el CEO, y eso tiene que quedar firmado.
- Se migra tambien la capa operativa: auth, 13 endpoints, 4 tareas automaticas
  y las alertas.

**Lo que las respuestas de Aurora (2026-10-01) anadieron al alcance.**
- La participacion de profesores en una convocatoria debe ser **explicita**. La
  regla "todos los profesores participan en todas las convocatorias activas"
  que CLAUDE.md da por buena es **falsa**: el codigo crea 4 grupos por cada
  profesor activo (36 pestanas) y Aurora las borra una a una.
- Hacen falta **alumnos sin grupo** (clase particular 1 a 1). Hoy el modelo lo
  prohibe, y por eso Aurora dice que "esta app no me sirve para las clases privadas".
- Hay que **cerrar el vocabulario** antes de disenar: Aurora llama "convocatoria"
  a lo que el sistema llama grupo-de-un-profesor.

**Regla de seguridad del milestone.** Rama `feat/migracion-supabase` y
**prohibido `clasp push`** mientras dure. Apps Script no tiene ramas: un push
entra en produccion al instante porque los triggers ejecutan HEAD. La rama de git
protege el frontend, no el backend.

**Fuera de alcance, a proposito.** Los parches sobre la hoja (prefijo de las
pestanas, convocatoria duplicada, fechas de fin). Decision del usuario el
2026-10-01: "no arregles nada, vamos a migrar todo". La verificacion de datos
entra DENTRO de la migracion, como paso previo al volcado: lo que no este en
ALUMNOS no existe y no viajara solo.
