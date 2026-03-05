# Diseno: CacheService en Apps Script

## Problema
El dashboard CEO tarda ~5s en cargar porque cada endpoint GET lee la hoja completa de Google Sheets. Con 4+ clases/dia/profesor, los datos cambian frecuentemente pero no en cada segundo.

## Solucion
Usar `CacheService.getScriptCache()` de Apps Script para cachear respuestas JSON de endpoints GET. TTL de 120 segundos. Invalidacion automatica al escribir (POST).

## Endpoints cacheados

| Endpoint | Clave cache | TTL |
|----------|-------------|-----|
| getConvocatorias | `conv` | 120s |
| getProfesores | `prof` | 120s |
| getAlumnos | `alu_{convId}_{profId}_{grupo}` | 120s |
| getResumen | `res_{convId}_{profId}_{grupo}` | 120s |
| getAsistencia | NO cacheado | - |

## Invalidacion en POST

| Accion POST | Claves invalidadas |
|-------------|-------------------|
| guardarAsistencia | `res_{convId}_*` (resumen de esa convocatoria) |
| crearAlumno | `alu_{convId}_*` (alumnos de esa convocatoria) |
| actualizarAlumno | `alu_*` (todos los alumnos, puede cambiar grupo/profesor) |

## Helpers

```
cacheGet(key, ttl, fetchFn) -> lee cache, si miss ejecuta fetchFn, guarda y devuelve
cacheInvalidate(prefixes) -> borra claves que empiecen por cada prefijo
```

## Limites de CacheService
- Max 100KB por entrada (nuestros payloads son ~5KB)
- Max 6h TTL (usamos 120s)
- Compartido entre todos los usuarios del script

## Impacto esperado
- Primera carga (cold start): ~3-5s (sin cambio)
- Cargas posteriores: ~200-500ms (mejora de 10x)
- Tras guardar asistencia: ~1s (re-lee Sheets)

## Archivos a modificar
- `docs/apps-script/Code.gs` — unico archivo modificado
