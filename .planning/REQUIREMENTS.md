# Requirements: NovAttend — Mejoras Post-Auditoria (Olas 1-3)

**Defined:** 2026-03-30
**Core Value:** La app debe ser estable y rapida: cero errores silenciosos, carga optimizada, PWA offline funcional.

## v1 Requirements

Requirements para este milestone. Cada uno mapea a una fase del roadmap.

### PWA / Offline

- [ ] **PWA-01**: navigateFallback cambiado de /offline.html a /index.html para que la SPA funcione offline
- [ ] **PWA-02**: Regex de runtime caching captura script.googleusercontent.com ademas de script.google.com
- [ ] **PWA-03**: Manifest PWA tiene start_url, scope, y lang="es" correctos
- [ ] **PWA-04**: Service worker usa registerType prompt (no autoUpdate) para evitar ChunkLoadError mid-session con code-splitting

### Error Handling / UX

- [ ] **ERR-01**: api.js verifica res.ok antes de parsear JSON y lanza error descriptivo si falla
- [ ] **ERR-02**: AttendancePage muestra feedback visual al usuario cuando falla guardar o cargar asistencia
- [ ] **ERR-03**: SavedPage no redirige cuando present === 0 (bug logico corregido)
- [ ] **ERR-04**: Ruta 404/NotFound muestra pagina amigable para URLs invalidas

### Rendimiento

- [ ] **PERF-01**: 4 rutas post-login usan React.lazy() + Suspense (code-splitting por ruta)
- [ ] **PERF-02**: StudentRow, TeacherCard y StatCard envueltos en React.memo con useCallback en handlers
- [ ] **PERF-03**: searchQuery en DashboardPage usa debounce (300ms) para evitar re-renders por keystroke
- [ ] **PERF-04**: Vite config tiene manualChunks separando vendor-react y vendor-router
- [ ] **PERF-05**: Dashboard paraleliza getConvocatorias + getProfesores con Promise.all

### Arquitectura

- [ ] **ARCH-01**: DashboardPage refactorizado a <250 lineas extrayendo useDashboard hook y subcomponentes
- [ ] **ARCH-02**: Modal tiene focus trap (foco no escapa) y cierra con Escape

### Compliance / Limpieza

- [ ] **COMP-01**: 3 hex hardcodeados en Button, ToggleSwitch, MobileContainer reemplazados por tokens Tailwind
- [ ] **COMP-02**: index.html tiene lang="es" en lugar de lang="en"
- [ ] **COMP-03**: npm audit fix resuelve vulnerabilidades conocidas

## v2 Requirements

Diferidos a milestone futuro. Trackeados pero no en roadmap actual.

### Accesibilidad

- **A11Y-01**: Soporte de teclado completo en TeacherCard expandible (tabIndex, onKeyDown)
- **A11Y-02**: Atributos ARIA en componentes clave (labels, roles, live regions)

### Documentacion

- **DOCS-01**: JSDoc en 11 componentes faltantes

### Seguridad (Ola 4)

- **SEC-01**: Endpoint de login en Apps Script (doPost) con verificacion server-side
- **SEC-02**: Token de sesion server-side (no passwords en bundle)
- **SEC-03**: API key/token en todos los endpoints de Apps Script
- **SEC-04**: ProtectedRoute con validacion server-side
- **SEC-05**: Headers de seguridad en vercel.json (CSP, X-Frame)
- **SEC-06**: Eliminar src/config/users.js

### Tests (Ola 5)

- **TEST-01**: Tests para hooks useStudents y useConvocatorias
- **TEST-02**: Tests para AttendancePage y DashboardPage
- **TEST-03**: Tests para Modal, Avatar, ProgressBar

## Out of Scope

| Feature | Reason |
|---------|--------|
| Migracion a TypeScript | No solicitada, app funciona en JSX |
| Rediseno visual | UI score 9.0/10, no necesita cambios |
| Background Sync (IndexedDB queue) | Complejidad alta, 8 usuarios internos no lo justifican |
| React Compiler (auto-memo) | Requiere babel plugin + rolldown, no justificado para 3 componentes |
| Toast library (react-hot-toast) | Viola patron zero-external-UI, banner inline es suficiente |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PWA-01 | — | Pending |
| PWA-02 | — | Pending |
| PWA-03 | — | Pending |
| PWA-04 | — | Pending |
| ERR-01 | — | Pending |
| ERR-02 | — | Pending |
| ERR-03 | — | Pending |
| ERR-04 | — | Pending |
| PERF-01 | — | Pending |
| PERF-02 | — | Pending |
| PERF-03 | — | Pending |
| PERF-04 | — | Pending |
| PERF-05 | — | Pending |
| ARCH-01 | — | Pending |
| ARCH-02 | — | Pending |
| COMP-01 | — | Pending |
| COMP-02 | — | Pending |
| COMP-03 | — | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 0
- Unmapped: 18 ⚠️

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after initial definition*
