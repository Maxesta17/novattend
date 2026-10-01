-- NovAttend — esquema Supabase (BORRADOR, fase 8)
-- Deriva del glosario cerrado en .planning/phases/07-vocabulario-y-modelo/07-GLOSARIO.md
-- NO ejecutado contra ninguna base de datos todavia.

-- ============================================================
-- CONVOCATORIA = periodo con fechas
-- ============================================================
create table convocatorias (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  fecha_inicio date not null,
  fecha_fin    date not null,
  creada_en    timestamptz not null default now(),

  -- El lio de produccion: dos "septiembre 2026" porque se tecleo SEPT2026 y
  -- SEPT26 como prefijo. Una de ellas nunca se uso.
  constraint convocatoria_unica unique (nombre, fecha_inicio),
  constraint periodo_valido check (fecha_fin >= fecha_inicio)
);

-- "Activa" se deriva de las fechas, no se guarda: un booleano manual se queda
-- obsoleto en silencio, que es justo lo que paso en agosto.
create view convocatorias_activas as
  select * from convocatorias
  where current_date between fecha_inicio and fecha_fin;

-- ============================================================
-- PROFESOR
-- ============================================================
create table profesores (
  id       uuid primary key default gen_random_uuid(),
  nombre   text not null,
  email    citext unique,
  activo   boolean not null default true,
  rol      text not null default 'teacher'
             check (rol in ('teacher', 'admin', 'ceo'))
);

-- ============================================================
-- GRUPO = alumnos + un profesor, dentro de una convocatoria.
-- Nombre LIBRE (Aurora usa "Grupo A"), sin limite de 4 por profesor.
-- ============================================================
create table grupos (
  id               uuid primary key default gen_random_uuid(),
  convocatoria_id  uuid not null references convocatorias(id) on delete restrict,
  nombre           text not null,
  profesor_id      uuid references profesores(id) on delete set null,

  -- Reasignable: cambiar profesor_id no toca ningun historial, porque la
  -- asistencia cuelga del alumno.
  constraint grupo_unico_en_convocatoria unique (convocatoria_id, nombre)
);

-- La participacion del profesor es EXPLICITA: existe porque tiene un grupo
-- aqui, no porque este activo. Retira la regla falsa de CLAUDE.md.

-- ============================================================
-- ALUMNO = persona matriculada en UNA convocatoria.
-- Esta en un grupo, o da clase particular. Nunca las dos, nunca ninguna.
-- ============================================================
create table alumnos (
  id                      uuid primary key default gen_random_uuid(),
  convocatoria_id         uuid not null references convocatorias(id) on delete restrict,
  nombre                  text not null,
  activo                  boolean not null default true,

  -- Exactamente una de las dos vias:
  grupo_id                uuid references grupos(id) on delete restrict,
  profesor_particular_id  uuid references profesores(id) on delete restrict,

  constraint alumno_en_grupo_o_particular check (
    (grupo_id is not null and profesor_particular_id is null) or
    (grupo_id is null     and profesor_particular_id is not null)
  )
);

-- ============================================================
-- ASISTENCIA — cuelga del ALUMNO, no del grupo.
-- Consecuencia de la regla 3 del glosario: mover un alumno de grupo no debe
-- tener consecuencias. transferirHistorial() desaparece.
-- ============================================================
create table asistencia (
  id           uuid primary key default gen_random_uuid(),
  alumno_id    uuid not null references alumnos(id) on delete cascade,
  fecha        date not null,
  presente     boolean not null,
  justificada  boolean not null default false,
  motivo       text,
  registrada_por uuid references profesores(id) on delete set null,
  registrada_en  timestamptz not null default now(),

  constraint una_marca_por_alumno_y_dia unique (alumno_id, fecha),
  constraint justificada_solo_si_falta check (not (justificada and presente))
);

-- ============================================================
-- AUDITORIA de correcciones (DAT-04).
-- Aurora va a poder corregir lo que marco un profesor, y eso cambia los
-- numeros del CEO. Sin rastro, un numero raro no se puede explicar nunca.
-- ============================================================
create table asistencia_cambios (
  id             uuid primary key default gen_random_uuid(),
  asistencia_id  uuid not null references asistencia(id) on delete cascade,
  cambiado_por   uuid not null references profesores(id) on delete restrict,
  cambiado_en    timestamptz not null default now(),
  valor_anterior jsonb not null,
  valor_nuevo    jsonb not null
);

create index on asistencia (alumno_id, fecha desc);
create index on alumnos (convocatoria_id) where activo;
create index on grupos (convocatoria_id);
