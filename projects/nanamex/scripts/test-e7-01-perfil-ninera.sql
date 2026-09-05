-- E7-01 live-Postgres probe for save_perfil_ninera + the profile-photos Storage bucket.
-- Run after `supabase db reset --local` via `npm run test:db`.
begin;

do $$ declare v_acl text; begin
  if not has_function_privilege('service_role', 'public.save_perfil_ninera(uuid,jsonb)', 'execute') then raise exception 'service_role cannot execute save_perfil_ninera'; end if;
  if has_function_privilege('anon', 'public.save_perfil_ninera(uuid,jsonb)', 'execute') then raise exception 'anon can execute save_perfil_ninera'; end if;
  if has_function_privilege('authenticated', 'public.save_perfil_ninera(uuid,jsonb)', 'execute') then raise exception 'authenticated can execute save_perfil_ninera'; end if;
  select proacl::text into v_acl from pg_proc where oid = to_regprocedure('public.save_perfil_ninera(uuid,jsonb)');
  if v_acl is null or exists (select 1 from aclexplode((select proacl from pg_proc where oid = to_regprocedure('public.save_perfil_ninera(uuid,jsonb)'))) where grantee = 0 and privilege_type = 'EXECUTE') then raise exception 'PUBLIC can execute save_perfil_ninera (acl=%)', v_acl; end if;
end $$;

-- profile-photos bucket exists and is public.
do $$ declare v_public boolean; begin
  select public into v_public from storage.buckets where id = 'profile-photos';
  if v_public is null then raise exception 'profile-photos bucket does not exist'; end if;
  if v_public is not true then raise exception 'profile-photos bucket is not public'; end if;
end $$;

create temporary table nin_test_ids (ninera uuid, other uuid, zona_a uuid, zona_b uuid);
insert into nin_test_ids values (gen_random_uuid(), gen_random_uuid(), (select id from public.zonas limit 1 offset 0), (select id from public.zonas limit 1 offset 1));
insert into auth.users (id, aud, role, email, encrypted_password, confirmation_token)
select ninera, 'authenticated', 'authenticated', ninera::text || '@test.invalid', '', '' from nin_test_ids
union all select other, 'authenticated', 'authenticated', other::text || '@test.invalid', '', '' from nin_test_ids;
insert into public.profiles (id, role, nombre, account_status)
select ninera, 'ninera'::public.user_role, 'Niñera de prueba', 'activa'::public.account_status from nin_test_ids
union all select other, 'ninera'::public.user_role, 'Otra niñera', 'activa'::public.account_status from nin_test_ids;
grant select on nin_test_ids to service_role;
select set_config('role', 'service_role', true);

-- Partial payload (paso 1 only) must never flip perfil_completo/publicado.
do $$ declare v_completo boolean; v_publicado boolean; v_status public.ninera_verification_status; begin
  select public.save_perfil_ninera(
    (select ninera from nin_test_ids),
    jsonb_build_object('fotoUrl', 'https://cdn.test/foto.jpg', 'zonaIds', jsonb_build_array((select zona_a from nin_test_ids)), 'anosExperiencia', 3)
  ) into v_completo;
  select publicado, verification_status into v_publicado, v_status from public.perfil_ninera where profile_id = (select ninera from nin_test_ids);
  if v_completo is distinct from false then raise exception 'partial payload marked perfil_completo=true (got %)', v_completo; end if;
  if v_publicado is distinct from false then raise exception 'partial payload set publicado=true'; end if;
  if v_status <> 'no_verificada' then raise exception 'save_perfil_ninera touched verification_status (got %)', v_status; end if;
end $$;

