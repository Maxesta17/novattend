-- NovAttend — pruebas de SEGURIDAD (Row Level Security), fase 8
--
-- 08-pruebas-esquema.sql verifica que los datos imposibles se rechazan.
-- Estas verifican algo distinto y mas peligroso de dar por hecho: que CADA
-- PERSONA solo ve y toca lo suyo.
--
-- Un RLS escrito y no probado es peor que no tenerlo: aparenta proteger.
-- Datos inventados; al final rollback.

begin;

insert into auth.users (id, instance_id, aud, role, email) values
  ('f0000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profe.a@example.com'),
  ('f0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profe.b@example.com'),
  ('f0000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ceo@example.com'),
  ('f0000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.com');

insert into usuarios (id, auth_id, nombre, email, rol) values
  ('a0000000-0000-0000-0000-00000000000a', 'f0000000-0000-0000-0000-00000000000a', 'Profe A', 'profe.a@example.com', 'teacher'),
  ('a0000000-0000-0000-0000-00000000000b', 'f0000000-0000-0000-0000-00000000000b', 'Profe B', 'profe.b@example.com', 'teacher'),
  ('a0000000-0000-0000-0000-00000000000c', 'f0000000-0000-0000-0000-00000000000c', 'Jefe',    'ceo@example.com',    'ceo'),
  ('a0000000-0000-0000-0000-00000000000d', 'f0000000-0000-0000-0000-00000000000d', 'Gestora', 'admin@example.com',  'admin');

insert into convocatorias (id, nombre, fecha_inicio, fecha_fin) values
  ('c0000000-0000-0000-0000-000000000001', 'Curso RLS',
   (now() at time zone 'Europe/Madrid')::date - 30,
   (now() at time zone 'Europe/Madrid')::date + 30);

insert into grupos (id, convocatoria_id, nombre, profesor_id) values
  ('90000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000001', 'Grupo de A', 'a0000000-0000-0000-0000-00000000000a'),
  ('90000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-000000000001', 'Grupo de B', 'a0000000-0000-0000-0000-00000000000b');

insert into alumnos (id, convocatoria_id, nombre, grupo_id) values
  ('e0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000001', 'Alumno de A', '90000000-0000-0000-0000-00000000000a'),
  ('e0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-000000000001', 'Alumno de B', '90000000-0000-0000-0000-00000000000b');

insert into asistencia (id, alumno_id, fecha, presente) values
  ('d0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-00000000000a',
   (now() at time zone 'Europe/Madrid')::date, true),
  ('d0000000-0000-0000-0000-00000000000b', 'e0000000-0000-0000-0000-00000000000b',
   (now() at time zone 'Europe/Madrid')::date, true),
  -- Marca antigua de A, para probar la ventana retroactiva de 2 dias
  ('d0000000-0000-0000-0000-0000000000aa', 'e0000000-0000-0000-0000-00000000000a',
   (now() at time zone 'Europe/Madrid')::date - 10, true);

