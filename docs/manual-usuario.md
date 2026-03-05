# Manual de Usuario - NovAttend

## Indice

1. [Que es NovAttend](#que-es-novattend)
2. [Para Profesores: Marcar asistencia](#para-profesores)
3. [Para Administradores: Gestionar el Google Sheet](#para-administradores)
4. [Tareas frecuentes paso a paso](#tareas-frecuentes)
5. [Preguntas frecuentes](#preguntas-frecuentes)

---

## 1. Que es NovAttend

NovAttend es la aplicacion de control de asistencia de LingNova Academy. Funciona desde el movil como una app (PWA) y guarda todos los datos en un Google Sheet centralizado.

**Dos roles:**
- **Profesor:** Marca la asistencia de sus grupos desde el movil.
- **CEO/Admin:** Ve las estadisticas globales y gestiona los datos desde el Google Sheet.

---

## 2. Para Profesores

### 2.1 Acceder a la app

1. Abre el navegador de tu movil (Chrome recomendado).
2. Ve a la direccion que te proporcione la academia.
3. Introduce tu usuario y contrasena.
4. La primera vez, el navegador te sugerira "Instalar app" o "Anadir a pantalla de inicio". Acepta para tenerla como app.

### 2.2 Marcar asistencia

1. Al entrar veras tus **grupos** (G1, G2, G3, G4).
2. Pulsa en el grupo de la clase actual.
3. Aparecera la lista de alumnos.
4. Marca con el toggle a los alumnos que estan **presentes**.
5. Pulsa **Guardar**.
6. Aparecera una pantalla de confirmacion.

### 2.3 Que convocatoria veo?

- La app te mostrara automaticamente la **convocatoria activa** que te corresponde.
- Si tienes alumnos en varias convocatorias, podras cambiar de convocatoria desde el selector en la parte superior.

### 2.4 No puedo cambiar datos de alumnos

- Los profesores **no pueden** anadir, eliminar ni mover alumnos.
- Si un alumno no aparece en tu lista o esta en el grupo equivocado, contacta con administracion.

---

## 3. Para Administradores

### 3.1 Estructura del Google Sheet

El Google Sheet tiene **5 hojas**. Cada una cumple una funcion:

| Hoja | Para que sirve |
|------|---------------|
| CONVOCATORIAS | Definir periodos (Abril 2026, Mayo 2026...) |
| PROFESORES | Lista de profesores con sus datos |
| ALUMNOS | Todos los alumnos, con su convocatoria, profesor y grupo |
| ASISTENCIA | Registros automaticos (NO editar manualmente) |
| LOG | Historial de acciones (solo lectura) |

### 3.2 Hoja CONVOCATORIAS

Cada fila es una convocatoria:

| id | nombre | fecha_inicio | fecha_fin | activa |
|----|--------|-------------|-----------|--------|
| conv-2026-04 | Abril 2026 | 01/04/2026 | 30/11/2026 | TRUE |
| conv-2026-05 | Mayo 2026 | 01/05/2026 | 31/12/2026 | TRUE |

- **id:** Identificador unico. Formato recomendado: `conv-YYYY-MM`. NO cambiar una vez creado.
- **nombre:** Lo que veran los profesores en la app.
- **fecha_inicio / fecha_fin:** Periodo de la convocatoria.
- **activa:** `TRUE` para que aparezca en la app, `FALSE` para ocultarla (no se borran datos).

### 3.3 Hoja PROFESORES

| id | nombre | email | activo |
|----|--------|-------|--------|
| prof-samuel | Samuel | samuel@lingnova.com | TRUE |

- **id:** Identificador unico. Formato: `prof-nombre`. NO cambiar una vez creado.
- **activo:** `TRUE` si da clases actualmente. `FALSE` si ya no trabaja (no se borran datos).

### 3.4 Hoja ALUMNOS

Esta es la hoja mas importante para la gestion diaria:

| id | nombre | convocatoria_id | profesor_id | grupo | email | telefono | activo |
|----|--------|----------------|-------------|-------|-------|----------|--------|
| alu-001 | Rosa Cruz Ruiz | conv-2026-04 | prof-samuel | G1 | rosa@mail.com | 612345678 | TRUE |

- **id:** Se genera automaticamente. NO tocar.
- **convocatoria_id:** Debe coincidir EXACTAMENTE con un id de la hoja CONVOCATORIAS.
- **profesor_id:** Debe coincidir EXACTAMENTE con un id de la hoja PROFESORES.
- **grupo:** G1, G2, G3, G4 (o el que aplique).
- **activo:** `TRUE` si esta matriculado. `FALSE` si se ha dado de baja.

### 3.5 Hoja ASISTENCIA (solo lectura)

Esta hoja se rellena automaticamente desde la app. **No editar manualmente** salvo errores puntuales.

| fecha | alumno_id | convocatoria_id | profesor_id | grupo | presente | hora_registro |
|-------|----------|----------------|-------------|-------|----------|---------------|
| 15/04/2026 | alu-001 | conv-2026-04 | prof-samuel | G1 | TRUE | 15/04/2026 09:15 |

### 3.6 Hoja LOG (solo lectura)

Registra todas las acciones. Util para auditar quien marco que y cuando.

---

## 4. Tareas frecuentes

### 4.1 Crear una nueva convocatoria

1. Ve a la hoja **CONVOCATORIAS**.
2. En la siguiente fila vacia, rellena:
   - `id`: ej. `conv-2026-07`
   - `nombre`: ej. `Julio 2026`
   - `fecha_inicio`: ej. `01/07/2026`
   - `fecha_fin`: ej. `28/02/2027`
   - `activa`: `TRUE`
3. Listo. La convocatoria ya aparecera en la app.

### 4.2 Anadir un alumno nuevo

1. Ve a la hoja **ALUMNOS**.
2. En la siguiente fila vacia, rellena:
   - `id`: deja vacio (se genera automaticamente) o pon `alu-XXX` con un numero unico.
   - `nombre`: nombre completo del alumno.
   - `convocatoria_id`: el id EXACTO de su convocatoria (ej. `conv-2026-04`).
   - `profesor_id`: el id EXACTO de su profesor (ej. `prof-samuel`).
   - `grupo`: ej. `G1`.
   - `email` y `telefono`: opcionales.
   - `activo`: `TRUE`.
3. El alumno aparecera inmediatamente en la app del profesor.

### 4.3 Mover un alumno de grupo

1. Ve a la hoja **ALUMNOS**.
2. Busca al alumno (Ctrl+F).
3. Cambia la celda de la columna `grupo` (ej. de `G1` a `G3`).
4. Si tambien cambia de profesor, cambia `profesor_id`.
5. Listo. El cambio es inmediato.

### 4.4 Dar de baja a un alumno

1. Ve a la hoja **ALUMNOS**.
2. Busca al alumno.
3. Cambia `activo` a `FALSE`.
4. **NO borres la fila.** Los datos de asistencia historicos se mantienen.

### 4.5 Anadir un profesor nuevo

1. Ve a la hoja **PROFESORES**.
2. Anade una fila con:
   - `id`: ej. `prof-carlos`
   - `nombre`: ej. `Carlos Garcia`
   - `email`: su email
   - `activo`: `TRUE`
3. Recuerda crear sus credenciales de acceso en la configuracion de la app.

### 4.6 Desactivar una convocatoria terminada

1. Ve a la hoja **CONVOCATORIAS**.
2. Cambia `activa` a `FALSE` en la convocatoria que haya terminado.
3. Ya no aparecera en la app, pero los datos se conservan.

### 4.7 Inscribir alumnos en una nueva convocatoria

Si un alumno repite o se inscribe en otra convocatoria:
1. Ve a la hoja **ALUMNOS**.
2. Crea una **fila nueva** con el nuevo `convocatoria_id`.
3. Puedes copiar la fila anterior y solo cambiar `convocatoria_id`, `profesor_id` y `grupo`.

**Importante:** El alumno tendra un id diferente en cada convocatoria. Su historial de cada convocatoria se mantiene por separado.

### 4.8 Corregir una asistencia marcada por error

1. Ve a la hoja **ASISTENCIA**.
2. Busca la fila correspondiente (filtra por fecha + alumno).
3. Cambia `presente` de `TRUE` a `FALSE` (o viceversa).
4. Anade una nota en la hoja LOG manualmente si quieres dejar constancia.

---

## 5. Preguntas frecuentes

**P: Puedo borrar filas del Sheet?**
R: NO recomendado. Usa el campo `activo` para desactivar registros. Borrar filas puede romper referencias.

**P: Que pasa si escribo mal un `convocatoria_id` o `profesor_id`?**
R: El alumno no aparecera en la app. Revisa que los ids coincidan EXACTAMENTE con los de las hojas CONVOCATORIAS y PROFESORES (copiar y pegar es lo mas seguro).

**P: Cuantos alumnos caben?**
R: Google Sheets soporta hasta 10 millones de celdas. Con la estructura actual, eso equivale a mas de 100.000 alumnos. No hay limite practico.

**P: La app funciona sin internet?**
R: De momento no. Se necesita conexion para leer y guardar datos. (Funcionalidad offline pendiente.)

**P: Un profesor puede ver alumnos de otro profesor?**
R: No. Cada profesor solo ve los alumnos asignados a su `profesor_id`.

**P: Si cambio el nombre de un profesor en el Sheet, cambia en la app?**
R: Si, automaticamente. Pero NO cambies el `id`, solo el `nombre`.

**P: Puedo anadir mas columnas al Sheet?**
R: Las hojas ASISTENCIA y LOG no deben modificarse. En ALUMNOS puedes anadir columnas extras al final (ej. `notas`, `nivel`) pero la app no las leera a menos que se programe.

**P: Quien tiene acceso al Google Sheet?**
R: Solo las personas con las que compartas el archivo en Google Drive. Los profesores NO necesitan acceso al Sheet; solo usan la app.

---

*Documento generado para NovAttend - LingNova Academy*
*Ultima actualizacion: Marzo 2026*
