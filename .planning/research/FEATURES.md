# Feature Landscape: Mejoras Post-Auditoria (Olas 1-3)

**Dominio:** React PWA — sistema de control de asistencia interno
**Fecha:** 2026-03-30
**Confianza general:** HIGH (basado en auditoria local detallada + investigacion de patrones de ecosistema)

---

## Resumen de Contexto

NovAttend es una PWA interna usada por 7 profesores y 1 CEO administrador. El score
actual es 7.3/10. La auditoria identifico 20 problemas concretos agrupados en 5 olas.
Este documento mapea esos 20 problemas al lenguaje de features: que es imprescindible,
que es diferenciador y que debe evitarse deliberadamente.

El proyecto tiene restricciones fuertes: stack fijo (React 19 + Vite 7 + Tailwind 3),
sin cambios de backend en este milestone, mobile-first 430px, max 250 lineas por archivo.

---

## Table Stakes

Funcionalidades que los usuarios esperan de cualquier aplicacion de produccion.
Su ausencia hace que la app se sienta rota o incompleta.

| Feature | Por que es esperada | Complejidad | Estado actual | Notas |
|---------|---------------------|-------------|---------------|-------|
| Feedback de error visible al guardar | En AttendancePage el profesor necesita confirmacion o error — sin feedback la accion parece rota | Baja | FALTA (catch silencioso) | Error silencioso en pantalla critica (#7 auditoria). El profesor no sabe si la asistencia se guardo. |
| Feedback de error al cargar lista de alumnos | Lista vacia sin explicacion es indistinguible de "no hay alumnos" | Baja | FALTA (lista vacia sin mensaje) | Mismo patron — catch que pone array vacio sin mensaje de error (#7). |
| PWA navegable offline (navigateFallback correcto) | Una PWA que muestra "sin conexion" al navegar a cualquier ruta con app shell en cache no cumple su promesa | Baja | ROTA (apunta a offline.html) | Cambiar `/offline.html` a `/index.html` en workbox config. Fix de 30 minutos con impacto critico (#4). |
| Regex de cache API correcta | La estrategia NetworkFirst es inutil si no captura las respuestas reales del servidor | Baja | ROTA (regex incorrecta) | Apps Script redirige a `script.googleusercontent.com`, patron actual solo cubre `script.google.com` (#5). |
| res.ok verificado antes de parsear JSON | Parsear JSON de una respuesta HTTP 4xx/5xx lanza excepcion no controlada | Baja | FALTA en api.js | Patron basico de fetch defensivo. Una linea de if (#13). |
| html lang correcto | `lang="en"` en una app en espanol falla WCAG 3.1.1 (A), afecta lectores de pantalla y SEO | Baja | INCORRECTO (lang="en") | Cambio de 5 minutos con impacto en accesibilidad (#16). |
| Ruta 404/NotFound | SPAs sin ruta wildcard muestran pantalla en blanco para URLs invalidas — comportamiento inesperado | Baja | FALTA | React Router v7 usa path="*" como catch-all. 30 minutos (#17). |
| Metadata PWA completa (start_url, scope, lang) | Manifest incompleto reduce instalabilidad en Android y fallan algunas validaciones de Lighthouse | Baja | PARCIAL (faltan 5 campos) | start_url, scope, orientation, lang, description ausentes (#20). |
| Tokens de color del design system (sin hex hardcodeados) | 3 hex hardcodeados violan la regla de oro del proyecto y rompen consistencia al cambiar tema | Baja | 3 violaciones | Button.jsx:32, ToggleSwitch.jsx:22, MobileContainer.jsx:15 (#12). |
| Bug SavedPage present===0 corregido | Logica incorrecta redirige cuando hay 0 presentes, incluso si los datos son validos | Baja | BUG activo | Condicion `present === 0` deberia ser `!present && present !== 0` o verificar el state completo (#11). |
| Dependencias sin vulnerabilidades npm conocidas | 9 vulnerabilidades en devDeps son ruido de seguridad que pueden bloquear pipelines CI | Baja | 9 vulnerabilidades | `npm audit fix` resuelve la mayoria sin breaking changes (#18). |
| Code-splitting: no cargar todo el JS al login | 271 KB monoliticos para login es excesivo. Teacher carga Dashboard de CEO, CEO carga pantallas de teacher | Media | FALTA (monolito) | React.lazy() + Suspense en 4 rutas. Reduce first-load ~50-60% (#6). |
| Focus trap en Modal + cierre con Escape | Cualquier modal de produccion debe atrapar el foco. Sin ello los usuarios de teclado/lectores de pantalla se pierden | Media | FALTA en Modal.jsx | WCAG 2.1 SC 2.1.2 requiere mecanismo de escape. PatronFocus trap es universal (#10). |
| Soporte de teclado en TeacherCard expandible | Elemento interactivo no operado con teclado viola WCAG 2.1 SC 2.1.1 | Media | FALTA | tabIndex + onKeyDown (Enter/Space) en el elemento de expansion (#10). |

---

## Differentiators

Mejoras que elevan la calidad percibida y el score de produccion, pero que los usuarios
no identificarian como "rotas" si faltaran.

| Feature | Proposicion de valor | Complejidad | Notas |
|---------|----------------------|-------------|-------|
| React.memo en StudentRow, TeacherCard, StatCard | Elimina cascadas de re-renders en listas de 12+ alumnos. Percepcion de fluidez al marcar asistencia | Baja | StudentRow se re-renderiza 12+ veces por cambio de un alumno sin memo. Impacto observable (#8). |
| Debounce en searchQuery del Dashboard | Sin debounce, cada tecla dispara un filtrado completo de la lista de profesores. Con 300ms debounce la UI es notablemente mas suave | Baja | Patron useDebounce de ~10 lineas. La lista de 7 profesores es pequena, pero el patron es correcto (#8). |
| manualChunks para vendor split en Vite | react + react-dom + react-router-dom en chunk vendor separado. El vendor chunk se cachea independientemente entre deploys | Baja | Sin manualChunks, cada deploy invalida el cache del vendor aunque no haya cambiado (#6). |
| Paralelizacion de llamadas API en Dashboard | getConvocatorias + getProfesores en secuencia anade ~400ms innecesarios. Promise.all los paraleliza | Baja | Ahorro real medible en primer render del Dashboard (#19). |
| DashboardPage refactorizado a hooks + subcomponentes | Reduce 272 lineas a <250 (obliga la regla CLAUDE.md). Extrae useTeacherData + useAlertStudents. Facilita testing futuro | Media | No es visible para el usuario pero es requisito de arquitectura del proyecto (#9). |
| JSDoc en 11 componentes faltantes | Acelera onboarding de nuevos desarrolladores y hace el proyecto mantenible | Media | 11 componentes sin cabecera JSDoc (#14). Valor acumulativo. |
| ARIA labels en componentes sin cobertura | Solo 3 de 19 componentes tienen atributos ARIA. Agregar aria-label, aria-describedby, role donde corresponde mejora el score de accesibilidad 5.0 → 7.0 | Media | No todos los componentes necesitan ARIA — el valor esta en los interactivos criticos: Modal, StudentRow toggle, TeacherCard. |

---

## Anti-Features

Funcionalidades a deliberadamente NO construir en este milestone.

| Anti-Feature | Por que evitar | Que hacer en su lugar |
|--------------|----------------|----------------------|
| Autenticacion server-side | Requiere cambios en Code.gs (Apps Script), 15h estimadas, fuera de scope de Olas 1-3 | Diferir a Ola 4. Documentar en PROJECT.md como deuda conocida. |
| Cola de sincronizacion offline (Background Sync API) | La auditoria identifica la falta como Hallazgo Alto (A1), pero implementar IndexedDB + Background Sync es complejidad de Nivel 2 que excede el scope de estas olas | Ola 4+. El feedback de error visible (tabla stakes) ya mitiga el caso mas critico: el profesor sabe que fallo. |
| Toast library de terceros (react-hot-toast, Sonner, etc.) | El proyecto tiene 0 dependencias de UI externas. Agregar una libreria de toasts para feedback de errores puntales es overhead desproporcionado | Implementar un toast/banner inline simple con estado local. 20 lineas maximas. |
| Upgrade a TypeScript | No solicitado. La app funciona en JSX. Migrar 32 archivos es una refactorizacion sin beneficio funcional en este milestone | JSDoc bien escrito (incluido en differentiators) cumple el mismo proposito de documentacion. |
| Rediseno visual | UI score 9.0/10 — ya excelente. Cualquier cambio de diseno arriesga regresar el score | Cero cambios en design tokens, layouts o componentes visuales. |
| Subir cobertura de tests a 60% | 8h+ estimadas, milestone dedicado (Ola 5). Hacerlo ahora diluye el foco en estabilidad | Ola 5 dedicada a tests. No agregar tests en Olas 1-3 excepto los que verifican los bugs corregidos. |
| Notificacion "hay una version nueva" (useRegisterSW) | Requiere cambiar registerType a 'prompt', agregar UI de banner, gestionar ciclo de vida SW. Complejidad media sin impacto en los 8 usuarios del dia a dia | autoUpdate ya actualiza el SW. Los 8 usuarios son internos y recargan naturalmente. |
| Iconos PWA separados 192x512 | Actualmente mismo PNG para ambos. Crear iconos separados requiere assets de diseno externos y no afecta funcionalidad | Registrar como deuda visual, no bloquea ninguna ola. |
| Brotli en el build de Vite | vite-plugin-compression anade dependencia dev. La compresion Brotli es responsabilidad de Vercel (hosting) que ya la hace | Vercel aplica Brotli automaticamente. No duplicar en el build. |

---

## Dependencias entre Features

```
navigateFallback correcto
  → (independiente, pero prerequisito logico de)
      Regex API cache correcta
        → (complementario, mismo archivo vite.config.js)

res.ok en api.js
  → prerequisito de
      Feedback de error en AttendancePage
        → (mismo flujo de error que)
            Feedback de error al cargar alumnos

Code-splitting (React.lazy)
  → prerequisito de
      manualChunks vendor split
        → (mismo archivo vite.config.js, pero logicamente separado)

DashboardPage refactor
  → prerequisito de
      JSDoc en DashboardPage (refactor crea los nuevos archivos a documentar)

Focus trap en Modal
  → independiente de
      Soporte teclado TeacherCard
        → pero ambos son ARIA coverage — se pueden agrupar en un mismo PR
```

---

## MVP Recomendado (Ola 1 — dia 1)

Priorizar en este orden porque son cambios de menor riesgo con mayor impacto:

1. **navigateFallback → /index.html** — desbloquea la PWA offline. 30 min.
2. **Regex API cache** — mismo archivo, mismo momento. 30 min.
3. **Bug SavedPage present===0** — 10 min, no hay riesgo de regresion.
4. **res.ok en api.js** — prerequisito para feedback de errores. 30 min.
5. **Feedback de error en AttendancePage** — visible para el usuario final. 1.5h.
6. **Hex hardcodeados → tokens Tailwind** — compliance con CLAUDE.md. 30 min.
7. **html lang="es" + metadata PWA** — accesibilidad y manifest. 30 min.
8. **npm audit fix** — sin riesgo en devDeps. 30 min.

Diferir a Ola 2 (dia 2): code-splitting, React.memo, debounce, manualChunks, paralelizacion API.
Diferir a Ola 3 (dia 3): DashboardPage refactor, ruta 404, focus trap, soporte teclado, JSDoc.

---

## Evaluacion de Complejidad

| Feature | Esfuerzo estimado | Riesgo de regresion |
|---------|-------------------|---------------------|
| navigateFallback fix | 30 min | Bajo — cambio de config, no de codigo |
| Regex API cache | 30 min | Bajo — cambio de config |
| Bug SavedPage | 10 min | Bajo — logica aislada |
| res.ok en api.js | 30 min | Bajo — patron defensivo |
| Feedback error AttendancePage | 1.5h | Medio — requiere estado de error + UI |
| html lang + metadata | 30 min | Muy bajo — solo index.html + vite.config |
| npm audit fix | 30 min | Bajo — mayoria devDeps |
| Hex → tokens | 30 min | Bajo — solo clases Tailwind |
| Code-splitting (React.lazy) | 2h | Medio — requiere Suspense boundary |
| React.memo (3 componentes) | 1.5h | Bajo-medio — con React 19 compiler puede ser redundante |
| Debounce searchQuery | 30 min | Bajo — hook custom aislado |
| manualChunks Vite | 30 min | Bajo — config solo |
| Paralelizar API Dashboard | 1h | Medio — cambiar logica de useConvocatorias |
| DashboardPage refactor | 3h | Medio — extraccion de hooks + subcomponentes |
| Ruta 404 | 30 min | Muy bajo — agregar route a App.jsx |
| Focus trap Modal | 1.5h | Medio — requiere gestionar refs + event listeners |
| Soporte teclado TeacherCard | 1h | Bajo — atributos tabIndex + onKeyDown |
| JSDoc (11 componentes) | 2h | Muy bajo — documentacion sin cambiar logica |
| ARIA en componentes criticos | 2h | Bajo — atributos HTML sin cambiar logica |

**Total Olas 1-3 estimado:** ~19h

---

## Notas de Confianza

| Area | Confianza | Fundamento |
|------|-----------|------------|
| Correctness de fixes | HIGH | Basado en auditoria local con lectura de codigo real |
| Patrones de ecosistema (memo, lazy, debounce) | HIGH | Verificado en docs oficiales React + Vite 2025 |
| navigateFallback = /index.html | HIGH | Confirmado por auditoria local (04-pwa-offline.md seccion 2.1) y documentacion vite-plugin-pwa |
| React.memo con React 19 compiler | MEDIUM | React 19 compiler puede hacer memo redundante; sin embargo el compiler NO esta habilitado en este proyecto (no hay babel plugin de React compiler en config), por lo que React.memo sigue siendo util |
| Impacto de code-splitting en LCP | MEDIUM | 271KB → ~50-60% reduccion esperada segun patrones de ecosistema; el numero exacto depende del perfil de red real de los profesores |

---

## Sources

- Auditoria local `docs/auditoria/00-RESUMEN-EJECUTIVO.md` (HIGH confidence)
- Auditoria local `docs/auditoria/04-pwa-offline.md` (HIGH confidence)
- Auditoria local `docs/auditoria/03-rendimiento.md` (HIGH confidence)
- [vite-plugin-pwa navigateFallbackDenylist docs](https://vite-pwa-org.netlify.app/workbox/generate-sw.html) (MEDIUM confidence)
- [React 19 memo docs](https://react.dev/reference/react/memo) (HIGH confidence)
- [Vite manualChunks + React.lazy patterns 2025](https://www.mykolaaleksandrov.dev/posts/2025/10/react-lazy-suspense-vite-manualchunks/) (MEDIUM confidence)
- [react-error-boundary library](https://github.com/bvaughn/react-error-boundary) (HIGH confidence)
- [WCAG 2.1 focus trap modal patterns](https://www.a11y-collective.com/blog/modal-accessibility/) (HIGH confidence)
- [React SPA 404 React Router v6 catch-all](https://ultimatecourses.com/blog/react-router-not-found-component) (HIGH confidence)
- [useDebounce hook patterns](https://usehooks.com/usedebounce) (HIGH confidence)
- [PWA NetworkFirst caching strategy](https://web.dev/learn/pwa/caching) (HIGH confidence)