-- Helper: entrar como un usuario concreto
create or replace function entrar_como(p_auth_id uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_auth_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

-- 1. Un profesor NO ve a los alumnos de otro
do $$
declare n int;
begin
  perform entrar_como('f0000000-0000-0000-0000-00000000000a');
  select count(*) into n from alumnos;
  if n <> 1 then raise exception 'FALLO 1: Profe A ve % alumnos, deberia ver 1', n; end if;
  raise notice 'OK 1 - el profesor solo ve a sus alumnos';
end $$;
reset role;

-- 2. Un profesor NO ve la asistencia de alumnos ajenos
do $$
declare n int;
begin
  perform entrar_como('f0000000-0000-0000-0000-00000000000b');
  select count(*) into n from asistencia;
  if n <> 1 then raise exception 'FALLO 2: Profe B ve % marcas, deberia ver 1', n; end if;
  raise notice 'OK 2 - el profesor solo ve la asistencia de los suyos';
end $$;
reset role;

-- 3. Un profesor NO puede marcar asistencia de un alumno ajeno
do $$ begin
  perform entrar_como('f0000000-0000-0000-0000-00000000000a');
  begin
    insert into asistencia (alumno_id, fecha, presente)
    values ('e0000000-0000-0000-0000-00000000000b',
            (now() at time zone 'Europe/Madrid')::date - 1, false);
    raise exception 'FALLO 3: Profe A marco asistencia de un alumno ajeno';
  exception when insufficient_privilege then
    raise notice 'OK 3 - marcar asistencia ajena bloqueado';
  end;
end $$;
reset role;

-- 4. Ventana retroactiva: el profesor NO corrige mas atras de 2 dias.
--    Si pudiera, cambiaria numeros antiguos del CEO sin pasar por Aurora.
do $$
declare filas int;
begin
  perform entrar_como('f0000000-0000-0000-0000-00000000000a');
  update asistencia set presente = false
  where id = 'd0000000-0000-0000-0000-0000000000aa';
  get diagnostics filas = row_count;
  if filas <> 0 then raise exception 'FALLO 4: corrigio una marca de hace 10 dias'; end if;
  raise notice 'OK 4 - correccion fuera de la ventana de 2 dias bloqueada';
end $$;
reset role;

-- 5. El profesor SI corrige lo de hoy
do $$
declare filas int;
begin
  perform entrar_como('f0000000-0000-0000-0000-00000000000a');
  update asistencia set presente = false
  where id = 'd0000000-0000-0000-0000-00000000000a';
  get diagnostics filas = row_count;
  if filas <> 1 then raise exception 'FALLO 5: no pudo corregir la marca de hoy'; end if;
  raise notice 'OK 5 - el profesor corrige lo de hoy';
end $$;
reset role;

-- 6. El CEO lo ve TODO pero no escribe nada
do $$
declare n int;
begin
  perform entrar_como('f0000000-0000-0000-0000-00000000000c');
  select count(*) into n from alumnos;
  if n <> 2 then raise exception 'FALLO 6a: el CEO ve % alumnos, deberia ver 2', n; end if;
  begin
    insert into alumnos (convocatoria_id, nombre, grupo_id)
    values ('c0000000-0000-0000-0000-000000000001', 'Colado',
            '90000000-0000-0000-0000-00000000000a');
    raise exception 'FALLO 6b: el CEO pudo crear un alumno';
  exception when insufficient_privilege then
    raise notice 'OK 6 - el CEO lo ve todo y no escribe nada';
  end;
end $$;
reset role;

-- 7. Aurora (admin) ve todo y SI escribe
do $$
declare n int;
begin
  perform entrar_como('f0000000-0000-0000-0000-00000000000d');
  select count(*) into n from alumnos;
  if n <> 2 then raise exception 'FALLO 7a: la admin ve % alumnos, deberia ver 2', n; end if;
  insert into alumnos (convocatoria_id, nombre, grupo_id)
  values ('c0000000-0000-0000-0000-000000000001', 'Alta por Aurora',
          '90000000-0000-0000-0000-00000000000a');
  raise notice 'OK 7 - la admin ve todo y puede dar de alta';
end $$;
reset role;

-- 8. NADIE escribe a mano en la auditoria. Solo el trigger.
do $$ begin
  perform entrar_como('f0000000-0000-0000-0000-00000000000d');
  begin
    insert into asistencia_cambios
      (asistencia_id, cambiado_por, accion, valor_anterior, valor_nuevo)
    values ('d0000000-0000-0000-0000-00000000000a',
            'a0000000-0000-0000-0000-00000000000d', 'update', '{}'::jsonb, '{}'::jsonb);
    raise exception 'FALLO 8: se pudo falsear la auditoria a mano';
  exception when insufficient_privilege then
    raise notice 'OK 8 - escribir en la auditoria a mano bloqueado';
  end;
end $$;
reset role;

-- 9. El profesor NO lee la auditoria (es cosa de Aurora y del CEO)
do $$
declare n int;
begin
  perform entrar_como('f0000000-0000-0000-0000-00000000000a');
  select count(*) into n from asistencia_cambios;
  if n <> 0 then raise exception 'FALLO 9: el profesor leyo % filas de auditoria', n; end if;
  raise notice 'OK 9 - el profesor no lee la auditoria';
end $$;
reset role;

-- 10. Sin sesion no se ve NADA. Es el escenario del hallazgo bloqueante:
--     cualquiera con la clave publica, que viaja dentro de la app.
do $$
declare n int;
begin
  perform set_config('request.jwt.claims', null, true);
  execute 'set local role anon';
  select count(*) into n from alumnos;
  if n <> 0 then raise exception 'FALLO 10: un anonimo vio % alumnos', n; end if;
  raise notice 'OK 10 - sin sesion no se ve ningun alumno';
end $$;
reset role;

rollback;
