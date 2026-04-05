---
status: partial
phase: 06-seguridad-backend
source: [06-VERIFICATION.md]
started: 2026-04-05T20:32:00.000Z
updated: 2026-04-05T20:32:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Request directo al endpoint de Apps Script sin token
expected: Respuesta JSON con status error, error No autorizado, code 401
result: [pending]

### 2. App funciona normalmente para profesores y CEO con token inyectado
expected: Login, carga de convocatorias, asistencia y dashboard funcionan sin cambios en UX
result: [pending]

### 3. Warning D-09 aparece en consola de desarrollo cuando falta VITE_API_KEY
expected: console.warn '[NovAttend] VITE_API_KEY no configurada...' visible en DevTools
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
