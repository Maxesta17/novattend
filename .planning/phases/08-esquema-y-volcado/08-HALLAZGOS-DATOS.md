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

**Segunda correccion (2026-10-05), tras responder Aurora:** el parrafo de arriba
describe bien el mecanismo pero saca la conclusion equivocada. La tercera fila
**no debe bloquearse**: es otro curso. Lo unico que sobra es el clon, y ese si lo
bloquea la restriccion. Ver "Septiembre: dos cursos reales" mas abajo.

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

## Respuestas de Aurora (2026-10-05) y segunda lectura de la hoja

### Septiembre: dos cursos reales, no uno — RESUELTO

> "las dos son buenas, son cursos diferentes, los tengo separados por colores"

La hoja tiene tres filas de septiembre, y al leerlas con el formato original se
ve que **dos son la misma fecha escrita de dos maneras**:

```
conv-sept2026 | septiembre 2026 | 31/08/2026 | 23/12/2026
conv-sept26   | septiembre 2026 | 2026-08-31 | 2026-12-23   <- mismo periodo, otro id
conv-sept26   | septiembre 2026 | 2026-09-28 | 2026-12-18   <- otro periodo, id repetido
```

Lectura que encaja con la respuesta: **curso A** (31/08-23/12) y **curso B**
(28/09-18/12, el que declara la pestana separadora `[ SEPT26 ]`), mas un **clon**
de A creado al teclear el id dos veces.

Consecuencia para el esquema: `unique (lower(nombre), fecha_inicio)` hace
exactamente lo que hay que hacer — deja convivir A y B, rechaza el clon.
Verificado como prueba 13 en `08-pruebas-esquema.sql`.

**Lo que NO cubre ninguna restriccion:** los dos cursos se llaman igual. Aurora
los distingue **por el color de la pestana**, y el color no es un dato: ni la API
lo lee, ni sobrevive a una exportacion, ni llega al panel del CEO. De ahi que el
dashboard mostrara dos "septiembre 2026" indistinguibles. El volcado tiene que
convertir ese color en texto, es decir, **darles dos nombres distintos**.

**Pendiente de verificar en el volcado, no por deduccion:** a que id apuntan de
verdad las filas de ALUMNOS y ASISTENCIA. El volcado debe contar filas por id y
**negarse a continuar** si el id que piensa descartar tiene historial colgando.

### El CEO no escribe en la hoja — CONFIRMADO

> "de todos modos Rafa no se mete aqui"

Respalda el rol de solo lectura del CEO, ya implementado y probado (prueba 6 de
`08-pruebas-rls.sql`: ve todo, no puede escribir nada).

### Fichas de dos personas: pendiente de Aurora, pero el dano ya es medible

> "eso lo tengo que mirar porque asi de momento no lo se"

La segunda lectura permite cuantificarlo sin esperarla. En
`LINGNOVA - Elisabeth Shick - G2` hay una ficha que funde a dos alumnos en una
sola linea, al 14% con 28 clases. **Esos mismos dos alumnos figuran por separado
en `SEPT26 - Elisabeth Shick - G1`, al 100% cada uno.** Las dos cifras llegan al
dashboard del CEO y se contradicen.

En la misma pestana, un alumno aparece con el nombre completo en una convocatoria
y abreviado en la otra (14% frente a 74%). El volcado **no puede deduplicar por
nombre**, y no hace falta: cada convocatoria tiene su propia fila de alumno.

### Un profesor sigue en activo, su bloque acaba ahora

> "Efectivamente estan dando clase acaban ahora"

Importante por un motivo tecnico: las columnas "Ultima clase" y "Total clases" de
esa pestana marcan **13/05**, cinco meses atras. No es que el grupo este muerto:
es que esa pestana arrastra el **prefijo con espacio** (`ABR26 B1- Samuel - G2`),
y `actualizarEstadisticasGrupo` nunca la encuentra. Las estadisticas llevan
congeladas desde mayo.

