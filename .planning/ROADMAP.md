# Roadmap: NovAttend

## Milestones

- ✅ **v1.0 Mejoras Post-Auditoria (Olas 1-3)** — Phases 1-3 (shipped 2026-03-31)
- 🚧 **v1.1 Hardening (Olas 4-5)** — Phases 4-6 (in progress)

## Phases

<details>
<summary>✅ v1.0 Mejoras Post-Auditoria (Phases 1-3) — SHIPPED 2026-03-31</summary>

- [x] Phase 1: Estabilidad Critica (3/3 plans) — completed 2026-03-30
- [x] Phase 2: Rendimiento y Bundle (3/3 plans) — completed 2026-03-31
- [x] Phase 3: Arquitectura y Accesibilidad (3/3 plans) — completed 2026-03-31

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Hardening (Olas 4-5) (In Progress)

**Milestone Goal:** Cerrar toda la deuda tecnica identificada en la auditoria — accesibilidad WCAG 2.1, documentacion JSDoc, autenticacion server-side en Apps Script, y cobertura de tests al 60%.

- [ ] **Phase 4: Documentacion y Accesibilidad** - JSDoc en todos los archivos + WCAG 2.1 Nivel A en componentes interactivos (gap closure pending)
- [ ] **Phase 5: Cobertura de Tests** - Infraestructura de cobertura V8 + tests contra contratos A11Y estables al 60%
- [ ] **Phase 6: Seguridad Backend** - Shared secret auth en Apps Script + inyeccion de token en api.js

## Phase Details

### Phase 4: Documentacion y Accesibilidad
**Goal**: Todos los componentes, hooks, pages y utils tienen JSDoc completo y todos los elementos interactivos cumplen WCAG 2.1 Nivel A (teclado, ARIA, focus-visible)
**Depends on**: Phase 3 (v1.0 complete)
**Requirements**: DOCS-01, DOCS-02, A11Y-01, A11Y-02, A11Y-03, A11Y-04
**Success Criteria** (what must be TRUE):
  1. El CEO puede operar TeacherCard (expandir/colapsar) usando solo Tab, Enter/Space y Escape sin tocar el mouse
  2. GroupTabs responde a navegacion por teclado con roles tablist/tab y aria-selected correcto
  3. Todos los elementos interactivos muestran un focus-visible ring visible al navegar con teclado
  4. `npm run lint` pasa sin errores con eslint-plugin-jsdoc y eslint-plugin-jsx-a11y activados
  5. Cada componente, hook, page y util tiene cabecera JSDoc con @param documentados
**Plans:** 4 plans (3 complete + 1 gap closure)
Plans:
- [x] 04-01-PLAN.md — Infraestructura: focus ring global, ESLint plugins (jsx-a11y + jsdoc), JSDoc en 4 pages
- [x] 04-02-PLAN.md — ARIA mecanico: ProgressBar, StatCard, AlertList, SearchInput, SVGs decorativos
- [x] 04-03-PLAN.md — A11Y complejo: WAI-ARIA Tabs en GroupTabs + keyboard en TeacherCard
- [x] 04-04-PLAN.md — Gap closure: 9 errores jsx-a11y restantes (StudentRow, Modal, DashboardPage, ConvocatoriaSelector)
**UI hint**: yes

### Phase 5: Cobertura de Tests
**Goal**: La cobertura de tests llega y permanece en >= 60% con thresholds enforzados automaticamente, con tests que verifican los contratos ARIA establecidos en Phase 4
**Depends on**: Phase 4
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. `npm test -- --coverage` completa sin error (proveedor @vitest/coverage-v8 instalado)
  2. El build falla automaticamente si la cobertura baja del 60% (thresholds en vite.config.js)
  3. AttendancePage y DashboardPage tienen tests que verifican sus flujos criticos de negocio
  4. TeacherCard y GroupTabs tienen tests con aserciones ARIA que confirman el trabajo de Phase 4
  5. useStudents y buildTeachersHierarchy tienen tests unitarios que protegen su logica
**Plans:** 3 plans
Plans:
- [ ] 05-01-PLAN.md — Infraestructura cobertura V8 + tests unitarios buildTeachersHierarchy y useStudents
- [ ] 05-02-PLAN.md — Tests ARIA de GroupTabs y TeacherCard (contratos Phase 4)
- [ ] 05-03-PLAN.md — Tests de integracion AttendancePage y DashboardPage + verificacion cobertura >= 60%

### Phase 6: Seguridad Backend
**Goal**: El endpoint de Google Apps Script rechaza cualquier request sin token valido, con el shared secret almacenado fuera del codigo fuente y el token inyectado transparentemente por api.js
**Depends on**: Phase 5
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06
**Success Criteria** (what must be TRUE):
  1. Un request directo al endpoint de Apps Script sin token recibe una respuesta de error (no datos)
  2. La app funciona normalmente para profesores y CEO — el token se inyecta sin cambios en la UX
  3. El API key no aparece en el codigo fuente de Apps Script ni en el bundle de produccion del frontend (solo en Script Properties y variables de entorno de Vercel)
  4. Los requests rechazados generan una entrada de console.warn en Apps Script con timestamp
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Estabilidad Critica | v1.0 | 3/3 | Complete | 2026-03-30 |
| 2. Rendimiento y Bundle | v1.0 | 3/3 | Complete | 2026-03-31 |
| 3. Arquitectura y Accesibilidad | v1.0 | 3/3 | Complete | 2026-03-31 |
| 4. Documentacion y Accesibilidad | v1.1 | 3/4 | Gap closure | - |
| 5. Cobertura de Tests | v1.1 | 0/3 | Planned | - |
| 6. Seguridad Backend | v1.1 | 0/? | Not started | - |
