# Auditoria de Codigo — NovAttend

**Fecha:** 2026-03-30
**Modo:** /analyze_code (Modo 1) — Analisis profundo
**Alcance:** `src/` completo + configuracion
**Profundidad:** deep

---

## CRITICO (Bloquea deploy)

### 1. API sin verificacion de HTTP status
- **Archivo:** `src/services/api.js:27`
- **Problema:** `apiGet()` y `apiPost()` no verifican `res.ok` antes de parsear JSON. Un HTTP 500 que devuelva HTML crasheara `res.json()`
- **Fix:** Agregar `if (!res.ok) throw new Error(\`HTTP \${res.status}\`)` antes de `res.json()`

### 2. DashboardPage excede limite de lineas
- **Archivo:** `src/pages/DashboardPage.jsx`
- **Problema:** 272 lineas — viola el limite de 250 lineas de CLAUDE.md (excede por 22)
- **Fix:** Extraer logica a hooks custom o partir en subcomponentes

### 3. API URL expuesta en control de versiones
- **Archivo:** `.env`
- **Problema:** URL de Google Apps Script hardcodeada y visible en git
- **Fix:** Agregar `.env` a `.gitignore`, usar variables de entorno del hosting (Vercel/Netlify)

---

## ALTO (Corregir pronto)

### 4. Catch vacio al guardar asistencia
- **Archivo:** `src/pages/AttendancePage.jsx:60`
- **Problema:** `catch` vacio — el usuario no recibe feedback si falla el guardado. Solo hace `setSaving(false)` y `return`
- **Fix:** Agregar estado de error y mostrarlo en la UI

### 5. ESLint disable incorrecto en useStudents
- **Archivo:** `src/hooks/useStudents.js:116`
- **Problema:** `eslint-disable-line react-hooks/exhaustive-deps` — deberia incluir `[convocatoria, profesorId]`. Si cambian tras mount, los datos quedan stale
- **Fix:** Agregar dependencias correctas o documentar por que se omiten intencionalmente

### 6. Prefetch ignora flag cancelled
- **Archivo:** `src/hooks/useStudents.js:105-110`
- **Problema:** Prefetch de G2-G4 escribe en `cacheRef.current` sin verificar `cancelled`. Escribe en cache tras unmount
- **Fix:** Verificar `if (!cancelled)` antes de escribir en cache

### 7. Bug logico en SavedPage — present === 0
- **Archivo:** `src/pages/SavedPage.jsx:12`
- **Problema:** `!state.present` redirige si `present === 0` (falsy). Con 0 alumnos presentes, la pagina redirige incorrectamente
- **Fix:** Cambiar a `state.present === undefined`

### 8. Hex hardcodeado en Button
- **Archivo:** `src/components/ui/Button.jsx:32`
- **Problema:** `#CCCCCC` hardcodeado — viola regla de design system
- **Fix:** Usar `bg-gray-300` o crear token en `tailwind.config.js`

### 9. Hex hardcodeado en ToggleSwitch
- **Archivo:** `src/components/ui/ToggleSwitch.jsx:22`
- **Problema:** `#CDCDCD` hardcodeado — viola regla de design system
- **Fix:** Usar `bg-gray-300` o crear token en `tailwind.config.js`

### 10. Hex hardcodeado en MobileContainer
- **Archivo:** `src/components/MobileContainer.jsx:15`
- **Problema:** `#111111` hardcodeado — existe token `bg-dark-bg` en Tailwind config
- **Fix:** Reemplazar con clase Tailwind `bg-dark-bg`

### 11. JSDoc faltante en 11 archivos
- **Archivos afectados:**
  - `src/components/features/AlertList.jsx`
  - `src/components/features/StudentDetailPopup.jsx`
  - `src/components/features/StudentRow.jsx`
  - `src/components/features/TeacherCard.jsx`
  - `src/pages/AttendancePage.jsx`
  - `src/pages/ConvocatoriaPage.jsx`
  - `src/pages/DashboardPage.jsx`
  - `src/pages/LoginPage.jsx`
  - `src/pages/SavedPage.jsx`
  - `src/components/ErrorBoundary.jsx`
  - `src/components/ProtectedRoute.jsx`
- **Problema:** CLAUDE.md requiere JSDoc obligatorio en cabecera de componentes
- **Fix:** Agregar bloque JSDoc con descripcion y `@param` para props

---

## MEDIO (Mejorar calidad)

### 12. Promise.race sin limpieza de timeout
- **Archivo:** `src/pages/LoginPage.jsx:43`
- **Problema:** `Promise.race` con timeout manual no limpia el `setTimeout` si gana `getConvocatorias()`
- **Fix:** Guardar referencia del timeout y limpiarlo con `clearTimeout`

### 13. Catch silencioso en StudentDetailPopup
- **Archivo:** `src/components/features/StudentDetailPopup.jsx:62`
- **Problema:** `catch` silencioso — setea `[]` sin informar al usuario del error API
- **Fix:** Agregar estado de error y mostrarlo en el popup

### 14. Sin ruta 404/NotFound
- **Archivo:** `src/App.jsx`
- **Problema:** URLs no definidas muestran pagina en blanco. No hay ruta catch-all
- **Fix:** Agregar `<Route path="*" element={<NotFound />} />`

