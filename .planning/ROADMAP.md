# Roadmap: NovAttend — Mejoras Post-Auditoria (Olas 1-3)

## Overview

Tres fases derivadas directamente de las tres olas de la auditoria. La Fase 1 corrige bugs criticos que hacen que la PWA sea no-confiable en produccion — nada de Ola 2 u Ola 3 tiene valor sobre una base rota. La Fase 2 entrega las optimizaciones de rendimiento, con PWA-04 (registerType: prompt) como prerequisito que debe desplegarse antes de que el code-splitting llegue a produccion. La Fase 3 cierra con el refactor de arquitectura y accesibilidad de mayor superficie de codigo, ejecutado con Olas 1 y 2 ya verificadas.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Estabilidad Critica** - Corregir bugs de PWA, API y UX que hacen la app no-confiable (completed 2026-03-30)
- [x] **Phase 2: Rendimiento y Bundle** - Code-splitting, memoizacion, debounce y paralelizacion de API (completed 2026-03-31)
- [ ] **Phase 3: Arquitectura y Accesibilidad** - Refactor DashboardPage + Modal accesible con focus trap

## Phase Details

### Phase 1: Estabilidad Critica
**Goal**: La app es confiable en produccion — la PWA funciona offline, los errores son visibles al usuario, el codigo cumple con CLAUDE.md
**Depends on**: Nothing (first phase)
**Requirements**: PWA-01, PWA-02, PWA-03, ERR-01, ERR-02, ERR-03, ERR-04, COMP-01, COMP-02, COMP-03
**Success Criteria** (what must be TRUE):
  1. Un profesor con modo avion activado puede navegar a /attendance y ver los alumnos del ultimo cache (PWA offline real, no pantalla en blanco)
  2. Cuando la API falla al guardar asistencia, el profesor ve un mensaje de error especifico — no una pantalla en blanco ni una excepcion silenciosa
  3. SavedPage muestra el resumen de asistencia correctamente aunque el conteo de presentes sea 0
  4. Una URL invalida (ej: /foo) muestra una pagina 404 amigable con enlace de regreso al login
  5. El build pasa `npm run lint` sin errores y cero estilos inline — todos los hex hardcodeados reemplazados por tokens Tailwind
**Plans:** 3/3 plans complete
Plans:
- [x] 01-01-PLAN.md — Compliance: token disabled, hex replacements, index.html metadata, npm audit
- [x] 01-02-PLAN.md — Error handling: api.js res.ok, ErrorBanner, useStudents loadError, SavedPage bug
- [x] 01-03-PLAN.md — 404 page + PWA config: NotFoundPage, navigateFallback, regex, manifest

### Phase 2: Rendimiento y Bundle
**Goal**: El bundle inicial se reduce ~27% (60KB gzip) para teachers, las listas son fluidas bajo carga, y el Service Worker no rompe sesiones activas al actualizarse
**Depends on**: Phase 1
**Requirements**: PWA-04, PERF-01, PERF-02, PERF-03, PERF-04, PERF-05
**Success Criteria** (what must be TRUE):
  1. El chunk inicial (LoginPage) mide ~60KB gzipped (< 150KB Lighthouse) — vendor-router separado y cacheable; vendor-react permanece en chunk principal (limitacion React 19 ESM + Vite 7)
  2. Cuando un Service Worker nuevo esta disponible mid-session, el profesor ve un prompt de actualizacion — no pierde el estado de asistencia que tiene en pantalla
  3. El Dashboard carga y muestra datos completos en menos tiempo que antes — getProfesores y getResumen se ejecutan en paralelo con Promise.all
  4. Escribir en el campo de busqueda del Dashboard no causa lag visible — el debounce absorbe los keystrokes rapidos
**Plans:** 3/3 plans complete
**UI hint**: yes
Plans:
- [x] 02-01-PLAN.md — PWA-04: registerType prompt + UpdateBanner + useRegisterSW en main.jsx
- [x] 02-02-PLAN.md — Code-splitting: React.lazy + Suspense + LoadingSpinner + manualChunks vendor
- [x] 02-03-PLAN.md — Optimizacion: React.memo + debounce busqueda + useCallback handlers

### Phase 3: Arquitectura y Accesibilidad
**Goal**: DashboardPage cumple el limite de 250 lineas de CLAUDE.md y el Modal es operable sin raton (focus trap + Escape)
**Depends on**: Phase 2
**Requirements**: ARCH-01, ARCH-02
**Success Criteria** (what must be TRUE):
  1. DashboardPage.jsx tiene menos de 250 lineas y toda la logica vive en useDashboard.js — el archivo es legible sin scroll
  2. Al abrir un modal, el foco queda atrapado dentro — Tab no escapa al fondo y Escape cierra el modal
  3. El refactor de DashboardPage no rompe ningun test existente — los 79 tests pasan en verde tras la Fase 3
**Plans:** 3 plans
Plans:
- [ ] 03-00-PLAN.md — Wave 0: test stubs para useDashboard, useFocusTrap, y Modal ARIA
- [ ] 03-01-PLAN.md — Extraer useDashboard hook — DashboardPage a puro JSX orquestador (<250 lineas)
- [ ] 03-02-PLAN.md — Focus trap + ARIA en Modal — useFocusTrap hook + ariaLabel en consumidores

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Estabilidad Critica | 3/3 | Complete   | 2026-03-30 |
| 2. Rendimiento y Bundle | 3/3 | Complete | 2026-03-31 |
| 3. Arquitectura y Accesibilidad | 0/3 | In progress | - |
