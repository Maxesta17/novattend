-- NovAttend — pruebas del esquema (fase 8)
--   psql "$DB_URL" -f supabase/tests/08-pruebas-esquema.sql
--
-- Cada bloque comprueba que una restriccion RECHAZA lo que debe rechazar.
-- Todos los descuadres que arrastra la hoja de calculo existen porque nada
-- impedia crearlos. Aqui se verifica que ahora si se impiden.
-- Datos inventados; al final rollback, no queda nada.

begin;

insert into convocatorias (id, nombre, fecha_inicio, fecha_fin) values
  ('11111111-1111-1111-1111-111111111111', 'Convocatoria Test', '2026-01-01', '2026-06-30'),
  ('22222222-2222-2222-2222-222222222222', 'Otra Convocatoria', '2026-02-01', '2026-07-31');

insert into usuarios (id, nombre, email, rol) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Profe Uno', 'profe1@example.com', 'teacher'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Profe Dos', 'profe2@example.com', 'teacher');

insert into grupos (id, convocatoria_id, nombre, profesor_id) values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', 'Grupo A',
   'aaaaaaaa-0000-0000-0000-000000000001');

insert into alumnos (id, convocatoria_id, nombre, grupo_id) values
  ('cccccccc-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', 'Alumno Uno',
   'bbbbbbbb-0000-0000-0000-000000000001');

-- 1. Convocatoria duplicada — el fallo REAL: la hoja tuvo tres "septiembre 2026"
do $$ begin
  begin
    insert into convocatorias (nombre, fecha_inicio, fecha_fin)
    values ('CONVOCATORIA TEST', '2026-01-01', '2026-06-30');
    raise exception 'FALLO 1: acepto una convocatoria duplicada';
  exception when unique_violation then
    raise notice 'OK 1 - convocatoria duplicada rechazada (ignora mayusculas)';
  end;
end $$;

-- 2. Periodo invalido
do $$ begin
  begin
    insert into convocatorias (nombre, fecha_inicio, fecha_fin)
    values ('Al reves', '2026-06-30', '2026-01-01');
    raise exception 'FALLO 2: acepto fecha_fin anterior a fecha_inicio';
  exception when check_violation then
    raise notice 'OK 2 - periodo invalido rechazado';
  end;
end $$;

-- 3. Alumno en dos sitios, y alumno en ninguno
do $$ begin
  begin
    insert into alumnos (convocatoria_id, nombre, grupo_id, profesor_particular_id)
    values ('11111111-1111-1111-1111-111111111111', 'Doble',
            'bbbbbbbb-0000-0000-0000-000000000001',
            'aaaaaaaa-0000-0000-0000-000000000002');
    raise exception 'FALLO 3a: acepto alumno en grupo Y en clase particular';
  exception when check_violation then
    raise notice 'OK 3a - alumno en dos sitios rechazado';
  end;
  begin
    insert into alumnos (convocatoria_id, nombre)
    values ('11111111-1111-1111-1111-111111111111', 'Huerfano');
    raise exception 'FALLO 3b: acepto alumno sin ubicacion';
  exception when check_violation then
    raise notice 'OK 3b - alumno sin ubicacion rechazado';
  end;
end $$;

-- 4. Alumno de una convocatoria en grupo de OTRA (falsearia al CEO)
do $$ begin
  begin
    insert into alumnos (convocatoria_id, nombre, grupo_id)
    values ('22222222-2222-2222-2222-222222222222', 'Cruzado',
            'bbbbbbbb-0000-0000-0000-000000000001');
    raise exception 'FALLO 4: acepto alumno con grupo de otra convocatoria';
  exception when foreign_key_violation then
    raise notice 'OK 4 - alumno con grupo de otra convocatoria rechazado';
  end;
end $$;

-- 5. Alumno duplicado: hace el volcado REPETIBLE
do $$ begin
  begin
    insert into alumnos (convocatoria_id, nombre, grupo_id)
    values ('11111111-1111-1111-1111-111111111111', 'ALUMNO UNO',
            'bbbbbbbb-0000-0000-0000-000000000001');
    raise exception 'FALLO 5: acepto alumno duplicado';
  exception when unique_violation then
    raise notice 'OK 5 - alumno duplicado rechazado';
  end;
end $$;

-- 6. Doble marca el mismo dia (el guardado fantasma por reintento)
insert into asistencia (alumno_id, fecha, presente)
values ('cccccccc-0000-0000-0000-000000000001', '2026-03-10', true);