**Regla para el volcado:** las columnas de porcentaje y fecha de las pestanas de
grupo son **derivadas y no fiables**. La unica fuente de verdad es ASISTENCIA.

### Stephanie ya no esta en la academia — RESUELTO

> "Stephanie no sigue con nosotros"

`usuarios.activo = false`. No se borra: su nombre cuelga del historial de
asistencia de sus alumnos, y `asistencia.alumno_id` es `on delete restrict`
precisamente para que una baja no se lleve datos por delante.

### Hallazgo nuevo: LING. ACDMY repite el patron de abril

```
CONVOCATORIAS:        conv-lingnova | fecha_fin 2026-10-31
Pestana [ LINGNOVA ]: Periodo: 12/05/2026 - 21/08/2026
```

Mismo parche que se aplico a abril el 2026-08-04: alargar `fecha_fin` para que la
convocatoria siguiera apareciendo. Hoy (05/10) sale activa aunque su periodo
declarado acabo el 21/08, y sus pestanas registran clases el 01/10. El volcado
necesita las **fechas reales**, no las parcheadas.

### Volumen: la hoja crece mientras migramos

| Pestana | 23/09 | 01/10 | 05/10 |
|---|---|---|---|
| ASISTENCIA | 3.409 | 3.540 | 3.585 |
| LOG | — | 1.461 | 1.485 |
| CONVOCATORIAS | 4 | 5 | 5 |

El volcado apunta a un blanco movil, asi que tiene que ser **repetible**: correrlo
dos veces no puede duplicar nada. De eso se encargan las claves unicas, ya
probadas.

## Lo que el volcado tiene que resolver

Actualizado 2026-10-05 con las respuestas de Aurora.

1. Separar `conv-abr26` en **dos** convocatorias (B1 y B2), con fechas reales.
2. **Septiembre: dos convocatorias, con los nombres que dio Aurora.**
   `Septiembre 2026 - Intensivo` (31/08-23/12: Christian G2, Elisabeth G1) y
   `Septiembre 2026 - Especial` (28/09-18/12: Myriam G1 y G2). El id
   `conv-sept2026` se descarta: comprobado que no tiene ni un alumno ni una
   marca. El volcado vuelve a comprobarlo antes de descartar, y se para si
   encuentra algo colgando.
3. **Fechas reales, no parcheadas:** tomar el periodo de las pestanas
   separadoras (`[ ABR26 ]`, `[ LINGNOVA ]`, `[ SEPT26 ]`), no la `fecha_fin` de
   CONVOCATORIAS, que esta alargada a mano en al menos dos convocatorias.
4. **NO dividir las fichas de dos personas.** Aurora confirmo que son clases en
   pareja: una matricula, una fila, un porcentaje. Se migran tal cual.
5. Normalizar fechas a ISO antes de insertar.
6. Mapear `ALUMNOS.grupo` (G1..G4) + `profesor_id` a la tabla `grupos` con
   nombre libre.
7. Dejar fuera a quien no sea profesor al migrar `PROFESORES` a `usuarios`:
   la tabla contiene tambien al CEO y a Aurora.
8. **Stephanie entra con `activo = false`** (ya no esta en la academia), sin
   borrar nada: su historial cuelga de la asistencia de sus alumnos.
9. **Ignorar las columnas de estadisticas** de las pestanas de grupo
   (porcentaje, ultima clase, total clases). Son derivadas y algunas llevan
   congeladas desde mayo por el bug del prefijo con espacio. Recalcular todo
   desde ASISTENCIA.

## Sigue pendiente de Aurora

Al 2026-10-08 queda **una sola cosa**, y no es una pregunta sino un alta.

1. ~~**Las fichas de dos personas**~~ — RESUELTO: son clases en pareja. Una fila.
2. ~~**Los dos grupos de Marta Battistella**~~ — la pregunta de "donde estan" esta
   RESUELTA con los datos: no existen en ningun sitio. Pero **sus alumnos siguen
   sin dar de alta**. Aurora respondio *"Tengo que mirarlo"* el 2026-10-08.
   Es lo unico que falta, y no bloquea el volcado: no hay nada que migrar.
