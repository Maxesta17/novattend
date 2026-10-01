# Fase 7 — Glosario y modelo de dominio

**Cerrado:** 2026-10-01, con el dueno del producto.
**Resuelve:** VOC-01, VOC-02.

Este documento manda sobre cualquier nombre usado en el codigo, la interfaz o
las conversaciones con Aurora. Si algo no encaja aqui, se cambia el codigo, no
el glosario.

---

## Los terminos

| Termino | Que es | Lo que NO es |
|---|---|---|
| **Convocatoria** | Un **periodo** con fecha de inicio y fin. Ej: "abril a septiembre". | NO es el grupo de un profesor. Aurora lo usaba asi al hablar. |
| **Grupo** | Un conjunto de alumnos con **un profesor**. Varios por convocatoria. Nombre **libre** ("Grupo A"). | NO esta limitado a G1-G4 ni a cuatro por profesor. |
| **Clase particular** | Un alumno, un profesor, **sin grupo**. Entidad propia. | NO es un grupo de un alumno de cara al usuario. |
| **Alumno** | Persona matriculada en **UNA** convocatoria. Dentro de ella esta en un grupo o en clase particular. | NO puede estar en dos convocatorias a la vez. |
| **Profesor** | Lleva uno o varios grupos y/o clases particulares. **Reasignable**. | NO esta atado de por vida a un grupo. |

## Reglas acordadas

1. **Un alumno pertenece a una sola convocatoria.** Si se apunta al periodo
   siguiente, es una matricula nueva.
2. **Un profesor puede llevar varios grupos.** Myriam lleva dos.
3. **Todo es reasignable:** un profesor puede dejar su puesto y entrar otro en
   su grupo; un alumno puede cambiar de grupo (tipicamente por horario).
4. **Los nombres de grupo los pone Aurora**, sin lista cerrada.
5. **La participacion de un profesor en una convocatoria es EXPLICITA.** La regla
   "todos los profesores participan en todas las convocatorias activas" que
   afirma CLAUDE.md es FALSA y se retira: hoy el codigo crea 4 grupos por cada
   profesor activo (36 pestanas) y Aurora borra a mano las que sobran.

## Decision de modelado que se deriva (importante)

**La asistencia cuelga del ALUMNO dentro de la convocatoria, no del grupo.**

Es consecuencia directa de la regla 3. Hoy el historial va atado al grupo, y por
eso existe `transferirHistorial()`, que hay que acordarse de ejecutar a mano al
mover a alguien — ver [[project_mover_alumno_flow]]. Con el historial colgando
del alumno:

- Mover un alumno de grupo deja de tener consecuencias: su asistencia le sigue.
  `transferirHistorial()` desaparece.
- Cambiar el profesor de un grupo no toca ningun historial. Solo cambia quien
  recibe el recordatorio de las 20h.
- Grupo y clase particular comparten asistencia, porcentajes, alertas y resumen
  del CEO **sin duplicar la logica**, pese a ser entidades distintas.

El grupo (o la clase particular) queda como el **sitio donde esta el alumno
ahora**, no como el dueno de su pasado.

## VOC-02 — Las "tandas" B1/B2: resueltas, no se modelan

No hace falta una entidad nueva. Con la definicion de convocatoria como periodo,
los bloques de abril son **dos convocatorias distintas mal fusionadas en una**:

| Pestanas | Profesores | Estado (Aurora, 2026-10-01) |
|---|---|---|
| `ABR26 B1` | Samuel, Nadine | Sigue vivo ("en verdad es Mayo") |
| `ABR26 B2` | Stephanie, Myriam, Sonja, Christian | Termino |

Dos periodos distintos compartiendo el id `conv-abr26`, con el bloque existiendo
solo como texto anadido a mano al nombre de la pestana — lo que ademas rompe la
sincronizacion en 6 de 11 pestanas ([[project_prefijo_hojas_bloque]]).

**Al migrar se separan en dos convocatorias.** Un concepto menos, y deja de ser
imposible cerrar una sin cerrar la otra.

## Pendiente de confirmar con Aurora

- Si un profesor es sustituido a mitad de periodo, el recordatorio de las 20h
  debe ir al profesor **actual** del grupo. Asumido; confirmar que no hace falta
  avisar tambien al anterior.
- Stephanie aparece en `ABR26 B2` pero Aurora no la nombro al decir que ese
  bloque termino. Confirmar antes de separar las convocatorias.
