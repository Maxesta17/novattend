---
type: quick
slug: cvd-fix-convocatoria-por-defecto
created: 2026-09-23
status: in-progress
---

# Fix: convocatoria por defecto del Dashboard CEO

## Problema (verificado contra produccion 2026-09-23)

La hoja CONVOCATORIAS tiene **4 convocatorias activas a la vez**:

| id | nombre | registros en ASISTENCIA |
|---|---|---|
| conv-abr26 | abril 2026 | 3.062 |
| conv-lingnova | LING. ACDMY | 109 |
| conv-sept2026 | septiembre 2026 | 0 |
| conv-sept26 | septiembre 2026 | 238 |

Dos fallos que se suman:

1. `useConvocatorias.js:38` elige `allConvs?.[0]`, o sea la primera FILA de la
   hoja, sin criterio. Es `conv-abr26`. El CEO lleva desde agosto viendo un
   curso que no es el que cree.
2. `ConvocatoriaSelector.jsx` pinta solo `conv.nombre` en cada `<option>`. Con
   dos convocatorias homonimas, el desplegable muestra dos entradas
   **identicas** e indistinguibles.

## Cambios

1. **`src/hooks/useConvocatorias.js`** — la seleccion por defecto pasa a ser la
   de `fecha_inicio` mas reciente. Si ninguna trae fecha usable, cae a la
   primera (comportamiento anterior intacto, no rompe el test existente).
2. **`src/components/features/ConvocatoriaSelector.jsx`** — cada opcion muestra
   el rango de fechas en `dd/mm/yyyy` junto al nombre.
3. **`src/tests/useConvocatorias.test.jsx`** — casos que fallan si se rompe
   cualquiera de los dos.

## Fuera de alcance

- Desactivar `conv-sept2026` (duplicada y vacia): lo confirma Aurora primero.
- Prefijo `ABR26 B1/B2` que rompe `onEdit` y `actualizarEstadisticasGrupo`:
  depende de que Aurora explique que significa el bloque.

## Verificacion

`npm run lint` limpio y `npm test` verde, incluidos los casos nuevos.
