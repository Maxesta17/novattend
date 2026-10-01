-- NovAttend — esquema Supabase (v2, tras revision del especialista)
-- Modelo: .planning/phases/07-vocabulario-y-modelo/07-GLOSARIO.md
-- Control de acceso: 08-02-RLS.sql  |  Auditoria: 08-03-TRIGGERS.sql
-- NO ejecutado todavia contra ninguna base de datos.

-- ============================================================
-- CONVOCATORIA = periodo con fechas
-- ============================================================
create table convocatorias (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  fecha_inicio date not null,
  fecha_fin    date not null,
  creada_en    timestamptz not null default now(),

  -- Produccion tenia DOS "septiembre 2026" con identico nombre y fecha_inicio
  -- (ids conv-sept2026 y conv-sept26, por teclear dos prefijos distintos).
  -- Esta restriccion lo habria impedido. Se ignoran mayusculas por robustez.
  constraint periodo_valido check (fecha_fin >= fecha_inicio)
);
create unique index convocatoria_unica
  on convocatorias (lower(nombre), fecha_inicio);

-- Vista: "activa" se DERIVA de las fechas. Un booleano manual se queda
-- obsoleto en silencio — paso en agosto y dejo a 6 profesores sin alumnos.
--   · security_invoker: sin esto la vista se salta el RLS (rev. #7)
--   · zona horaria explicita: current_date en Supabase es UTC, y entre las
--     00:00 y 02:00 en Espana devolveria el dia anterior
--   · columnas listadas: select * congela las columnas al crear la vista
create view convocatorias_activas with (security_invoker = true) as
  select id, nombre, fecha_inicio, fecha_fin, creada_en
  from convocatorias
  where (now() at time zone 'Europe/Madrid')::date
        between fecha_inicio and fecha_fin;

-- ============================================================
-- USUARIOS (no "profesores": aqui viven tambien el CEO y Aurora, rev. #10)
-- ============================================================
create table usuarios (
  id        uuid primary key default gen_random_uuid(),
  -- Enlace con el login de Supabase. Sin esto NINGUNA politica RLS es
  -- posible (rev. #2). Nullable: los usuarios migrados de Sheets se enlazan
  -- despues, segun vayan entrando.
  auth_id   uuid unique references auth.users(id) on delete restrict,
  nombre    text not null,
  email     text,
  activo    boolean not null default true,
  rol       text not null default 'teacher'
              check (rol in ('teacher', 'admin', 'ceo'))
);
-- Sin citext: necesita una extension y para 11 personas no compensa (rev. #3)
create unique index usuario_email_unico on usuarios (lower(email))
  where email is not null;

-- ============================================================
-- GRUPO = alumnos + un profesor, dentro de una convocatoria.
-- Nombre LIBRE, sin limite de cuantos por profesor.
-- ============================================================
create table grupos (
  id               uuid primary key default gen_random_uuid(),
  convocatoria_id  uuid not null references convocatorias(id) on delete restrict,
  nombre           text not null,
  -- restrict, no set null: un profesor se da de baja con activo=false, nunca
  -- se borra, asi que esto no bloquea nada legitimo y evita grupos huerfanos
  profesor_id      uuid references usuarios(id) on delete restrict,

  constraint grupo_unico_en_convocatoria unique (convocatoria_id, nombre),
  -- Necesario para la clave foranea compuesta de alumnos (rev. #5)
  constraint grupo_id_convocatoria unique (id, convocatoria_id)
);

-- ============================================================
-- ALUMNO = persona matriculada en UNA convocatoria.
-- En un grupo, o en clase particular. Nunca ambas, nunca ninguna.
-- ============================================================
create table alumnos (
  id                      uuid primary key default gen_random_uuid(),
  convocatoria_id         uuid not null references convocatorias(id) on delete restrict,
  nombre                  text not null,
  activo                  boolean not null default true,

  grupo_id                uuid,
  profesor_particular_id  uuid references usuarios(id) on delete restrict,

  constraint alumno_en_grupo_o_particular
    check (num_nonnulls(grupo_id, profesor_particular_id) = 1),

  -- Impide que un alumno este en una convocatoria y su grupo en otra, lo que
  -- falsearia los resumenes del CEO (rev. #5). Con grupo_id nulo (clase
  -- particular) Postgres no comprueba esta clave, asi que no estorba.
  constraint alumno_grupo_misma_convocatoria
    foreign key (grupo_id, convocatoria_id)
    references grupos (id, convocatoria_id) on delete restrict
);
-- Hace el volcado REPETIBLE: sin esto, reimportar duplicaria alumnos (rev. #12).
-- Dos homonimos reales se desambiguan con un sufijo al migrar.
create unique index alumno_unico_en_convocatoria
  on alumnos (convocatoria_id, lower(nombre));

-- ============================================================
-- ASISTENCIA — cuelga del ALUMNO, no del grupo (glosario, regla 3).
-- Mover a alguien de grupo no toca su historial.
-- ============================================================
create table asistencia (
  id             uuid primary key default gen_random_uuid(),
  -- restrict, NO cascade: borrar un alumno no puede llevarse su historial
  -- por delante (rev. #4). Baja = activo=false.
  alumno_id      uuid not null references alumnos(id) on delete restrict,
  fecha          date not null,
  presente       boolean not null,
  justificada    boolean not null default false,
  motivo         text,
  registrada_por uuid references usuarios(id) on delete restrict,
  registrada_en  timestamptz not null default now(),

  constraint una_marca_por_alumno_y_dia unique (alumno_id, fecha),
  constraint justificada_solo_si_falta check (not (justificada and presente))
);

-- ============================================================
-- AUDITORIA de correcciones de asistencia.
-- La rellena un trigger, no la aplicacion (ver 08-03-TRIGGERS.sql).
-- ============================================================
create table asistencia_cambios (
  id             uuid primary key default gen_random_uuid(),
  -- restrict: el rastro no puede desaparecer justo cuando hace falta (rev. #4)
  asistencia_id  uuid not null references asistencia(id) on delete restrict,
  cambiado_por   uuid references usuarios(id) on delete restrict,
  cambiado_en    timestamptz not null default now(),
  accion         text not null check (accion in ('update', 'delete')),
  valor_anterior jsonb not null,
  -- nullable: un borrado no tiene valor nuevo (rev. #6)
  valor_nuevo    jsonb
);

-- ============================================================
-- INDICES
-- Con 3.400 filas no cambian la velocidad. Estan para las claves foraneas y
-- porque el RLS los va a recorrer en cada consulta (rev. #9).
-- Los redundantes del borrador (grupos.convocatoria_id y
-- asistencia.alumno_id+fecha) se han retirado: ya los crean sus UNIQUE.
-- ============================================================
create index on alumnos (grupo_id);
create index on alumnos (profesor_particular_id);
create index on alumnos (convocatoria_id) where activo;
create index on grupos (profesor_id);
create index on asistencia (registrada_por);
create index on asistencia (fecha);
create index on asistencia_cambios (asistencia_id);