3. ~~**Nombre para cada curso de septiembre**~~ — RESUELTO: "Especial" e
   "Intensivo".

## Lo que dicen los datos completos (2026-10-06)

Hasta ahora solo se veian **muestras** de las primeras filas de cada pestana. Esta
vez se exporto la hoja entera a `.xlsx` por el conector de Drive y se abrio aqui:
**las 3.618 filas de ASISTENCIA y los 94 de ALUMNOS, todas**. Dos de las cuatro
preguntas pendientes se contestan solas con eso.

### Marta Battistella no tiene alumnos. Ni uno. — RESUELTO

```
ALUMNOS    con profesor_id = prof-marta : 0 filas
ASISTENCIA con profesor_id = prof-marta : 0 marcas
Sus dos pestanas de grupo               : vacias
```

No es que esten "en otro sitio". **No estan en ningun sitio del sistema.** Si da
clase, esas clases no se registran en ninguna parte: ni en el panel del CEO, ni en
los porcentajes, ni en la base de datos nueva cuando se vuelque.

El volcado no puede inventarselos. Hay que darlos de alta.

### LING. ACDMY sigue viva — CORRECCION DE UNA AFIRMACION PROPIA

Mas arriba se dijo que repetia el patron de abril, con la `fecha_fin` alargada a
mano. **Falso.** Hay asistencia hasta el **2026-10-01**, asi que la convocatoria
esta en marcha en octubre y el `31/10` de CONVOCATORIAS es perfectamente creible.
Lo obsoleto es la **pestana separadora**, que declara `12/05 - 21/08`.

Es ademas minuscula: 6 alumnos y, en la practica, un solo grupo vivo.

```
prof-elisabeth G2 | 112 marcas | 28 dias | 2026-05-27 -> 2026-10-01
prof-elisabeth G1 |   4 marcas |  1 dia  | 2026-05-26
prof-sven      G4 |   1 marca  |  1 dia  | 2026-05-20   (despedido)
```

### Septiembre: los dos cursos se separan solos por fecha de inicio

```
prof-christian G2 | 189 marcas | 2026-08-31 -> 2026-10-05
prof-elisabeth G1 | 160 marcas | 2026-09-01 -> 2026-10-05
--------------------------------------------------------- corte
prof-myriam    G1 |  18 marcas | 2026-09-28 -> 2026-10-05
prof-myriam    G2 |  12 marcas | 2026-09-29 -> 2026-10-01
```

Dos bloques limpios que **encajan exactamente con las dos filas de CONVOCATORIAS**:
el curso que empieza el 31/08 (Christian y Elisabeth) y el que empieza el 28/09
(los dos grupos de Myriam). Aurora ya solo tiene que ponerles nombre; quien va en
cada uno lo deciden los datos.

### Abril se parte en dos bloques, y coinciden con los nombres de pestana

```
BLOQUE DE ABRIL  (las pestanas lo llaman B2)
  prof-myriam    G2 | 390 marcas | 2026-04-08 -> 2026-08-06
  prof-sonja     G3 | 333 marcas | 2026-04-08 -> 2026-07-27
  prof-christian G4 | 448 marcas | 2026-04-13 -> 2026-08-12
  prof-stephanie G1 | 301 marcas | 2026-04-13 -> 2026-07-30

BLOQUE DE MAYO   (las pestanas lo llaman B1) — SIGUE VIVO
  prof-nadine    G1 | 610 marcas | 2026-05-04 -> 2026-09-29
  prof-samuel    G2 | 790 marcas | 2026-05-04 -> 2026-10-05
  prof-elisabeth G1 | 250 marcas | 2026-05-25 -> 2026-08-31
```

El corte es nitido: o empiezas la semana del 8 de abril, o la del 4 de mayo. Nadie
en medio. Esto resuelve el punto 1 de la lista de arriba **sin preguntar a nadie**:
ya se sabe que grupo va a cada una de las dos convocatorias de abril.