-- Full payload flips perfil_completo/publicado to true, verification_status stays untouched
-- (this story's whole point: a no_verificada, perfil_completo=true niñera stays publicado --
-- addendum Critical Issue #2 / engineering/implementation-plan.md E7-01 acceptance criteria).
do $$ declare v_completo boolean; v_publicado boolean; v_status public.ninera_verification_status; v_zonas int; v_edades int; v_refs int; begin
  select public.save_perfil_ninera(
    (select ninera from nin_test_ids),
    jsonb_build_object(
      'fotoUrl', 'https://cdn.test/foto.jpg',
      'zonaIds', jsonb_build_array((select zona_a from nin_test_ids), (select zona_b from nin_test_ids)),
      'anosExperiencia', 3,
      'disponibilidad', jsonb_build_array(jsonb_build_object('dia', 'lun', 'hora_inicio', '09:00', 'hora_fin', '17:00')),
      'salarioMin', 4000, 'salarioMax', 6000,
      'modalidadesAceptadas', jsonb_build_array('ocasional'),
      'descripcion', 'Cuidadora responsable con experiencia.',
      'experienciaEdades', jsonb_build_array('0-1', '3-6'),
      'referencias', jsonb_build_array(jsonb_build_object('nombre', 'Ana', 'relacion', 'Familia anterior', 'periodo', '2021-2023', 'contacto', null))
    )
  ) into v_completo;
  select publicado, verification_status into v_publicado, v_status from public.perfil_ninera where profile_id = (select ninera from nin_test_ids);
  select count(*) into v_zonas from public.ninera_zonas where ninera_id = (select ninera from nin_test_ids);
  select count(*) into v_edades from public.ninera_experiencia_edades where ninera_id = (select ninera from nin_test_ids);
  select count(*) into v_refs from public.referencias where ninera_id = (select ninera from nin_test_ids);
  if v_completo is distinct from true then raise exception 'full payload did not set perfil_completo=true'; end if;
  if v_publicado is distinct from true then raise exception 'full payload did not set publicado=true'; end if;
  if v_status <> 'no_verificada' then raise exception 'verification_status changed unexpectedly (got %)', v_status; end if;
  if v_zonas <> 2 then raise exception 'expected 2 ninera_zonas rows, got %', v_zonas; end if;
  if v_edades <> 2 then raise exception 'expected 2 ninera_experiencia_edades rows, got %', v_edades; end if;
  if v_refs <> 1 then raise exception 'expected 1 referencias row, got %', v_refs; end if;
end $$;

-- The real query publishNecesidadAction runs (actions/necesidad.ts) must pick up this
-- niñera despite verification_status = 'no_verificada' -- this is the DB-level half of the
-- E7-01 regression test (the JS-level half lives in
-- tests/lib/matching/no-verificada-visibility.test.ts).
do $$ declare v_found boolean; begin
  select exists (
    select 1 from public.perfil_ninera pn
    join public.profiles p on p.id = pn.profile_id
    where pn.profile_id = (select ninera from nin_test_ids)
      and pn.publicado = true and pn.perfil_completo = true and p.account_status = 'activa'
  ) into v_found;
  if not v_found then raise exception 'no_verificada, perfil_completo=true niñera not visible to the real candidate query'; end if;
end $$;

-- Re-saving replaces (not accumulates) join-table rows -- dropping a zona must remove it.
do $$ declare v_zonas int; begin
  perform public.save_perfil_ninera(
    (select ninera from nin_test_ids),
    jsonb_build_object(
      'zonaIds', jsonb_build_array((select zona_a from nin_test_ids)),
      'disponibilidad', jsonb_build_array(jsonb_build_object('dia', 'lun', 'hora_inicio', '09:00', 'hora_fin', '17:00')),
      'salarioMin', 4000, 'salarioMax', 6000,
      'modalidadesAceptadas', jsonb_build_array('ocasional'),
      'descripcion', 'Cuidadora responsable con experiencia.',
      'experienciaEdades', jsonb_build_array('0-1')
    )
  );
  select count(*) into v_zonas from public.ninera_zonas where ninera_id = (select ninera from nin_test_ids);
  if v_zonas <> 1 then raise exception 'expected zona replacement to leave exactly 1 row, got %', v_zonas; end if;
end $$;

-- Dropping a required field (descripcion) flips perfil_completo/publicado back to false --
-- the DB-level `perfil_ninera_publicado_requires_completo` invariant this RPC must respect.
do $$ declare v_completo boolean; v_publicado boolean; begin
  select public.save_perfil_ninera(
    (select ninera from nin_test_ids),
    jsonb_build_object(
      'zonaIds', jsonb_build_array((select zona_a from nin_test_ids)),
      'disponibilidad', jsonb_build_array(jsonb_build_object('dia', 'lun', 'hora_inicio', '09:00', 'hora_fin', '17:00')),
      'salarioMin', 4000, 'salarioMax', 6000,
      'modalidadesAceptadas', jsonb_build_array('ocasional'),
      'experienciaEdades', jsonb_build_array('0-1')
    )
  ) into v_completo;
  select publicado into v_publicado from public.perfil_ninera where profile_id = (select ninera from nin_test_ids);
  if v_completo is distinct from false then raise exception 'missing descripcion still marked perfil_completo=true'; end if;
  if v_publicado is distinct from false then raise exception 'missing descripcion left publicado=true'; end if;
end $$;

-- Invalid zona_id (FK violation) rolls back the whole call atomically -- no partial writes.
do $$ declare v_failed boolean := false; v_zonas int; begin
  begin
    perform public.save_perfil_ninera((select ninera from nin_test_ids), jsonb_build_object('zonaIds', jsonb_build_array(gen_random_uuid())));
  exception when others then v_failed := true; end;
  if not v_failed then raise exception 'nonexistent zona_id accepted'; end if;
  select count(*) into v_zonas from public.ninera_zonas where ninera_id = (select ninera from nin_test_ids);
  if v_zonas <> 1 then raise exception 'failed insert left ninera_zonas in an unexpected state (%)', v_zonas; end if;
end $$;

rollback;
