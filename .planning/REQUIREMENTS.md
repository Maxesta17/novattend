# Requirements: NovAttend

**Defined:** 2026-03-31
**Core Value:** La app debe ser estable y rapida: cero errores silenciosos, carga optimizada, PWA offline funcional.

## v1.1 Requirements

Requirements para milestone v1.1 Hardening (Olas 4-5). Cada uno mapea a fases del roadmap.

### Accesibilidad

- [ ] **A11Y-01**: Usuario puede operar TeacherCard expandible con teclado (Tab, Enter/Space, Escape)
- [ ] **A11Y-02**: Componentes interactivos tienen roles ARIA correctos (GroupTabs tablist, AlertList buttons, ProgressBar progressbar, StatCard button condicional)
- [ ] **A11Y-03**: Elementos interactivos muestran focus-visible ring al navegar con teclado
- [ ] **A11Y-04**: SVGs decorativos tienen aria-hidden y SearchInput tiene aria-label descriptivo

### Documentacion

- [ ] **DOCS-01**: Todos los componentes, hooks y pages tienen cabecera JSDoc con @param documentados
- [ ] **DOCS-02**: eslint-plugin-jsdoc configurado y pasando en `npm run lint`

### Seguridad

- [ ] **SEC-01**: Apps Script valida shared secret en doGet/doPost antes de acceder a datos
- [ ] **SEC-02**: API key almacenada en Script Properties (no hardcodeada en codigo)
- [ ] **SEC-03**: Frontend inyecta token en cada request via api.js (query param GET, body POST)
- [ ] **SEC-04**: Requests sin token valido reciben respuesta de error 401-equivalente
- [ ] **SEC-05**: Variable VITE_API_KEY configurada en .env y Vercel
- [ ] **SEC-06**: Requests rechazados se loguean en Apps Script (console.warn)

### Tests

- [ ] **TEST-01**: @vitest/coverage-v8 instalado con thresholds de 60% enforzados en vite.config.js
- [ ] **TEST-02**: AttendancePage y DashboardPage tienen tests unitarios
- [ ] **TEST-03**: TeacherCard y GroupTabs tienen tests con aserciones ARIA (jest-axe)
- [ ] **TEST-04**: useStudents y buildTeachersHierarchy tienen tests unitarios
- [ ] **TEST-05**: Cobertura total alcanza >= 60% verificada por threshold

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Seguridad Avanzada

- **SEC-ADV-01**: Credenciales de users.js migradas a verificacion server-side en Apps Script
- **SEC-ADV-02**: Rate limiting via CacheService en Apps Script

### Tests Avanzados

- **TEST-ADV-01**: Tests E2E con Playwright para flujos criticos
- **TEST-ADV-02**: Cobertura de tests al 80%+

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth2 completo para Apps Script | Requiere redirect URIs, token refresh — over-engineered para 8 usuarios internos |
| Migracion credenciales users.js a server-side | Rearquitectura completa de auth — diferida a v1.2 como decision explicita |
| Tests E2E (Playwright/Cypress) | Tests unitarios/integracion cubren flujos criticos con menor overhead |
| 100% cobertura | Relacion costo/beneficio desfavorable para 8 usuarios internos |
| Rate limiting Apps Script | Complejidad desproporcionada para 8 usuarios internos |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| A11Y-01 | Pending | Pending |
| A11Y-02 | Pending | Pending |
| A11Y-03 | Pending | Pending |
| A11Y-04 | Pending | Pending |
| DOCS-01 | Pending | Pending |
| DOCS-02 | Pending | Pending |
| SEC-01 | Pending | Pending |
| SEC-02 | Pending | Pending |
| SEC-03 | Pending | Pending |
| SEC-04 | Pending | Pending |
| SEC-05 | Pending | Pending |
| SEC-06 | Pending | Pending |
| TEST-01 | Pending | Pending |
| TEST-02 | Pending | Pending |
| TEST-03 | Pending | Pending |
| TEST-04 | Pending | Pending |
| TEST-05 | Pending | Pending |

**Coverage:**
- v1.1 requirements: 17 total
- Mapped to phases: 0
- Unmapped: 17 (pending roadmap)

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