Ojo al detalle contraintuitivo: **B1 es el bloque de mayo y B2 el de abril**, no al
reves.

### Samuel: la pestana tiene razon, la celda A1 no — RESUELTO

La pestana se llama `ABR26 B1- Samuel - G2` y su celda A1 dice `Samuel - G2 - B2`.
Su grupo empieza el **2026-05-04**, el mismo dia que el de Nadine, que es B1. Luego
**es B1** y la celda A1 esta mal. Y sigue dando clase: su ultima marca es de
**2026-10-05**. Es el grupo con mas actividad de toda la hoja (790 marcas).

### `conv-sept2026` esta muerto — el clon se puede descartar sin riesgo

```
ALUMNOS    con conv-sept2026 : 0
ASISTENCIA con conv-sept2026 : 0
```

Era la duda que quedaba: si el id que se descarta tenia historial colgando. **No
tiene nada.** Todo lo de septiembre se escribio bajo `conv-sept26`, que es
precisamente el id que comparten las DOS filas buenas. El problema real no es el
duplicado: es que **los dos cursos vivos comparten un mismo id**, y el backend
resuelve por id tomando la primera coincidencia.

### Los 7 alumnos de Stephanie siguen marcados como activos

Todos en `conv-abr26`, grupo G1, `activo = TRUE`. Pero su bloque (el de abril)
termino el **2026-07-30** y ella ya no esta en la academia. Son activos de una
convocatoria cerrada. El volcado los migra con su historial intacto, pero no deben
aparecer como alumnos en curso.

### Las dos convocatorias de septiembre ya tienen nombre — RESUELTO

Respuesta de Aurora (2026-10-08), literal:

> "Septiembre 2026 – Especial (es el de Myriam) y Septiembre 2026 - Intensivo
> (los de Christian y Elisabeth)"

**Coincide exactamente con el corte que habian marcado las fechas de clase.** El
reparto no era una suposicion: era correcto.

```
Septiembre 2026 - Intensivo | 31/08 - 23/12 | Christian G2, Elisabeth G1
Septiembre 2026 - Especial  | 28/09 - 18/12 | Myriam G1, Myriam G2
```

### Las fichas de dos nombres son clases en pareja — RESUELTO

> "Son clases en pareja, efectivamente"

Una pareja, una matricula, un porcentaje. **Se migran como una sola fila**, que es
como estan registradas hoy. Partirlas en dos seria inventar un historial que nadie
ha llevado nunca.

**Correccion a una afirmacion propia:** se escribio mas arriba que esas dos
personas "figuran por separado al 100% en el grupo de septiembre y al 14% en la
ficha conjunta, y las dos cifras se contradicen". **No se contradicen.** Son dos
matriculas distintas en dos convocatorias distintas: en LINGNOVA van en pareja y
en septiembre van cada uno por su cuenta. El modelo nuevo lo soporta sin tocar
nada, porque cada convocatoria tiene su propia fila de alumno.

### LING. ACDMY acaba el 31/10 — RESUELTO

> "El 31/10 es la fecha buena."

Confirma lo que ya decian los datos: la convocatoria esta viva y la fecha de
CONVOCATORIAS es la correcta. La obsoleta es la pestana separadora (`12/05 - 21/08`).

### Nota sobre el canal: contesto a Manu, no al bot

Las preguntas le llegaron por el mensaje directo del bot y **las leyo** — sus cuatro
respuestas van numeradas y en orden. Pero contesto en su conversacion con Manu, no
al bot. La revision automatica que vigila el DM nunca lo habria visto.

Conclusion practica: **el bot sirve para preguntar, no para escuchar.** Las
respuestas hay que recogerlas por donde ella escribe de verdad.

### Abril sigue recibiendo asistencia HOY

`conv-abr26` acumula 3.122 marcas y la ultima es del **2026-10-05**. La convocatoria
de abril no es un residuo: es, con diferencia, la mas usada de la hoja. Cualquier
cosa que se haga con ella al volcar afecta a gente que esta dando clase ahora.
