# Requirements: NovAttend

**Defined:** 2026-03-31
**Core Value:** La app debe ser estable y rapida: cero errores silenciosos, carga optimizada, PWA offline funcional.

## v1.1 Requirements

Requirements para milestone v1.1 Hardening (Olas 4-5). Cada uno mapea a fases del roadmap.

### Accesibilidad

- [x] **A11Y-01**: Usuario puede operar TeacherCard expandible con teclado (Tab, Enter/Space, Escape)
- [x] **A11Y-02**: Componentes interactivos tienen roles ARIA correctos (GroupTabs tablist, AlertList buttons, ProgressBar progressbar, StatCard button condicional)
- [x] **A11Y-03**: Elementos interactivos muestran focus-visible ring al navegar con teclado
- [x] **A11Y-04**: SVGs decorativos tienen aria-hidden y SearchInput tiene aria-label descriptivo

### Documentacion

- [x] **DOCS-01**: Todos los componentes, hooks y pages tienen cabecera JSDoc con @param documentados
- [x] **DOCS-02**: eslint-plugin-jsdoc configurado y pasando en `npm run lint`

### Seguridad

- [x] **SEC-01**: Apps Script valida shared secret en doGet/doPost antes de acceder a datos
- [x] **SEC-02**: API key almacenada en Script Properties (no hardcodeada en codigo)
- [x] **SEC-03**: Frontend inyecta token en cada request via api.js (query param GET, body POST)
- [x] **SEC-04**: Requests sin token valido reciben respuesta de error 401-equivalente
- [x] **SEC-05**: Variable VITE_API_KEY configurada en .env y Vercel
- [x] **SEC-06**: Requests rechazados se loguean en Apps Script (console.warn)

### Tests

- [x] **TEST-01**: @vitest/coverage-v8 instalado con thresholds de 60% enforzados en vite.config.js
- [x] **TEST-02**: AttendancePage y DashboardPage tienen tests unitarios
- [x] **TEST-03**: TeacherCard y GroupTabs tienen tests con aserciones ARIA (aserciones manuales con Testing Library -- sin jest-axe per D-02)
- [x] **TEST-04**: useStudents y buildTeachersHierarchy tienen tests unitarios
- [x] **TEST-05**: Cobertura total alcanza >= 60% verificada por threshold

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
| A11Y-01 | Phase 4 | Complete |
| A11Y-02 | Phase 4 | Complete |
| A11Y-03 | Phase 4 | Complete |
| A11Y-04 | Phase 4 | Complete |
| DOCS-01 | Phase 4 | Complete |
| DOCS-02 | Phase 4 | Complete |
| TEST-01 | Phase 5 | Complete |
| TEST-02 | Phase 5 | Complete |
| TEST-03 | Phase 5 | Complete |
| TEST-04 | Phase 5 | Complete |
| TEST-05 | Phase 5 | Complete |
| SEC-01 | Phase 6 | Complete |
| SEC-02 | Phase 6 | Complete |
| SEC-03 | Phase 6 | Complete |
| SEC-04 | Phase 6 | Complete |
| SEC-05 | Phase 6 | Complete |
| SEC-06 | Phase 6 | Complete |

**Coverage:**
- v1.1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-04-05 -- TEST-03 updated to reflect manual ARIA assertions (no jest-axe per D-02)*

---

## v1.2 Requirements

Migracion a Supabase + Panel de Administracion. Definidos 2026-10-01.

**Core Value:** Un solo sitio donde viven los datos. Aurora y la app dejan de
leer sitios distintos, y el profesor deja de esperar 40 segundos.

**REGLA DE SEGURIDAD DEL MILESTONE (aplica a TODAS las fases):** el trabajo vive
en la rama `feat/migracion-supabase` y **esta PROHIBIDO `clasp push` mientras
dure la migracion**. Apps Script no tiene ramas: un push entra en produccion al
instante porque los triggers ejecutan HEAD. La rama de git protege el frontend
(Vercel despliega desde `main`), NO el backend. Ver [[project_repo_vs_produccion_desync]].

### Vocabulario (bloqueante: se cierra ANTES de disenar nada)

