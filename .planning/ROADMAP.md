# Roadmap: NovAttend

## Milestones

- ✅ **v1.0 Mejoras Post-Auditoria (Olas 1-3)** — Phases 1-3 (shipped 2026-03-31)
- ✅ **v1.1 Hardening (Olas 4-5)** — Phases 4-6 (shipped 2026-04-05)
- 🚧 **v1.2 Migracion a Supabase + Panel de Administracion** — Phases 7-14 (en curso desde 2026-10-01)

## Phases

<details>
<summary>✅ v1.0 Mejoras Post-Auditoria (Phases 1-3) — SHIPPED 2026-03-31</summary>

- [x] Phase 1: Estabilidad Critica (3/3 plans) — completed 2026-03-30
- [x] Phase 2: Rendimiento y Bundle (3/3 plans) — completed 2026-03-31
- [x] Phase 3: Arquitectura y Accesibilidad (3/3 plans) — completed 2026-03-31

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### ✅ v1.1 Hardening (Olas 4-5) (Shipped 2026-04-05)

**Milestone Goal:** Cerrar toda la deuda tecnica identificada en la auditoria — accesibilidad WCAG 2.1, documentacion JSDoc, autenticacion server-side en Apps Script, y cobertura de tests al 60%.

- [ ] **Phase 4: Documentacion y Accesibilidad** - JSDoc en todos los archivos + WCAG 2.1 Nivel A en componentes interactivos (gap closure pending)
- [ ] **Phase 5: Cobertura de Tests** - Infraestructura de cobertura V8 + tests contra contratos A11Y estables al 60%
- [ ] **Phase 6: Seguridad Backend** - Shared secret auth en Apps Script + inyeccion de token en api.js


### 🚧 v1.2 Migracion a Supabase + Panel de Administracion (en curso)

**Milestone Goal:** Sacar NovAttend de Google Apps Script y Google Sheets, y dar a Aurora un panel que sustituya su trabajo en la hoja. Un solo sitio donde viven los datos.

**REGLA DE SEGURIDAD (todas las fases):** rama `feat/migracion-supabase` y **PROHIBIDO `clasp push`** mientras dure el milestone. Apps Script no tiene ramas: un push entra en produccion al instante porque los triggers ejecutan HEAD. La rama protege el frontend (Vercel despliega desde `main`), NO el backend.

- [ ] **Phase 7: Vocabulario y modelo de dominio** - Glosario cerrado con Aurora y decision sobre las tandas. Bloquea a todas las demas (VOC-01, VOC-02)
- [ ] **Phase 8: Esquema y volcado verificado** - Postgres con restricciones + informe de descuadres ANTES de migrar un solo dato (DAT-01..05)
- [ ] **Phase 9: Autenticacion** - Contrasenas, sesiones y bloqueo por intentos, contra Supabase (API-02, ADM-01)
- [ ] **Phase 10: Ruta del profesor** - Lectura de alumnos y guardado de asistencia. Es el camino critico diario (API-01, API-03, CUT-01, CUT-02)
- [ ] **Phase 11: Dashboard del CEO** - Resumen y alertas contra el backend nuevo (API-01)
- [ ] **Phase 12: Panel de Aurora** - Alumnos, convocatorias con profesores explicitos, profesores, correccion de asistencia con auditoria (ADM-02..06)
- [ ] **Phase 13: Tareas automaticas y alertas** - Backup, canario, recordatorio y resumen del CEO, fuera de Apps Script (API-04)
- [ ] **Phase 14: Corte y retirada** - Apagado de Apps Script, rotacion de endpoint en los tres sitios, limpieza del modo simulado (CUT-03)

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
**Plans:** 2/3 plans executed
Plans:
- [x] 05-01-PLAN.md — Infraestructura cobertura V8 + tests unitarios buildTeachersHierarchy y useStudents
- [x] 05-02-PLAN.md — Tests ARIA de GroupTabs y TeacherCard (contratos Phase 4)
- [x] 05-03-PLAN.md — Tests de integracion AttendancePage y DashboardPage + verificacion cobertura >= 60%

### Phase 6: Seguridad Backend
**Goal**: El endpoint de Google Apps Script rechaza cualquier request sin token valido, con el shared secret almacenado fuera del codigo fuente y el token inyectado transparentemente por api.js
**Depends on**: Phase 5
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06
**Success Criteria** (what must be TRUE):
  1. Un request directo al endpoint de Apps Script sin token recibe una respuesta de error (no datos)
  2. La app funciona normalmente para profesores y CEO — el token se inyecta sin cambios en la UX
  3. El API key no aparece en el codigo fuente de Apps Script ni en el bundle de produccion del frontend (solo en Script Properties y variables de entorno de Vercel)
  4. Los requests rechazados generan una entrada de console.warn en Apps Script con timestamp
