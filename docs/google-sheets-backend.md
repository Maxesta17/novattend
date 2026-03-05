# Backend Google Sheets - Especificacion Tecnica

## Arquitectura General

```
Vercel (React PWA)  --fetch()-->  Google Apps Script (Web App)  -->  Google Sheet
     frontend                        API REST gratuita                 base de datos
```

## Estructura del Google Sheet (Un solo archivo)

### Hoja 1: CONVOCATORIAS

| Columna | Tipo | Ejemplo | Notas |
|---------|------|---------|-------|
| id | texto | `conv-2026-04` | Identificador unico |
| nombre | texto | `Abril 2026` | Nombre visible en la app |
| fecha_inicio | fecha | `01/04/2026` | Inicio del periodo |
| fecha_fin | fecha | `30/11/2026` | Fin del periodo |
| activa | boolean | `TRUE` | Si aparece en la app o no |

**Ejemplo:**

| id | nombre | fecha_inicio | fecha_fin | activa |
|----|--------|-------------|-----------|--------|
| conv-2026-04 | Abril 2026 | 01/04/2026 | 30/11/2026 | TRUE |
| conv-2026-05 | Mayo 2026 | 01/05/2026 | 31/12/2026 | TRUE |
| conv-2026-06 | Junio 2026 | 01/06/2026 | 31/01/2027 | FALSE |

---

### Hoja 2: PROFESORES

| Columna | Tipo | Ejemplo | Notas |
|---------|------|---------|-------|
| id | texto | `prof-samuel` | Identificador unico |
| nombre | texto | `Samuel` | Nombre visible |
| email | texto | `samuel@lingnova.com` | Para login y notificaciones |
| activo | boolean | `TRUE` | Si aparece en la app |

**Ejemplo:**

| id | nombre | email | activo |
|----|--------|-------|--------|
| prof-samuel | Samuel | samuel@lingnova.com | TRUE |
| prof-maria | Maria Wolf | maria@lingnova.com | TRUE |
| prof-nadine | Nadine | nadine@lingnova.com | TRUE |

---

### Hoja 3: ALUMNOS

Cada fila = un alumno en una convocatoria especifica.

| Columna | Tipo | Ejemplo | Notas |
|---------|------|---------|-------|
| id | texto | `alu-001` | Identificador unico del alumno |
| nombre | texto | `Rosa Cruz Ruiz` | Nombre completo |
| convocatoria_id | texto | `conv-2026-04` | A que convocatoria pertenece |
| profesor_id | texto | `prof-samuel` | Profesor asignado |
| grupo | texto | `G1` | Grupo asignado |
| email | texto | `rosa@email.com` | Opcional |
| telefono | texto | `612345678` | Opcional |
| activo | boolean | `TRUE` | Si esta matriculado o ha causado baja |

**Para mover un alumno:** solo cambias `profesor_id` o `grupo` en su fila.
**Para dar de baja:** cambias `activo` a `FALSE`.
**Para inscribir en otra convocatoria:** creas una fila nueva con el nuevo `convocatoria_id`.

---

### Hoja 4: ASISTENCIA

Una fila por cada registro de asistencia (un alumno, un dia).

| Columna | Tipo | Ejemplo | Notas |
|---------|------|---------|-------|
| fecha | fecha | `15/04/2026` | Dia de la clase |
| alumno_id | texto | `alu-001` | Referencia al alumno |
| convocatoria_id | texto | `conv-2026-04` | Referencia a la convocatoria |
| profesor_id | texto | `prof-samuel` | Quien registro la asistencia |
| grupo | texto | `G1` | Grupo en ese momento |
| presente | boolean | `TRUE` | Asistio o no |
| hora_registro | timestamp | `15/04/2026 09:15:00` | Cuando se marco |

**Calcular porcentaje:** se filtra por `alumno_id` + `convocatoria_id` y se cuenta `presente=TRUE` / total filas.

---

### Hoja 5: LOG

| Columna | Tipo | Ejemplo |
|---------|------|---------|
| timestamp | datetime | `15/04/2026 09:15:32` |
| usuario | texto | `Samuel` |
| accion | texto | `MARCAR_ASISTENCIA` |
| detalle | texto | `Rosa Cruz Ruiz - G1 - Presente` |

---

## Endpoints Apps Script (Web App)

### GET Endpoints (lectura)

| Endpoint | Parametros | Respuesta |
|----------|-----------|-----------|
| `?action=getConvocatorias` | - | Lista de convocatorias activas |
| `?action=getProfesores` | - | Lista de profesores activos |
| `?action=getAlumnos` | `convocatoria_id`, `profesor_id` | Alumnos filtrados |
| `?action=getAsistencia` | `convocatoria_id`, `profesor_id`, `grupo`, `fecha` | Registros del dia |
| `?action=getResumen` | `convocatoria_id`, `profesor_id?`, `grupo?` | Porcentajes calculados |

### POST Endpoints (escritura)

| Endpoint | Body | Accion |
|----------|------|--------|
| `?action=guardarAsistencia` | `{fecha, alumnos: [{id, presente}], profesor_id, grupo, convocatoria_id}` | Guarda asistencia del dia |

---

## Ventajas sobre la estructura actual

| Aspecto | Estructura actual (28 hojas) | Estructura nueva (5 hojas) |
|---------|------------------------------|----------------------------|
| Anadir convocatoria | Crear 28 hojas nuevas | Anadir 1 fila en CONVOCATORIAS |
| Anadir profesor | Crear 4 hojas nuevas | Anadir 1 fila en PROFESORES |
| Mover alumno | Copiar/pegar entre hojas | Cambiar 1 celda (profesor_id o grupo) |
| Ver resumen global | Hoja RESUMEN con formulas complejas | Query simple a ASISTENCIA |
| Escala | ~28 hojas por convocatoria | Siempre 5 hojas |

---

## Notas de implementacion

- Los `id` se generan automaticamente por Apps Script al crear registros.
- La hoja ASISTENCIA crecera con el tiempo. Google Sheets soporta hasta 10 millones de celdas, suficiente para anos de datos.
- El Apps Script se despliega como Web App con acceso "Cualquiera" (la autenticacion la maneja la app React).
- CORS: Apps Script maneja CORS automaticamente en Web Apps.