- [ ] **VOC-01**: Glosario acordado con Aurora y el dev, con un termino por concepto.
  Hoy Aurora llama "convocatoria" a lo que el sistema llama grupo-de-un-profesor:
  dijo "cuatro de septiembre: dos de Myriam, una de Christian, una de Elisabeth"
  refiriendose a GRUPOS dentro de UNA convocatoria. Sin esto se construye la
  pantalla equivocada.
- [ ] **VOC-02**: Decidir si las "tandas" (los `B1`/`B2` de abril) son una entidad
  real del modelo o solo una etiqueta. Hoy existen unicamente como texto anadido a
  mano al nombre de una pestana, y por eso rompen la sincronizacion.

### Datos y esquema

- [ ] **DAT-01**: Esquema Postgres con restricciones que impidan de raiz lo que hoy se cuela:
  identificador de convocatoria unico, y nombre+periodo no repetibles (hoy existen
  dos "septiembre 2026" porque se tecleo `SEPT2026` y `SEPT26` como prefijo).
- [ ] **DAT-02**: Un alumno puede existir SIN grupo (clase particular 1 a 1). Hoy el
  modelo lo prohibe y por eso Aurora dice que "esta app no me sirve para las
  clases privadas".
- [ ] **DAT-03**: La participacion de un profesor en una convocatoria es EXPLICITA,
  no automatica. La regla "todos los profesores participan en todas las
  convocatorias activas" que afirma CLAUDE.md es FALSA en la practica: Aurora
  borra a mano las que sobran.
- [ ] **DAT-04**: Auditoria de cambios en asistencia — quien, que y cuando. Requisito
  de quien pueda corregir lo que marco un profesor, porque cambia los numeros del CEO.
- [ ] **DAT-05**: Verificacion de datos ANTES del volcado, con informe de descuadres.
  Hay alumnos escritos en pestanas que nunca sincronizaron: lo que no este en
  ALUMNOS no existe y no viajara solo. Ningun dato se migra sin cuadrar.

### Backend

- [ ] **API-01**: Los 13 endpoints actuales funcionando contra Supabase, con la misma
  forma de respuesta que consume el frontend.
- [ ] **API-02**: Auth migrada: contrasenas, sesiones y bloqueo por intentos fallidos.
- [ ] **API-03**: Latencia por debajo de 1s en el percentil 95 medido DESDE FUERA,
  no desde dentro del proveedor. Linea base actual: 14-45s; medido el 23/09 tras
  desplegar, 2,6s / 23,9s / 1,5s en el mismo minuto.
- [ ] **API-04**: Las 4 tareas automaticas (backup, canario, recordatorio, resumen
  del CEO) y su capa de alertas, reimplantadas fuera de Apps Script.

### Panel de administracion (Aurora)

- [ ] **ADM-01**: Aurora entra con usuario propio y rol admin. Todo cambio queda
  firmado con su nombre (revierte la decision de julio de usar las credenciales del CEO).
- [ ] **ADM-02**: Alta, baja y cambio de grupo de alumnos.
- [ ] **ADM-03**: Crear y cerrar convocatorias **eligiendo que profesores participan**.
  Hoy se generan 4 grupos por cada profesor activo — 36 pestanas de golpe que
  Aurora borra una a una.
- [ ] **ADM-04**: Alta y baja de profesores, sin acceso a credenciales.
- [ ] **ADM-05**: Ver y corregir asistencia, con el rastro de DAT-04.
- [ ] **ADM-06**: Gestion de alumnos de clase particular (DAT-02).

### Corte y convivencia

- [ ] **CUT-01**: Migracion por fases, endpoint a endpoint, con Apps Script vivo como
  respaldo. Sin big bang: 7 profesores usan la app a diario y ningun dia puede
  quedarse sin poder pasar lista.
- [ ] **CUT-02**: Vuelta atras documentada y probada en cada fase.
- [ ] **CUT-03**: La rotacion de la URL del backend sigue tocando tres sitios a la vez
  (`VITE_API_URL`, Script Property `CANARIO_URL`, secret `CANARIO_PING_URL`).
  Cualquier cambio de endpoint los actualiza juntos.
