---
phase: 01-estabilidad-critica
plan: 03
subsystem: routing-pwa
tags: [404, pwa, offline, manifest, service-worker]
dependency_graph:
  requires: []
  provides: [ruta-catch-all, notfoundpage, pwa-offline-funcional]
  affects: [src/App.jsx, vite.config.js, src/pages/NotFoundPage.jsx]
tech_stack:
  added: []
  patterns: [TDD-red-green, branded-404-page, PWA-workbox-config]
key_files:
  created:
    - src/pages/NotFoundPage.jsx
    - src/tests/NotFoundPage.test.jsx
  modified:
    - src/App.jsx
    - vite.config.js
decisions:
  - "NotFoundPage es publica (sin ProtectedRoute) — cualquier usuario ve el 404"
  - "navigateFallback cambiado a /index.html para que la SPA funcione offline en rutas deep-link"
  - "regex de cache ampliado a (google|googleusercontent).com para capturar redirecciones de Apps Script"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
requirements_covered: [ERR-04, PWA-01, PWA-02, PWA-03]
---

# Phase 01 Plan 03: Pagina 404 + Configuracion PWA Summary

**One-liner:** Pagina 404 branded con ruta catch-all publica y 3 fixes PWA (navigateFallback, regex googleusercontent, manifest start_url/scope/lang).

## What Was Built

### Tarea 1: NotFoundPage + ruta catch-all en App.jsx
- Creado `src/pages/NotFoundPage.jsx` — pagina branded minima con heading "404" (font-cinzel, text-gold, text-6xl), texto "Pagina no encontrada" y boton "Volver al inicio" que usa el componente Button existente
- Agregado `import NotFoundPage` y `<Route path="*" element={<NotFoundPage />} />` al final de Routes en `src/App.jsx` (sin ProtectedRoute — pagina publica)
- Suite de tests `src/tests/NotFoundPage.test.jsx` con 3 tests (heading 404, texto, boton + navegacion) — todos pasan

### Tarea 2: 3 fixes PWA en vite.config.js
- **PWA-01:** `navigateFallback` cambiado de `'/offline.html'` a `'/index.html'` — la SPA ahora funciona offline en cualquier ruta (deep-links)
- **PWA-02:** Regex de `urlPattern` extendido de `script\.google\.com` a `script\.(google|googleusercontent)\.com` — captura las redirecciones del proxy de Google Apps Script
- **PWA-03:** Manifest ampliado con `start_url: '/'`, `scope: '/'`, `lang: 'es'` — cumple spec PWA completa

## Verification Results

```
npm test -- --run NotFoundPage.test: 3 passed, 0 failed
npm run build: built in 1.90s, PWA mode generateSW, 10 entries precache
navigateFallback: '/index.html'   OK
googleusercontent en regex:       OK
start_url, scope, lang en manifest: OK
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] beforeEach no importado en NotFoundPage.test.jsx**
- **Found during:** Verificacion de lint post-Tarea 1
- **Issue:** `beforeEach` usado en el test pero no importado desde vitest (el patron del proyecto requiere import explicito)
- **Fix:** Agregado `beforeEach` al import de vitest en la primera linea del test file
- **Files modified:** `src/tests/NotFoundPage.test.jsx`
- **Commit:** 85876a5

## Known Stubs

None — todos los componentes tienen datos reales conectados.

## Self-Check: PASSED

- [x] `src/pages/NotFoundPage.jsx` — FOUND
- [x] `src/tests/NotFoundPage.test.jsx` — FOUND
- [x] `src/App.jsx` contiene `path="*"` — FOUND
- [x] `src/App.jsx` contiene `import NotFoundPage` — FOUND
- [x] `vite.config.js` contiene `navigateFallback: '/index.html'` — FOUND
- [x] `vite.config.js` contiene `googleusercontent` — FOUND
- [x] `vite.config.js` contiene `start_url: '/'` — FOUND
- [x] `vite.config.js` contiene `scope: '/'` — FOUND
- [x] `vite.config.js` contiene `lang: 'es'` — FOUND
- [x] Commit b19b657 existe — FOUND
- [x] Commit 45170b9 existe — FOUND
- [x] Commit 85876a5 existe — FOUND
