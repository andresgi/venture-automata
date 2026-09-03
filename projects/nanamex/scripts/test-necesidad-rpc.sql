-- Executed after `supabase db reset --local` as the local service-role database user.
-- The application calls this SECURITY DEFINER function through Supabase's service-role client;
-- this fixture intentionally exercises the same granted database boundary, not app validation.
begin;
create temporary table rpc_test_ids (family_a uuid, family_b uuid, draft uuid);
insert into rpc_test_ids values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid());
insert into auth.users (id, aud, role, email, encrypted_password, confirmation_token)
select family_a, 'authenticated', 'authenticated', family_a::text || '@test.invalid', '', '' from rpc_test_ids
union all select family_b, 'authenticated', 'authenticated', family_b::text || '@test.invalid', '', '' from rpc_test_ids;
insert into public.profiles(id, role, nombre) select family_a, 'familia'::public.user_role, 'A' from rpc_test_ids union all select family_b, 'familia'::public.user_role, 'B' from rpc_test_ids;
grant select, update on rpc_test_ids to service_role;
do $$ declare v_acl text; begin
  select proacl::text into v_acl from pg_proc where oid = to_regprocedure('public.save_necesidad_draft(uuid,uuid,jsonb)');
  if not has_function_privilege('service_role', 'public.save_necesidad_draft(uuid,uuid,jsonb)', 'execute') then raise exception 'service_role cannot execute draft RPC'; end if;
  if has_function_privilege('anon', 'public.save_necesidad_draft(uuid,uuid,jsonb)', 'execute') then raise exception 'anon can execute draft RPC'; end if;
  if has_function_privilege('authenticated', 'public.save_necesidad_draft(uuid,uuid,jsonb)', 'execute') then raise exception 'authenticated can execute draft RPC'; end if;
  if v_acl is null or exists (select 1 from aclexplode((select proacl from pg_proc where oid = to_regprocedure('public.save_necesidad_draft(uuid,uuid,jsonb)'))) where grantee = 0 and privilege_type = 'EXECUTE') then raise exception 'PUBLIC can execute draft RPC (acl=%)', v_acl; end if;
end $$;
select set_config('role', 'service_role', true);
update rpc_test_ids set draft = public.save_necesidad_draft(null, family_a, jsonb_build_object('children', jsonb_build_array('0-1'), 'zonaId', null, 'diasHorarios', jsonb_build_array(jsonb_build_object('dia','lun','hora_inicio','09:00','hora_fin','17:00')), 'responsabilidades', jsonb_build_array('x')));
do $$ declare r uuid; n int; begin select draft into r from rpc_test_ids; select count(*) into n from public.necesidad_children where necesidad_id=r; if n<>1 then raise exception 'initial children save failed'; end if; end $$;
-- Replacement is part of the same RPC transaction.
select public.save_necesidad_draft(draft, family_a, jsonb_build_object('children', jsonb_build_array('3-6'), 'zonaId', null, 'diasHorarios', '[]', 'responsabilidades', jsonb_build_array('y'))) from rpc_test_ids;
do $$ declare r uuid; n int; v public.rango_edad; begin select draft into r from rpc_test_ids; select count(*), min(rango_edad) into n,v from public.necesidad_children where necesidad_id=r; if n<>1 or v<>'3-6' then raise exception 'child replacement failed'; end if; end $$;
do $$ declare r uuid; n int; v_failed boolean := false; v_state text; begin select draft into r from rpc_test_ids; begin perform public.save_necesidad_draft(r, (select family_a from rpc_test_ids), jsonb_build_object('children', jsonb_build_array('not-a-range'), 'responsabilidades', jsonb_build_array('z'))); exception when others then v_failed := true; get stacked diagnostics v_state = returned_sqlstate; end; if not v_failed or v_state <> '22P02' then raise exception 'forced child insert failure was not observed (failed=%, state=%)', v_failed, v_state; end if; select count(*) into n from public.necesidad_children where necesidad_id=r; if n<>1 then raise exception 'failed child insert did not roll back replacement'; end if; end $$;
-- Wrong owner and active rows must both be rejected by the RPC.
do $$ declare v_failed boolean := false; begin begin perform public.save_necesidad_draft(draft, family_b, '{}'::jsonb) from rpc_test_ids; exception when others then v_failed := true; end; if not v_failed then raise exception 'wrong owner accepted'; end if; end $$;
update public.necesidades set estado='activa' where id=(select draft from rpc_test_ids);
do $$ declare v_failed boolean := false; begin begin perform public.save_necesidad_draft(draft, family_a, '{}'::jsonb) from rpc_test_ids; exception when others then v_failed := true; end; if not v_failed then raise exception 'active draft accepted'; end if; end $$;
-- E2-02 publish is owner-bound, transitions only complete drafts, and accepts zero matches.
update public.necesidades set estado='borrador' where id=(select draft from rpc_test_ids);
update public.necesidades set zona_id=(select id from public.zonas limit 1), dias_horarios=jsonb_build_array(jsonb_build_object('dia','lun','hora_inicio','09:00','hora_fin','17:00')), modalidad='ocasional', pago_min=100, pago_max=200, fecha_inicio=current_date, responsabilidades=array['x'] where id=(select draft from rpc_test_ids);
insert into public.necesidad_children(necesidad_id, rango_edad) values ((select draft from rpc_test_ids), '0-1');
do $$ declare v_id uuid; v_state public.necesidad_estado; v_count int; begin select public.publish_necesidad_with_matches(draft, family_a, '[]'::jsonb) into v_id from rpc_test_ids; select estado into v_state from public.necesidades where id=v_id; select count(*) into v_count from public.pipeline where necesidad_id=v_id; if v_state <> 'activa' or v_count <> 0 then raise exception 'zero-match publish failed'; end if; end $$;
do $$ declare v_failed boolean := false; begin begin perform public.publish_necesidad_with_matches(draft, family_b, '[]'::jsonb) from rpc_test_ids; exception when others then v_failed := true; end; if not v_failed then raise exception 'another family published the draft'; end if; end $$;

