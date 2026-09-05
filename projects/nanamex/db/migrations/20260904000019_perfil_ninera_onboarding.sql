-- E7-01: NIN-01/02 onboarding wizard persistence.
--
-- `perfil_ninera.perfil_completo` is application-computed, not a Postgres generated column
-- (see 20260902000006_perfil_ninera.sql's comment: completeness depends on
-- `ninera_experiencia_edades` having >=1 row, which a same-row generated column cannot
-- express). This RPC is that application logic's single, atomic entry point: it upserts
-- `perfil_ninera` plus its three join tables (`ninera_zonas`, `ninera_experiencia_edades`,
-- `referencias`) in one transaction, recomputes `perfil_completo` from the exact field list
-- in database.md §3 (zona de trabajo, disponibilidad, modalidades, expectativa salarial,
-- descripción, >=1 experiencia_edad), and sets `publicado := perfil_completo`
-- unconditionally -- never gated on `verification_status` -- per the PRD addendum's
-- Critical Issue #2 resolution (a `no_verificada` profile must remain
-- publicado/discoverable once complete; see engineering/implementation-plan.md E7-01
-- acceptance criteria).
create or replace function public.save_perfil_ninera(p_ninera_id uuid, p_payload jsonb)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare
  v_zona_ids uuid[];
  v_edades text[];
  v_modalidades public.modalidad[];
  v_disponibilidad jsonb;
  v_descripcion text;
  v_salario_min int;
  v_salario_max int;
  v_completo boolean;
  v_reference jsonb;
begin
  v_zona_ids := coalesce(
    (select array_agg((value #>> '{}')::uuid) from jsonb_array_elements(coalesce(p_payload->'zonaIds', '[]'::jsonb)) as value),
    '{}'
  );
  v_edades := coalesce(
    (select array_agg(value #>> '{}') from jsonb_array_elements(coalesce(p_payload->'experienciaEdades', '[]'::jsonb)) as value),
    '{}'
  );
  v_modalidades := coalesce(
    (select array_agg((value #>> '{}')::public.modalidad) from jsonb_array_elements(coalesce(p_payload->'modalidadesAceptadas', '[]'::jsonb)) as value),
    '{}'
  );
  v_disponibilidad := coalesce(p_payload->'disponibilidad', '[]'::jsonb);
  v_descripcion := nullif(trim(both from coalesce(p_payload->>'descripcion', '')), '');
  v_salario_min := (p_payload->>'salarioMin')::int;
  v_salario_max := (p_payload->>'salarioMax')::int;

  v_completo := coalesce(array_length(v_zona_ids, 1) > 0, false)
    and jsonb_array_length(v_disponibilidad) > 0
    and coalesce(array_length(v_modalidades, 1) > 0, false)
    and v_salario_min is not null
    and v_salario_max is not null
    and v_descripcion is not null
    and coalesce(array_length(v_edades, 1) > 0, false);

  insert into public.perfil_ninera (
    profile_id, foto_url, anos_experiencia, disponibilidad, salario_min, salario_max,
    modalidades_aceptadas, descripcion, perfil_completo, publicado
  ) values (
    p_ninera_id, nullif(p_payload->>'fotoUrl', ''), (p_payload->>'anosExperiencia')::int,
    v_disponibilidad, v_salario_min, v_salario_max, v_modalidades, v_descripcion, v_completo, v_completo
  )
  on conflict (profile_id) do update set
    foto_url = excluded.foto_url,
    anos_experiencia = excluded.anos_experiencia,
    disponibilidad = excluded.disponibilidad,
    salario_min = excluded.salario_min,
    salario_max = excluded.salario_max,
    modalidades_aceptadas = excluded.modalidades_aceptadas,
    descripcion = excluded.descripcion,
    perfil_completo = excluded.perfil_completo,
    publicado = excluded.publicado;

  delete from public.ninera_zonas where ninera_id = p_ninera_id;
  insert into public.ninera_zonas (ninera_id, zona_id)
  select p_ninera_id, zid from unnest(v_zona_ids) as zid;

  delete from public.ninera_experiencia_edades where ninera_id = p_ninera_id;
  insert into public.ninera_experiencia_edades (ninera_id, rango_edad)
  select p_ninera_id, edad::public.rango_edad from unnest(v_edades) as edad;

  delete from public.referencias where ninera_id = p_ninera_id;
  for v_reference in select * from jsonb_array_elements(coalesce(p_payload->'referencias', '[]'::jsonb)) loop
    insert into public.referencias (ninera_id, nombre, relacion, periodo, contacto)
    values (
      p_ninera_id,
      v_reference->>'nombre',
      v_reference->>'relacion',
      v_reference->>'periodo',
      nullif(v_reference->>'contacto', '')
    );
  end loop;

  return v_completo;
end;
$$;

revoke execute on function public.save_perfil_ninera(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_perfil_ninera(uuid, jsonb) to service_role;
