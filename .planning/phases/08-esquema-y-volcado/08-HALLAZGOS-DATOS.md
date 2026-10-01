# Fase 8 — Estado real de los datos origen

**Leido:** 2026-10-01, con el conector de Google Drive (`read_file_content`).
**Sin nombres de alumnos ni credenciales:** el repositorio es publico.

## Desbloqueo

El MCP `google-sheets` lleva dias caido, pero **no hace falta**: el conector de
Google Drive lee hojas de calculo completas. Un bloqueante menos para el volcado.

Limite conocido: devuelve una representacion en texto, con muestras de las
primeras filas por pestana. Sirve para estructura, recuentos y deteccion de
descuadres. Para volcar las 3.540 filas de ASISTENCIA habra que exportar a CSV
o leer por rangos.

## Volumen actual

| Pestana | Filas | Nota |
|---|---|---|
| CONVOCATORIAS | 5 | eran 4 el 23/09 |
| PROFESORES | 11 | incluye CEO y Aurora |
| ALUMNOS | 94 | |
| ASISTENCIA | 3.540 | eran 3.409 el 23/09 |
| LOG | 1.461 | |
| Pestanas de grupo | 13 | eran 11 el 23/09 |

## Descuadres detectados (ordenados por gravedad)

### 1. Dos convocatorias comparten el MISMO id — nuevo, posterior al 23/09

```
conv-sept2026 | septiembre 2026 | 31/08/2026 | 23/12/2026 | TRUE
conv-sept26   | septiembre 2026 | 31/08/2026 | 23/12/2026 | TRUE
conv-sept26   | septiembre 2026 | 28/09/2026 | 18/12/2026 | TRUE   <-- id repetido
```

El backend resuelve por id y toma la primera coincidencia, asi que la fila con
el periodo real (28/09 a 18/12, que es lo que declara la hoja separadora
`[ SEPT26 ]`) puede estar siendo ignorada.

**Correccion a una afirmacion propia:** se defendio que `unique(lower(nombre),
fecha_inicio)` habria evitado el duplicado. **Insuficiente**: habria bloqueado
las dos primeras filas, no la tercera, porque su `fecha_inicio` difiere. Lo que
cierra el agujero es la clave primaria sobre el id, que Postgres da y una hoja
de calculo no tiene. El hallazgo #11 de la revision era correcto en el fondo.

### 2. Dos profesores sin ningun alumno

`LINGNOVA - Marta Battistella - G1` y `- G2` estan vacias: rango `A1:D2`, solo
cabeceras. Aurora afirma que si tiene alumnos y que "no le salen". Si los
escribio, no estan donde el sistema lee. Pendiente de ella.

### 3. Fichas que contienen DOS personas

En `LINGNOVA - Elisabeth Shick - G2` hay 2 de 4 fichas que nombran a dos
personas cada una (una dice "y pareja", otra une dos nombres con "y").

Consecuencia: **dos personas comparten un unico porcentaje de asistencia**, y
ese numero es el que llega al dashboard del CEO. Es ademas el sintoma del hueco
que llevo a DAT-02: el modelo obliga a todo alumno a estar en un grupo, y las
clases de pareja no caben en ningun sitio.

### 4. Una pestana se contradice a si misma

Pestana `ABR26 B1- Samuel - G2`; su celda A1 declara `Samuel - G2 - B2`.
B1 sigue activo y B2 termino, asi que de esto depende si Samuel sigue dando
clase. Pendiente de Aurora.

### 5. El periodo original de abril quedo registrado

La hoja separadora `[ ABR26 ]` conserva `Periodo: 06/04/2026 - 31/07/2026`,
mientras CONVOCATORIAS dice `fecha_fin = 31/10/2026`. Confirma documentalmente
que el 31/10 fue el parche aplicado el 2026-08-04 y no una fecha real.
Al separar B1 y B2 en dos convocatorias hay que fijar fechas de verdad.

### 6. Formatos de fecha mezclados en la misma columna

`CONVOCATORIAS.fecha_inicio` combina `5/04/2026` y `2026-05-12`. El backend lo
normaliza al leer, asi que no rompe hoy, pero el volcado debe normalizar
explicitamente y no fiarse del orden de los campos.

## Lo que el volcado tiene que resolver

1. Separar `conv-abr26` en **dos** convocatorias (B1 y B2), con fechas reales.
2. Elegir una sola convocatoria de septiembre y reasignar su asistencia.
3. Dividir las fichas de dos personas, repartiendo o duplicando su historial —
   decision de negocio pendiente.
4. Normalizar fechas a ISO antes de insertar.
5. Mapear `ALUMNOS.grupo` (G1..G4) + `profesor_id` a la tabla `grupos` con
   nombre libre.
6. Dejar fuera a quien no sea profesor al migrar `PROFESORES` a `usuarios`:
   la tabla contiene tambien al CEO y a Aurora.
