# Tutorial para Aurora — Como rellenar alumnos en NovAttend

## Que es NovAttend

NovAttend es la aplicacion web que usan los profesores para pasar lista a sus alumnos. Los datos de los alumnos viven en el Google Sheets "Control de Asistencia Global". Tu trabajo es escribir los nombres de los alumnos en las hojas correctas. **El sistema se encarga del resto.**

---

## Estructura del Spreadsheet

El spreadsheet tiene dos tipos de hojas:

### Hojas del sistema (NO tocar)
Estas hojas se gestionan automaticamente. No escribas ni borres nada en ellas:
- `CONVOCATORIAS` — Lista de convocatorias con fechas
- `PROFESORES` — Lista de profesores activos
- `ALUMNOS` — Se rellena sola cuando tu escribes nombres
- `ASISTENCIA` — Registros de asistencia (los graba la app)
- `LOG` — Registro de actividad

### Hojas de grupo (AQUI trabajas tu)
Son las hojas donde escribes los nombres de alumnos. Tienen este formato:

```
PREFIJO - NombreProfesor - GX
```

Por ejemplo:
- `MAR26 - Samuel - G1`
- `MAR26 - Maria Wolf - G2`
- `MAR26 - Nadine - G3`
- `ABR26 - Marta Battistella - G4`

Cada convocatoria tiene un **separador de color** (ej: `[ MAR26 ]`) seguido de sus 28 hojas de grupo (7 profesores x 4 grupos).

---

## Como rellenar alumnos — Paso a paso

### 1. Localiza la convocatoria

Busca en las pestanas de abajo el separador de color de la convocatoria activa. Por ejemplo `[ MAR26 ]`. Las hojas de grupo estan justo despues del separador.

### 2. Abre la hoja de grupo correcta

Haz clic en la pestana del grupo que quieras rellenar. Ejemplo: `MAR26 - Samuel - G1`.

Veras esta estructura:

| | A | B | C | D |
|---|---|---|---|---|
| **1** | **Samuel - G1** (cabecera con color) | | | |
| **2** | Nombre del Alumno | Asistencia % | Ultima clase | Total clases |
| **3** | *(aqui escribes)* | *(automatico)* | *(automatico)* | *(automatico)* |

### 3. Escribe los nombres

- Escribe **un nombre por fila** en la **columna A**, empezando en la **fila 3**.
- Usa nombre completo: `Antonio Perez Burrul`, `Rosa Cruz Ruiz`, etc.
- **No dejes filas en blanco** entre nombres.
- **No toques las columnas B, C, D** — se rellenan solas con las estadisticas.

Ejemplo:

| | A | B | C | D |
|---|---|---|---|---|
| **3** | Antonio Perez Burrul | 0% | | 0 |
| **4** | Rosa Cruz Ruiz | 0% | | 0 |
| **5** | Maria Lopez Garcia | 0% | | 0 |

### 4. Sincronizacion automatica

Cada vez que escribes o modificas un nombre en columna A, el sistema **sincroniza automaticamente** la hoja ALUMNOS. No tienes que hacer nada mas.

Si quieres forzar una sincronizacion manual: **Menu NovAttend > Sincronizar alumnos (manual)**.

---

## Los 7 profesores y sus grupos

Cada profesor tiene 4 grupos (G1, G2, G3, G4). Los profesores actuales son:

| Profesor | Hojas de ejemplo (convocatoria MAR26) |
|---|---|
| Samuel | `MAR26 - Samuel - G1` a `G4` |
| Maria Wolf | `MAR26 - Maria Wolf - G1` a `G4` |
| Nadine | `MAR26 - Nadine - G1` a `G4` |
| Marta Battistella | `MAR26 - Marta Battistella - G1` a `G4` |
| Elisabeth Shick | `MAR26 - Elisabeth Shick - G1` a `G4` |
| Myriam Marcia | `MAR26 - Myriam Marcia - G1` a `G4` |
| Sonja | `MAR26 - Sonja - G1` a `G4` |

---

## Reglas importantes

1. **Solo columna A, fila 3 en adelante.** No escribas en ninguna otra celda de las hojas de grupo.
2. **No toques las hojas del sistema** (CONVOCATORIAS, PROFESORES, ALUMNOS, ASISTENCIA, LOG).
3. **No borres ni renombres las hojas de grupo.** Si necesitas corregir algo, habla con el administrador.
4. **Nombres completos y consistentes.** Escribe siempre el mismo nombre para el mismo alumno. Si escribes "Antonio Perez" en un sitio y "Antonio Perez Burrul" en otro, el sistema los tratara como dos personas distintas.
5. **No dejes filas vacias entre nombres.** Si borras un alumno, mueve los de abajo hacia arriba.

---

## Como crear una nueva convocatoria

Esto normalmente lo hace el administrador, pero si necesitas hacerlo:

1. Abre el spreadsheet.
2. Ve a **Menu NovAttend > Crear nueva convocatoria**.
3. El sistema te pedira:
   - **Nombre:** Descripcion larga (ej: "Abril 2026")
   - **Prefijo:** Codigo corto para las hojas (ej: "ABR26")
   - **Color:** Color del separador (rojo, azul, verde, naranja, morado, teal, rosa, ambar)
   - **Fecha inicio:** Formato dd/mm/yyyy (ej: 01/04/2026)
   - **Fecha fin:** Formato dd/mm/yyyy (ej: 30/11/2026)
4. El sistema crea automaticamente el separador de color + las 28 hojas de grupo.
5. Despues, tu solo tienes que rellenar los nombres de los alumnos.

---

## Menu NovAttend

En la barra de menus del spreadsheet hay un menu **NovAttend** con tres opciones:

| Opcion | Que hace | Cuando usarla |
|---|---|---|
| Crear nueva convocatoria | Crea separador + 28 hojas de grupo | Al inicio de cada convocatoria |
| Sincronizar alumnos (manual) | Relee todos los nombres y actualiza ALUMNOS | Si sospechas que algo no se sincronizo |
| Actualizar estadisticas | Recalcula % asistencia en las hojas de grupo | Para ver estadisticas actualizadas |

---

## Preguntas frecuentes

**P: He escrito un nombre mal, puedo corregirlo?**
Si. Simplemente corrige el nombre en la celda. La sincronizacion se dispara automaticamente.

**P: Puedo borrar un alumno?**
Si. Borra el nombre de la celda y mueve los nombres de abajo hacia arriba para no dejar huecos. La proxima sincronizacion lo eliminara de ALUMNOS.

**P: Puedo mover un alumno de G1 a G2?**
Si, pero hay que hacerlo manualmente: borra el nombre de la hoja de G1 y escribelo en la hoja de G2. La sincronizacion lo actualizara.

**P: Las columnas B, C, D estan vacias. Es normal?**
Si. Se rellenan cuando los profesores empiezan a pasar lista con la app. Hasta entonces muestran 0% y campos vacios.

**P: No veo el menu NovAttend.**
Cierra y vuelve a abrir el spreadsheet. El menu se carga al abrir el documento.

---

## Resumen rapido

```
1. Abre la hoja de grupo correcta (ej: MAR26 - Samuel - G1)
2. Escribe nombres en columna A, fila 3 en adelante
3. Un nombre por fila, sin huecos
4. No toques columnas B, C, D ni hojas del sistema
5. Listo — el sistema se encarga del resto
```