-- E2-02 hardening: publish_necesidad_with_matches must independently re-validate every
-- match's niñera (published, complete, active account) and score range rather than trust
-- the caller -- an invalid/ineligible/fabricated match must reject the *whole* publish
-- atomically (estado stays 'borrador', no pipeline rows persisted), not silently skip it.
create temporary table rpc_ninera_ids (eligible uuid, unpublished uuid, suspended uuid, draft2 uuid);
insert into rpc_ninera_ids values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid());
-- The session switched to `service_role` above (to exercise the RPC's real granted
-- boundary), which cannot insert into `auth.users` directly; temporarily switch back to
-- the connecting superuser role to seed these fixtures, matching how family_a/family_b
-- were seeded before that switch.
select set_config('role', 'postgres', true);
insert into auth.users (id, aud, role, email, encrypted_password, confirmation_token)
select eligible, 'authenticated', 'authenticated', eligible::text || '@test.invalid', '', '' from rpc_ninera_ids
union all select unpublished, 'authenticated', 'authenticated', unpublished::text || '@test.invalid', '', '' from rpc_ninera_ids
union all select suspended, 'authenticated', 'authenticated', suspended::text || '@test.invalid', '', '' from rpc_ninera_ids;
insert into public.profiles(id, role, nombre, account_status)
select eligible, 'ninera'::public.user_role, 'Eligible', 'activa'::public.account_status from rpc_ninera_ids
union all select unpublished, 'ninera'::public.user_role, 'Unpublished', 'activa'::public.account_status from rpc_ninera_ids
union all select suspended, 'ninera'::public.user_role, 'Suspended', 'suspendida'::public.account_status from rpc_ninera_ids;
-- `unpublished` is perfil_completo=true but publicado=false (a real, valid intermediate
-- state -- a complete profile the niñera simply hasn't published); `suspended` is fully
-- published/complete but its account is no longer active. Both must be rejected.
insert into public.perfil_ninera(profile_id, publicado, perfil_completo)
select eligible, true, true from rpc_ninera_ids
union all select unpublished, false, true from rpc_ninera_ids
union all select suspended, true, true from rpc_ninera_ids;
grant select, update on rpc_ninera_ids to service_role;
select set_config('role', 'service_role', true);
update rpc_ninera_ids set draft2 = public.save_necesidad_draft(null, (select family_a from rpc_test_ids), jsonb_build_object('children', jsonb_build_array('0-1'), 'zonaId', null, 'diasHorarios', '[]', 'responsabilidades', jsonb_build_array('x')));
update public.necesidades set zona_id=(select id from public.zonas limit 1), dias_horarios=jsonb_build_array(jsonb_build_object('dia','lun','hora_inicio','09:00','hora_fin','17:00')), modalidad='ocasional', pago_min=100, pago_max=200, fecha_inicio=current_date, responsabilidades=array['x'] where id=(select draft2 from rpc_ninera_ids);

do $$ declare v_failed boolean := false; v_estado public.necesidad_estado; v_count int; begin
  begin perform public.publish_necesidad_with_matches((select draft2 from rpc_ninera_ids), (select family_a from rpc_test_ids), jsonb_build_array(jsonb_build_object('ninera_id', gen_random_uuid(), 'match_score_snapshot', 80, 'match_checklist_snapshot', '{}'::jsonb)));
  exception when others then v_failed := true; end;
  if not v_failed then raise exception 'nonexistent ninera_id accepted'; end if;
  select estado into v_estado from public.necesidades where id=(select draft2 from rpc_ninera_ids);
  select count(*) into v_count from public.pipeline where necesidad_id=(select draft2 from rpc_ninera_ids);
  if v_estado <> 'borrador' or v_count <> 0 then raise exception 'nonexistent-candidate publish was not fully rolled back (estado=%, pipeline_count=%)', v_estado, v_count; end if;
end $$;

do $$ declare v_failed boolean := false; v_estado public.necesidad_estado; v_count int; begin
  begin perform public.publish_necesidad_with_matches((select draft2 from rpc_ninera_ids), (select family_a from rpc_test_ids), jsonb_build_array(jsonb_build_object('ninera_id', (select unpublished from rpc_ninera_ids), 'match_score_snapshot', 80, 'match_checklist_snapshot', '{}'::jsonb)));
  exception when others then v_failed := true; end;
  if not v_failed then raise exception 'unpublished niñera accepted'; end if;
  select estado into v_estado from public.necesidades where id=(select draft2 from rpc_ninera_ids);
  select count(*) into v_count from public.pipeline where necesidad_id=(select draft2 from rpc_ninera_ids);
  if v_estado <> 'borrador' or v_count <> 0 then raise exception 'unpublished-niñera publish was not fully rolled back'; end if;
end $$;

do $$ declare v_failed boolean := false; v_estado public.necesidad_estado; v_count int; begin
  begin perform public.publish_necesidad_with_matches((select draft2 from rpc_ninera_ids), (select family_a from rpc_test_ids), jsonb_build_array(jsonb_build_object('ninera_id', (select suspended from rpc_ninera_ids), 'match_score_snapshot', 80, 'match_checklist_snapshot', '{}'::jsonb)));
  exception when others then v_failed := true; end;
  if not v_failed then raise exception 'suspended-account niñera accepted'; end if;
  select estado into v_estado from public.necesidades where id=(select draft2 from rpc_ninera_ids);
  select count(*) into v_count from public.pipeline where necesidad_id=(select draft2 from rpc_ninera_ids);
  if v_estado <> 'borrador' or v_count <> 0 then raise exception 'suspended-niñera publish was not fully rolled back'; end if;
end $$;

do $$ declare v_failed boolean := false; v_estado public.necesidad_estado; v_count int; begin
  begin perform public.publish_necesidad_with_matches((select draft2 from rpc_ninera_ids), (select family_a from rpc_test_ids), jsonb_build_array(jsonb_build_object('ninera_id', (select eligible from rpc_ninera_ids), 'match_score_snapshot', 150, 'match_checklist_snapshot', '{}'::jsonb)));
  exception when others then v_failed := true; end;
  if not v_failed then raise exception 'out-of-range score accepted'; end if;
  select estado into v_estado from public.necesidades where id=(select draft2 from rpc_ninera_ids);
  select count(*) into v_count from public.pipeline where necesidad_id=(select draft2 from rpc_ninera_ids);
  if v_estado <> 'borrador' or v_count <> 0 then raise exception 'out-of-range-score publish was not fully rolled back'; end if;
end $$;

-- A legitimate, fully-eligible match still persists correctly and the necesidad publishes.
do $$ declare v_id uuid; v_estado public.necesidad_estado; v_count int; v_score int; begin
  select public.publish_necesidad_with_matches((select draft2 from rpc_ninera_ids), (select family_a from rpc_test_ids), jsonb_build_array(jsonb_build_object('ninera_id', (select eligible from rpc_ninera_ids), 'match_score_snapshot', 88, 'match_checklist_snapshot', jsonb_build_object('location', true)))) into v_id;
  select estado into v_estado from public.necesidades where id = v_id;
  select count(*), min(match_score_snapshot) into v_count, v_score from public.pipeline where necesidad_id = v_id;
  if v_estado <> 'activa' or v_count <> 1 or v_score <> 88 then raise exception 'legitimate match publish failed (estado=%, count=%, score=%)', v_estado, v_count, v_score; end if;
end $$;
rollback;