do $$ begin
  begin
    insert into asistencia (alumno_id, fecha, presente)
    values ('cccccccc-0000-0000-0000-000000000001', '2026-03-10', false);
    raise exception 'FALLO 6: acepto dos marcas el mismo dia';
  exception when unique_violation then
    raise notice 'OK 6 - doble marca diaria rechazada';
  end;
end $$;

-- 7. Fecha fuera del periodo (trigger)
do $$ begin
  begin
    insert into asistencia (alumno_id, fecha, presente)
    values ('cccccccc-0000-0000-0000-000000000001', '2026-12-25', true);
    raise exception 'FALLO 7: acepto asistencia fuera del periodo';
  exception when others then
    raise notice 'OK 7 - fecha fuera del periodo rechazada';
  end;
end $$;

-- 8. Justificar a quien SI vino
do $$ begin
  begin
    insert into asistencia (alumno_id, fecha, presente, justificada)
    values ('cccccccc-0000-0000-0000-000000000001', '2026-03-11', true, true);
    raise exception 'FALLO 8: acepto justificar a un presente';
  exception when check_violation then
    raise notice 'OK 8 - justificar a un presente rechazado';
  end;
end $$;

-- 9. La auditoria se escribe SOLA (trigger, no aplicacion)
update asistencia set presente = false
where alumno_id = 'cccccccc-0000-0000-0000-000000000001' and fecha = '2026-03-10';

do $$
declare n int;
begin
  select count(*) into n from asistencia_cambios where accion = 'update';
  if n <> 1 then raise exception 'FALLO 9: auditoria registro % filas, esperaba 1', n; end if;
  raise notice 'OK 9 - auditoria escrita por el trigger';
end $$;

-- 10. Un update inocuo NO ensucia la auditoria
update asistencia set motivo = motivo
where alumno_id = 'cccccccc-0000-0000-0000-000000000001' and fecha = '2026-03-10';

do $$
declare n int;
begin
  select count(*) into n from asistencia_cambios;
  if n <> 1 then raise exception 'FALLO 10: auditoria crecio a % con update inocuo', n; end if;
  raise notice 'OK 10 - update sin cambios no ensucia la auditoria';
end $$;

-- 11. Borrar un alumno no se lleva su historial por delante
do $$ begin
  begin
    delete from alumnos where id = 'cccccccc-0000-0000-0000-000000000001';
    raise exception 'FALLO 11: permitio borrar alumno con asistencia';
  exception when foreign_key_violation then
    raise notice 'OK 11 - borrado de alumno con historial bloqueado';
  end;
end $$;

-- 12. La vista de activas usa hora de Madrid, no UTC
do $$
declare n int;
begin
  insert into convocatorias (nombre, fecha_inicio, fecha_fin)
  values ('Vigente Hoy',
          (now() at time zone 'Europe/Madrid')::date,
          (now() at time zone 'Europe/Madrid')::date);
  select count(*) into n from convocatorias_activas where nombre = 'Vigente Hoy';
  if n <> 1 then raise exception 'FALLO 12: convocatoria de hoy no sale activa'; end if;
  raise notice 'OK 12 - vista de activas correcta en hora de Madrid';
end $$;

-- 13. Las DOS convocatorias de septiembre que Aurora confirma como cursos
--     distintos tienen que CONVIVIR; el clon de una de ellas, no.
--     Respuesta de Aurora (2026-10-05): "las dos son buenas, son cursos
--     diferentes, los tengo separados por colores".
do $$
declare n int;
begin
  -- Curso A: el periodo largo
  insert into convocatorias (nombre, fecha_inicio, fecha_fin)
  values ('septiembre 2026', '2026-08-31', '2026-12-23');
  -- Curso B: otro curso, otro periodo, mismo nombre. DEBE entrar.
  insert into convocatorias (nombre, fecha_inicio, fecha_fin)
  values ('septiembre 2026', '2026-09-28', '2026-12-18');

  select count(*) into n from convocatorias where nombre = 'septiembre 2026';
  if n <> 2 then
    raise exception 'FALLO 13a: deberian convivir 2 cursos de septiembre, hay %', n;
  end if;

  -- El clon: mismo nombre, misma fecha_inicio, solo cambia el formato en origen
  -- ('31/08/2026' frente a '2026-08-31'). Es el que sobra.
  begin
    insert into convocatorias (nombre, fecha_inicio, fecha_fin)
    values ('septiembre 2026', '2026-08-31', '2026-12-23');
    raise exception 'FALLO 13b: acepto el clon de septiembre';
  exception when unique_violation then
    raise notice 'OK 13 - conviven los 2 cursos de septiembre, el clon se rechaza';
  end;
end $$;

rollback;