### 15. formatDate sin validacion
- **Archivo:** `src/pages/ConvocatoriaPage.jsx:19`
- **Problema:** `formatDate` no valida que `dateStr` sea formato `yyyy-MM-dd`. Un string malformado falla silenciosamente
- **Fix:** Agregar validacion basica o try-catch

### 16. Mock data no determinista
- **Archivo:** `src/config/teachers.js:65`
- **Problema:** `Math.random()` genera datos diferentes en cada carga. Inconsistente para testing y debugging
- **Fix:** Usar seed fijo o datos estaticos

### 17. Cache de Google Fonts demasiado agresivo
- **Archivo:** `vite.config.js`
- **Problema:** Google Fonts cache configurado a 1 anio — demasiado agresivo
- **Fix:** Reducir maxAgeSeconds o usar strategy menos agresiva

### 18. Dependencias TypeScript innecesarias
- **Archivo:** `package.json`
- **Problema:** `@types/react` y `@types/react-dom` instalados pero el proyecto no usa TypeScript
- **Fix:** `npm uninstall @types/react @types/react-dom`

### 19. Inline style no documentado
- **Archivo:** `src/pages/ConvocatoriaPage.jsx:54`
- **Problema:** 4 instancias de `style={{}}` pero CLAUDE.md documenta solo 3. Esta 4ta no esta registrada
- **Fix:** Documentar en CLAUDE.md o buscar alternativa Tailwind

---

## BAJO (Polish)

### 20. setTimeout sin cleanup en LoginPage
- **Archivo:** `src/pages/LoginPage.jsx:24`
- **Problema:** `setTimeout` de animacion shake sin cleanup en unmount — potencial memory leak menor
- **Fix:** Guardar ref y limpiar en return de useEffect

### 21. Hex hardcodeados en offline.html
- **Archivo:** `public/offline.html`
- **Problema:** `#800000`, `#C5A059`, `#1a1a2e` hardcodeados en estilos inline
- **Fix:** Usar CSS variables para mantener consistencia con design system

### 22. Sin code-splitting (React.lazy)
- **Archivo:** `src/App.jsx`
- **Problema:** Las 5 paginas se importan estaticamente. ~15-20KB recuperables con lazy loading
- **Fix:** `const DashboardPage = React.lazy(() => import('./pages/DashboardPage'))`

### 23. Sin PropTypes
- **Problema:** Ningun componente valida props con PropTypes
- **Status:** Aceptable para prototipo, pero riesgo en escalado

---

## COBERTURA DE TESTS

| Categoria | Total | Con test | Cobertura |
|-----------|-------|----------|-----------|
| Paginas | 5 | 2 | 40% |
| UI Components | 8 | 3 | 38% |
| Feature Components | 7 | 2 | 29% |
| Hooks | 2 | 0 | 0% |
| Servicios | 1 | 1 | 100% |
| **Total** | **23** | **8** | **35%** |

### Componentes sin tests:
- `AlertList.jsx`, `Avatar.jsx`, `ConvocatoriaSelector.jsx`
- `ErrorBoundary.jsx`, `GroupTabs.jsx`, `MobileContainer.jsx`
- `Modal.jsx`, `PageHeader.jsx`, `ProgressBar.jsx`
- `SearchInput.jsx`, `StudentDetailPopup.jsx`, `TeacherCard.jsx`
- `ToggleSwitch.jsx`
- `AttendancePage.jsx`, `DashboardPage.jsx`, `SavedPage.jsx`
- `useConvocatorias.js`, `useStudents.js`

---

## POSITIVO (Sin problemas)

- **0 archivos huerfanos** — todos los componentes se importan y usan
- **0 dependencias circulares** detectadas
- **0 imports rotos** — todo resuelve correctamente
- **Rutas correctas** — todas las navegaciones apuntan a rutas existentes
- **Separacion de capas** bien estructurada: `config/ -> services/ -> hooks/ -> pages/`
- **ProtectedRoute** funcional con validacion de rol
- **Tailwind tokens** bien configurados en `tailwind.config.js`
- **PWA** funcional con precache y runtime caching

---

## TOP 5 FIXES PRIORITARIOS

1. Agregar `if (!res.ok)` en `src/services/api.js` — evita crash silencioso
2. Partir `DashboardPage.jsx` — bajar de 272 a <250 lineas
3. Fix `SavedPage.jsx:12` — `present === 0` redirige incorrectamente (bug logico)
4. Reemplazar hex hardcodeados en Button, ToggleSwitch y MobileContainer
5. Agregar feedback de error en `AttendancePage.jsx:60` — el usuario no sabe si fallo

---

## RESUMEN

| Severidad | Cantidad |
|-----------|----------|
| Critico | 3 |
| Alto | 8 |
| Medio | 8 |
| Bajo | 4 |
| **Total** | **23** |

**Veredicto:** Codebase bien estructurado pero con gaps de seguridad (API sin validacion HTTP), un bug logico real (SavedPage present=0), y deuda tecnica en tests (35% cobertura). Los 3 criticos deben resolverse antes de cualquier deploy a produccion.
