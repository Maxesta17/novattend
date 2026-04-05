# Phase 5: Cobertura de Tests - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 05-cobertura-de-tests
**Areas discussed:** Aserciones ARIA, Profundidad vs. amplitud, Mock en paginas complejas, Script de cobertura

---

## Aserciones ARIA

| Option | Description | Selected |
|--------|-------------|----------|
| Aserciones manuales | Usar getByRole, toHaveAttribute. Patron existente, cero deps nuevas. | ✓ |
| jest-axe (auditor automatico) | Instalar jest-axe + axe-core. Auditoria completa, ~2MB deps, posibles falsos positivos en jsdom. | |
| Ambos combinados | Manuales para contratos + jest-axe como red de seguridad. Mas completo pero mas lento. | |

**User's choice:** Aserciones manuales (Recomendado)
**Notes:** Consistente con el codebase existente, sin bloat de dependencias.

---

## Profundidad vs. amplitud

| Option | Description | Selected |
|--------|-------------|----------|
| Criticos primero | Priorizar AttendancePage, DashboardPage, useStudents, buildTeachersHierarchy, TeacherCard, GroupTabs. Componentes simples solo si falta para 60%. | ✓ |
| Amplitud uniforme | Tests basicos para TODOS los componentes sin test. Maximiza archivos tocados pero superficial. | |
| Por capas | Hooks/utils primero, luego features, luego pages. Orden de dependencias. | |

**User's choice:** Criticos primero (Recomendado)
**Notes:** Maximiza valor y cobertura en los flujos que mas importa proteger.

---

## Mock en paginas complejas

| Option | Description | Selected |
|--------|-------------|----------|
| Mock a nivel de servicio API | Mockear getAlumnos, getResumen, etc. Hooks reales con datos mock. Patron de LoginPage.test.jsx. | ✓ |
| Mock a nivel de hook | Mockear useStudents, useDashboard directamente. Mas aislado pero no verifica integracion. | |
| Tu decides | Claude elige segun complejidad. | |

**User's choice:** Mock a nivel de servicio API (Recomendado)
**Notes:** Consistente con patron existente, verifica integracion hook-page.

---

## Script de cobertura

| Option | Description | Selected |
|--------|-------------|----------|
| Script dedicado test:coverage | Agregar "test:coverage" en package.json. npm test rapido, coverage bajo demanda. | ✓ |
| Cobertura siempre en npm test | Modificar test para incluir --coverage. Siempre visible pero mas lento. | |
| Solo thresholds en config | Sin script. Dev ejecuta npx manualmente. Minimalista. | |

**User's choice:** Script dedicado test:coverage (Recomendado)
**Notes:** Separacion de concerns: tests rapidos vs. verificacion de cobertura.

---

## Claude's Discretion

- Orden exacto de escritura de test files
- Datos mock especificos para cada suite
- Cantidad de tests por suite
- Inclusion de componentes simples segun % alcanzado

## Deferred Ideas

None — discussion stayed within phase scope.
