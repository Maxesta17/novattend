-- NovAttend — triggers de auditoria (fase 8)
--
-- POR QUE: si el rastro de cambios lo escribe la aplicacion, un cambio hecho
-- por cualquier otra via no deja marca. Hallazgo #6 de la revision.
-- Aqui lo escribe la base de datos, asi que no hay forma de esquivarlo.

create or replace function registrar_cambio_asistencia()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario uuid;
begin
  -- Quien lo hace, segun el login. Puede ser null en los scripts de volcado.
  select a.usuario_id into v_usuario from public.actual() a limit 1;

  if (tg_op = 'UPDATE') then
    -- Solo deja rastro si cambio algo que importa. Un update que no toca
    -- nada no ensucia la auditoria.
    if (old.presente, old.justificada, old.motivo)
       is distinct from (new.presente, new.justificada, new.motivo) then
      insert into public.asistencia_cambios
        (asistencia_id, cambiado_por, accion, valor_anterior, valor_nuevo)
      values (old.id, v_usuario, 'update', to_jsonb(old), to_jsonb(new));
    end if;
    return new;
  end if;

  insert into public.asistencia_cambios
    (asistencia_id, cambiado_por, accion, valor_anterior, valor_nuevo)
  values (old.id, v_usuario, 'delete', to_jsonb(old), null);
  return old;
end;
$$;

create trigger auditar_asistencia
  after update or delete on asistencia
  for each row execute function registrar_cambio_asistencia();

-- ============================================================
-- La fecha de asistencia debe caer dentro del periodo de la convocatoria del
-- alumno. Un CHECK no puede consultar otras tablas, asi que hace falta trigger.
-- Evita que una fecha mal tecleada contamine los porcentajes del CEO.
-- ============================================================
create or replace function validar_fecha_asistencia()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_inicio date;
  v_fin    date;
begin
  select c.fecha_inicio, c.fecha_fin into v_inicio, v_fin
  from public.alumnos al
  join public.convocatorias c on c.id = al.convocatoria_id
  where al.id = new.alumno_id;

  if new.fecha < v_inicio or new.fecha > v_fin then
    raise exception
      'Fecha % fuera del periodo de la convocatoria del alumno (% a %)',
      new.fecha, v_inicio, v_fin;
  end if;
  return new;
end;
$$;

create trigger validar_fecha_asistencia_trg
  before insert or update of fecha, alumno_id on asistencia
  for each row execute function validar_fecha_asistencia();

-- PENDIENTE DE DECIDIR (no implementado a proposito):
--   · Si solo Aurora puede justificar faltas, el RLS no basta: no distingue
--     columnas. Haria falta otro trigger o una funcion aparte.
--   · Un grupo asignado a un profesor dado de baja, o al CEO, hoy no esta
--     impedido. Gravedad baja; se cierra con un trigger si importa.
