-- NovAttend — Row Level Security (fase 8)
--
-- POR QUE ESTE ARCHIVO EXISTE: en Supabase, toda tabla del esquema `public`
-- queda expuesta por la API con la clave publica. Sin RLS, cualquiera con esa
-- clave lee y escribe la asistencia y los emails de ~300 alumnos.
-- El borrador inicial no lo tenia. Hallazgo bloqueante #1 de la revision.

alter table convocatorias       enable row level security;
alter table usuarios            enable row level security;
alter table grupos              enable row level security;
alter table alumnos             enable row level security;
alter table asistencia          enable row level security;
alter table asistencia_cambios  enable row level security;
-- Sin politicas, el acceso queda DENEGADO por defecto. Ese es el punto de
-- partida correcto: se abre lo justo, no se cierra lo que sobra.

-- ============================================================
-- Funcion de apoyo
-- security definer es obligatorio: una politica sobre `usuarios` que
-- consultara `usuarios` entraria en bucle infinito.
-- El rol se lee de la TABLA, nunca de user_metadata del JWT, que el propio
-- usuario puede editar.
-- ============================================================
create or replace function actual()
returns table (usuario_id uuid, rol text)
language sql stable security definer set search_path = '' as $$
  select u.id, u.rol from public.usuarios u
  where u.auth_id = (select auth.uid()) and u.activo
$$;

create or replace function es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.actual() a where a.rol = 'admin')
$$;

create or replace function puede_leer_todo() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.actual() a where a.rol in ('admin','ceo'))
$$;

-- ============================================================
-- CONVOCATORIAS — todos leen, solo admin escribe
-- ============================================================
create policy conv_leer on convocatorias for select
  using ((select auth.uid()) is not null);
create policy conv_escribir on convocatorias for all
  using (es_admin()) with check (es_admin());

-- ============================================================
-- USUARIOS — el profesor solo su ficha; admin todo; CEO lee
-- ============================================================
create policy usuarios_propia on usuarios for select
  using (auth_id = (select auth.uid()) or puede_leer_todo());
create policy usuarios_admin on usuarios for all
  using (es_admin()) with check (es_admin());

-- ============================================================
-- GRUPOS — el profesor ve los suyos
-- ============================================================
create policy grupos_leer on grupos for select
  using (
    puede_leer_todo()
    or profesor_id in (select a.usuario_id from actual() a)
  );
create policy grupos_admin on grupos for all
  using (es_admin()) with check (es_admin());

-- ============================================================
-- ALUMNOS — los de sus grupos, o sus particulares
-- ============================================================
create policy alumnos_leer on alumnos for select
  using (
    puede_leer_todo()
    or profesor_particular_id in (select a.usuario_id from actual() a)
    or grupo_id in (
      select g.id from grupos g
      where g.profesor_id in (select a.usuario_id from actual() a)
    )
  );
create policy alumnos_admin on alumnos for all
  using (es_admin()) with check (es_admin());

-- ============================================================
-- ASISTENCIA — el profesor marca la de SUS alumnos.
-- Hacen falta select + insert + update para que el upsert funcione.
-- El `with check` impide apuntar a un alumno ajeno.
-- ============================================================
create or replace function es_alumno_mio(p_alumno_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.alumnos al
    where al.id = p_alumno_id
      and (
        al.profesor_particular_id in (select a.usuario_id from public.actual() a)
        or al.grupo_id in (
          select g.id from public.grupos g
          where g.profesor_id in (select a.usuario_id from public.actual() a)
        )
      )
  )
$$;

create policy asist_leer on asistencia for select
  using (puede_leer_todo() or es_alumno_mio(alumno_id));

create policy asist_insertar on asistencia for insert
  with check (es_admin() or es_alumno_mio(alumno_id));

-- VENTANA RETROACTIVA: el profesor corrige hoy y los 2 dias anteriores. Mas
-- atras lo hace Aurora, y entonces queda auditado. Sin este limite, un
-- profesor podria cambiar numeros antiguos del CEO sin dejar rastro revisable.
create policy asist_modificar on asistencia for update
  using (
    es_admin()
    or (es_alumno_mio(alumno_id)
        and fecha >= (now() at time zone 'Europe/Madrid')::date - 2)
  )
  with check (es_admin() or es_alumno_mio(alumno_id));

-- Nadie borra asistencia. Las bajas son activo=false.
create policy asist_borrar_admin on asistencia for delete using (es_admin());

-- ============================================================
-- ASISTENCIA_CAMBIOS — nadie escribe aqui.
-- Solo el trigger, que se salta el RLS por ser security definer.
-- El CEO y Aurora leen; el profesor no.
-- ============================================================
create policy cambios_leer on asistencia_cambios for select
  using (puede_leer_todo());

-- NOTA: la clave `service_role` NUNCA va en el cliente. Solo en Edge
-- Functions y en los scripts de volcado.