**Plans:** 2 plans
Plans:
- [x] 06-01-PLAN.md — Backend: validateApiKey en Codigo.js + setApiKey/checkApiKey helpers + doc de deploy
- [x] 06-02-PLAN.md — Frontend: API_KEY en config/api.js + inyeccion en services/api.js + tests SEC-03


### Phase 7: Vocabulario y modelo de dominio

**Objetivo:** cerrar como se llama cada cosa, antes de disenar una sola pantalla.

Aurora y el sistema no hablan el mismo idioma: ella llama "convocatoria" a lo que el sistema llama grupo-de-un-profesor. Dijo "cuatro de septiembre: dos de Myriam, una de Christian, una de Elisabeth" refiriendose a GRUPOS dentro de UNA convocatoria. Construir el panel sin cerrar esto produce la pantalla equivocada.

Decidir ademas si las "tandas" (`B1`/`B2` de abril) son entidad del modelo o etiqueta. Hoy existen solo como texto anadido a mano al nombre de una pestana — y eso rompe `onEdit` y las estadisticas en 6 de 11 pestanas.

**Requisitos:** VOC-01, VOC-02
**Bloquea:** todas las fases siguientes

### Phase 8: Esquema y volcado verificado

**Objetivo:** Postgres que impida por construccion los lios de hoy, y ni un dato migrado sin cuadrar.

Restricciones que hoy faltan: identificador unico de convocatoria (existen dos "septiembre 2026" porque se tecleo `SEPT2026` y `SEPT26`), alumno sin grupo permitido, participacion de profesor explicita.

El informe de descuadres es parte de la fase, no un paso previo: hay alumnos escritos en pestanas que nunca sincronizaron, y lo que no este en ALUMNOS no viajara solo.

**Requisitos:** DAT-01, DAT-02, DAT-03, DAT-04, DAT-05

### Phase 9: Autenticacion

**Objetivo:** contrasenas, sesiones y bloqueo por intentos contra Supabase, y Aurora con usuario propio de rol admin.

**Requisitos:** API-02, ADM-01

### Phase 10: Ruta del profesor

**Objetivo:** lo que usan 7 personas cada dia. Primera fase con usuarios reales encima, con Apps Script vivo de respaldo y vuelta atras probada.

Meta de latencia: por debajo de 1s en el percentil 95 medido DESDE FUERA. Linea base: 2,6s / 23,9s / 1,5s en el mismo minuto (23/09).

**Requisitos:** API-01, API-03, CUT-01, CUT-02

### Phase 11: Dashboard del CEO

**Objetivo:** resumen, alertas y seleccion de convocatoria contra el backend nuevo.

**Requisitos:** API-01

### Phase 12: Panel de Aurora

**Objetivo:** que Aurora pueda dejar la hoja. La fase mas grande del milestone.

Incluye lo que mas le duele a diario: elegir que profesores participan al crear una convocatoria, en vez de generar 4 grupos por cada profesor activo — 36 pestanas que borra una a una.

**Requisitos:** ADM-02, ADM-03, ADM-04, ADM-05, ADM-06

### Phase 13: Tareas automaticas y alertas

**Objetivo:** backup, canario, recordatorio de las 20h y resumen del CEO de los lunes, fuera de Apps Script.

**Requisitos:** API-04

### Phase 14: Corte y retirada

**Objetivo:** apagar Apps Script, rotar el endpoint en los tres sitios a la vez y retirar el modo simulado (~225 lineas que la auditoria marco y se aplazaron a proposito hasta aqui).

**Requisitos:** CUT-03

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Estabilidad Critica | v1.0 | 3/3 | Complete | 2026-03-30 |
| 2. Rendimiento y Bundle | v1.0 | 3/3 | Complete | 2026-03-31 |
| 3. Arquitectura y Accesibilidad | v1.0 | 3/3 | Complete | 2026-03-31 |
| 4. Documentacion y Accesibilidad | v1.1 | 4/4 | Complete | 2026-04-01 |
| 5. Cobertura de Tests | v1.1 | 3/3 | Complete | 2026-04-03 |
| 6. Seguridad Backend | v1.1 | 2/2 | Complete | 2026-04-05 |
