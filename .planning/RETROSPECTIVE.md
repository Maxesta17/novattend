# Retrospective

## Milestone: v1.0 — Mejoras Post-Auditoria (Olas 1-3)

**Shipped:** 2026-03-31
**Phases:** 3 | **Plans:** 9 | **Requirements:** 18/18

### What Was Built

- PWA offline funcional con navigateFallback, regex cache, y manifest correcto
- Error handling visible con ErrorBanner y api.js res.ok validation
- Code-splitting por ruta (React.lazy + Suspense) con vendor split
- React.memo + debounce + useCallback para renders fluidos
- SW registerType prompt con UpdateBanner
- DashboardPage refactorizado de 247 a 127 lineas via useDashboard hook
- Modal accesible con focus trap custom y ARIA completo
- Pagina 404 branded, compliance Tailwind, npm audit fix

### What Worked

- **Research antes de planificar** — cada fase tuvo RESEARCH.md que identifico pitfalls criticos antes de escribir codigo (ej: registerType prompt antes de code-splitting, focus-trap-react bugs en iOS)
- **Wave-based execution** — Wave 0 con test stubs RED permitio que Wave 1 (implementacion) tuviera contratos claros
- **Parallel execution con worktree isolation** — planes independientes (03-01 y 03-02) ejecutados en paralelo sin conflictos
- **Plans detallados con must_haves y key_links** — verificacion automatizada contra el codebase real

### What Was Inefficient

- **Summary extraction falló** — el CLI no extrajo one-liners correctamente de varios SUMMARY.md, requiriendo edicion manual de MILESTONES.md
- **State tracking drift** — STATE.md acumulo datos inconsistentes (percent: 0 con 9/9 plans complete) que tuvieron que corregirse manualmente

### Patterns Established

- Test stubs RED como Wave 0 antes de implementacion
- Hook extraction para pages que rozan el limite de 250 lineas
- Custom hooks sin dependencias externas para funcionalidad browser (focus trap)
- eslint-disable blocks para test stubs de modulos que aun no existen

### Key Lessons

- registerType: prompt es mandatory antes de code-splitting en PWA — deploy en orden inverso causa ChunkLoadError
- React 19 ESM + Vite 7 genera vendor-react chunk vacio — comportamiento esperado, no es un bug
- renderHook de Testing Library no adjunta refs al DOM — necesita componente auxiliar para testear hooks con useRef

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 3 |
| Plans | 9 |
| Requirements | 18 |
| Tests start → end | 19 → 89 |
| Files changed | 49 |
| Lines +/- | +5609/-259 |
