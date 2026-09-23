---
type: quick
slug: cvd-fix-convocatoria-por-defecto
completed: 2026-09-23
status: complete
---

# Resumen: convocatoria por defecto del Dashboard CEO

## Que se arreglo

1. **`src/hooks/useConvocatorias.js`** — nueva `pickDefault()`: la preseleccion
   pasa de `allConvs[0]` (primera fila de la hoja, sin criterio) a la de
   `fecha_inicio` mas reciente. Las fechas llegan en ISO desde el backend, asi
   que se comparan como texto. Sin fechas usables conserva el orden y gana la
   primera: el comportamiento anterior queda intacto y el test previo sigue
   verde. El orden de la lista expuesta al selector NO se altera (se ordena
   sobre una copia).
2. **`src/components/features/ConvocatoriaSelector.jsx`** — cada `<option>`
   muestra el rango de fechas en dd/mm/yyyy. `toDisplayDate()` invierte el
   texto en vez de construir un `Date`, porque `new Date('yyyy-MM-dd')` se
   interpreta en UTC y puede restar un dia segun la zona.

## Por que

Verificado contra produccion el mismo dia: 4 convocatorias activas a la vez y
DOS con el nombre identico ("septiembre 2026", una de ellas con 0 registros).
El Dashboard mostraba `conv-abr26` desde agosto y el desplegable ofrecia dos
opciones indistinguibles.

## Verificacion

- `npm run lint` limpio.
- `npm test`: **301 tests / 48 suites** verdes (antes 294 / 47).
- 7 casos nuevos: 4 en `useConvocatorias.test.jsx`, 3 en
  `ConvocatoriaSelector.test.jsx` (archivo nuevo).
- **Los tests se comprobaron reintroduciendo el bug**: con `allConvs?.[0]`
  fallan 2 de ellos; con el fix, verdes. No son decorativos.
- Todos los archivos por debajo del limite de 250 lineas de CLAUDE.md.

## Lo que este fix NO arregla

- `conv-sept2026` sigue activa y duplicada: lo confirma Aurora antes de tocarla.
- El prefijo `ABR26 B1/B2` que rompe `onEdit` y `actualizarEstadisticasGrupo`
  en 6 de 11 pestanas — causa raiz de la discrepancia que reporto Aurora.
  Bloqueado hasta saber que significa el bloque B1/B2.
- La latencia del borde de Apps Script (milestone v1.2, migracion a Supabase).
