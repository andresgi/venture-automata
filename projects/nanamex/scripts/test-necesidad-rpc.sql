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
rollback;
