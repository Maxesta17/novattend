# Guia de Setup - Google Sheet Backend

## Paso 1: Crear el Google Sheet

1. Ve a [Google Sheets](https://sheets.google.com) y crea un nuevo spreadsheet.
2. Renombralo a **"NovAttend - Control de Asistencia"**.

## Paso 2: Abrir el editor de Apps Script

1. En el menu del Sheet: **Extensiones > Apps Script**.
2. Se abrira el editor en una nueva pestana.
3. Borra todo el contenido del archivo `Code.gs` que aparece por defecto.
4. Copia y pega el contenido completo del archivo `docs/apps-script/Code.gs` de este proyecto.
5. Pulsa **Ctrl+S** para guardar.

## Paso 3: Ejecutar el setup inicial

1. En el editor de Apps Script, selecciona la funcion `setupSheets` en el desplegable de funciones (arriba).
2. Pulsa el boton **Ejecutar** (triangulo).
3. La primera vez te pedira permisos:
   - Pulsa "Revisar permisos".
   - Selecciona tu cuenta de Google.
   - Pulsa "Avanzado" > "Ir a NovAttend (no seguro)".
   - Pulsa "Permitir".
4. Vuelve al Google Sheet. Deberias ver las 5 hojas creadas:
   - CONVOCATORIAS
   - PROFESORES
   - ALUMNOS
   - ASISTENCIA
   - LOG

## Paso 4: Cargar datos iniciales

### 4.1 Profesores

Ve a la hoja **PROFESORES** y anade tus profesores:

| id | nombre | email | activo |
|----|--------|-------|--------|
| prof-samuel | Samuel | samuel@lingnova.com | [x] |
| prof-maria | Maria Wolf | maria@lingnova.com | [x] |
| prof-nadine | Nadine | nadine@lingnova.com | [x] |
| prof-marta | Marta Battistella | marta@lingnova.com | [x] |
| prof-elisabeth | Elisabeth Shick | elisabeth@lingnova.com | [x] |
| prof-myriam | Myriam Marcia | myriam@lingnova.com | [x] |
| prof-sonja | Sonja | sonja@lingnova.com | [x] |

### 4.2 Convocatorias

Ve a la hoja **CONVOCATORIAS** y crea tu primera convocatoria:

| id | nombre | fecha_inicio | fecha_fin | activa |
|----|--------|-------------|-----------|--------|
| conv-2026-04 | Abril 2026 | 01/04/2026 | 30/11/2026 | [x] |

### 4.3 Alumnos

Ve a la hoja **ALUMNOS**. Para cada alumno, anade una fila.

**Opcion rapida:** Usa el script de migracion (`docs/apps-script/Migracion.gs`) para importar automaticamente los 336 alumnos del Sheet actual. Ver instrucciones abajo.

**Opcion manual:** Anade filas una a una con el formato:

| id | nombre | convocatoria_id | profesor_id | grupo | email | telefono | activo |
|----|--------|----------------|-------------|-------|-------|----------|--------|
| alu-001 | Rosa Cruz Ruiz | conv-2026-04 | prof-samuel | G1 | | | [x] |

## Paso 5: Desplegar como Web App

1. En el editor de Apps Script: **Implementar > Nueva implementacion**.
2. Tipo: **App web**.
3. Configuracion:
   - Descripcion: `NovAttend API v1`
   - Ejecutar como: **Yo** (tu cuenta)
   - Quien tiene acceso: **Cualquier persona**
4. Pulsa **Implementar**.
5. Copia la URL que aparece. Tiene este formato:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```
6. Esa URL es la que se configura en la app React.

## Paso 6: Probar la API

Abre en tu navegador:

```
https://script.google.com/macros/s/TU_ID/exec?action=ping
```

Deberias ver:
```json
{"status":"ok","data":{"message":"NovAttend API activa"},"timestamp":"..."}
```

Otros tests:
```
?action=getConvocatorias
?action=getProfesores
?action=getAlumnos&convocatoria_id=conv-2026-04&profesor_id=prof-samuel
```

## Paso 7: Actualizar la API

Cada vez que modifiques el `Code.gs`:

1. Guarda los cambios (Ctrl+S).
2. **Implementar > Gestionar implementaciones**.
3. Pulsa el icono de lapiz en tu implementacion activa.
4. Cambia "Version" a **Nueva version**.
5. Pulsa **Implementar**.

**IMPORTANTE:** Si no creas una nueva version, los cambios NO se reflejaran en la URL publica.

## Notas importantes

- La URL de la API **no cambia** entre versiones. Solo cambia si creas una implementacion nueva.
- Los datos del Sheet son accesibles **solo** a traves de la API. Los profesores no necesitan acceso al Sheet.
- Para hacer backups, usa **Archivo > Historial de versiones** en Google Sheets.
- Google Apps Script tiene un limite de 6 minutos por ejecucion y ~20.000 llamadas/dia (mas que suficiente).
