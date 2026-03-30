# NovAttend — Mejoras Post-Auditoria (Olas 1-3)

## What This Is

Ciclo de mejoras para NovAttend basado en una auditoria completa de codigo, rendimiento, PWA, seguridad y calidad. Este milestone cubre las Olas 1-3: fixes criticos, optimizacion de rendimiento y refactorizacion de arquitectura. La app es un sistema de control de asistencia para LingNova Academy, usada por 7 profesores y 1 CEO.

## Core Value

La app debe ser estable y rapida: cero errores silenciosos, carga optimizada, y la funcionalidad offline que la PWA promete debe funcionar de verdad.

## Requirements

### Validated

- ✓ Login con roles teacher/ceo — existing
- ✓ Marcar asistencia por grupo/convocatoria — existing
- ✓ Dashboard CEO con estadisticas — existing
- ✓ PWA con precache del app shell — existing
- ✓ Selector de convocatorias multiples — existing
- ✓ Backend Google Apps Script con endpoints REST — existing
- ✓ Guardias de ruta por rol — existing

### Active

**Ola 1 — Fixes criticos:**
- [ ] navigateFallback corregido a /index.html (PWA offline funcional)
- [ ] Bug SavedPage present===0 corregido
- [ ] api.js verifica res.ok antes de parsear JSON
- [ ] Feedback de error visible al guardar/cargar asistencia
- [ ] Regex de cache API matchea script.googleusercontent.com
- [ ] Hex hardcodeados reemplazados por tokens Tailwind
- [ ] html lang="es" + metadata PWA completa
- [ ] Vulnerabilidades npm resueltas (npm audit fix)

**Ola 2 — Rendimiento:**
- [ ] Code-splitting con React.lazy() + Suspense en rutas post-login
- [ ] React.memo en StudentRow, TeacherCard, StatCard
- [ ] Debounce en searchQuery del Dashboard
- [ ] manualChunks en Vite (vendor split)
- [ ] Paralelizar llamadas API en Dashboard (getConvocatorias + getProfesores)

**Ola 3 — Arquitectura:**
- [ ] DashboardPage refactorizado a <250 lineas (extraer hooks + subcomponentes)
- [ ] Ruta 404/NotFound agregada
- [ ] Focus trap + Escape en Modal
- [ ] Soporte de teclado en TeacherCard expandible
- [ ] JSDoc en 11 componentes faltantes

### Out of Scope

- Autenticacion server-side (Ola 4, ~15h) — requiere cambios en Apps Script backend, demasiado complejo para este milestone
- Subir cobertura de tests a 60% (Ola 5, ~8h) — incremental, se hara en milestone dedicado
- Migracion a TypeScript — no solicitada, la app funciona en JSX
- Rediseno visual — el UI score ya es 9.0/10, no necesita cambios

## Context

- **Auditoria completa:** 6 informes en `docs/auditoria/` (errores, dependencias, rendimiento, PWA, seguridad, calidad)
- **Score actual:** 7.3/10 global. Areas mas bajas: seguridad (4.5), accesibilidad (5.0), rendimiento (6.5)
- **Score objetivo post Olas 1-3:** ~8.0/10
- **Stack:** React 19 + Vite 7 + Tailwind 3 + vite-plugin-pwa + Google Apps Script
- **Bundle actual:** 271 KB monolitico (sin code-splitting)
- **DashboardPage:** 272 lineas (viola limite de 250 de CLAUDE.md)
- **Tests actuales:** 19 tests, 4 suites, ~35% cobertura
- **Deployment:** Vercel (frontend) + Google Apps Script (backend)

## Constraints

- **Stack:** React 19 + Vite 7 + Tailwind 3 — no cambiar framework
- **Atomicidad:** Max 250 lineas por archivo (regla CLAUDE.md)
- **Estilos:** Cero inline styles, solo Tailwind tokens
- **Idioma:** UI/comentarios en espanol, codigo en ingles
- **Backend:** Google Apps Script — no se toca en este milestone (Ola 4)
- **Mobile-first:** Max-width 430px, no romper layout existente

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Olas 1-3 primero, 4-5 despues | 80% de mejoras funcionales con ~19h vs 42h totales | — Pending |
| No tocar backend Apps Script | Seguridad requiere cambios complejos en Code.gs, se difiere | — Pending |
| Priorizar estabilidad + rendimiento | Bugs silenciosos y carga lenta son lo que mas impacta a usuarios | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after initialization*
