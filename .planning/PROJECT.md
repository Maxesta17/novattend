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
