# Elementos diferidos — Phase 01

## Hallazgos fuera de alcance (no causados por cambios actuales)

### api.test.jsx — 2 tests fallidos (pre-existentes)

- **Tests:** `apiGet lanza error descriptivo cuando res.ok es false (HTTP 500)` y `apiPost lanza error descriptivo cuando res.ok es false (HTTP 403)`
- **Error:** `res.json is not a function`
- **Causa raiz:** El mock de `fetch` en `api.test.jsx` no incluye el metodo `.json()` en el objeto de respuesta simulado. El `api.js` llama `res.json()` antes de verificar `res.ok`, lo que provoca el error.
- **Descubierto en:** Plan 01-01, Tarea 1 (TDD Button token disabled)
- **Estado:** Pre-existente — no causado por cambios del plan 01-01
- **Accion sugerida:** Plan 01-02 cubre `api.js verifica res.ok antes de parsear JSON` — esos tests probablemente son parte de ese plan
