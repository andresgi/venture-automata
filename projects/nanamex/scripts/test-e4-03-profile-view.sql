\set ON_ERROR_STOP on
begin;
delete from public.analytics_events where necesidad_id in ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000403');
delete from public.pipeline where necesidad_id in ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000403');
delete from public.necesidades where id in ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000403');
delete from public.profiles where id in ('00000000-0000-0000-0000-000000000411','00000000-0000-0000-0000-000000000412','00000000-0000-0000-0000-000000000413');
delete from auth.users where id in ('00000000-0000-0000-0000-000000000411','00000000-0000-0000-0000-000000000412','00000000-0000-0000-0000-000000000413');
insert into auth.users (id,aud,role,email,encrypted_password,confirmation_token) values ('00000000-0000-0000-0000-000000000411','authenticated','authenticated','e4a-family@test.invalid','',''),('00000000-0000-0000-0000-000000000412','authenticated','authenticated','e4b-family@test.invalid','',''),('00000000-0000-0000-0000-000000000413','authenticated','authenticated','e4-candidate@test.invalid','','');
insert into public.profiles (id,role,nombre) values ('00000000-0000-0000-0000-000000000411','familia','Familia A'),('00000000-0000-0000-0000-000000000412','familia','Familia B'),('00000000-0000-0000-0000-000000000413','ninera','Candidata');
insert into public.perfil_ninera (profile_id,perfil_completo,publicado) values ('00000000-0000-0000-0000-000000000413',true,true);
insert into public.necesidades (id,familia_id,estado) values ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000411','activa'),('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000412','activa'),('00000000-0000-0000-0000-000000000403','00000000-0000-0000-0000-000000000411','activa');
commit;
set role service_role;
do $$ declare failed boolean := false; begin begin perform public.record_candidate_profile_view('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000412','00000000-0000-0000-0000-000000000413',80,'{}'); exception when others then failed := true; end; if not failed then raise exception 'wrong owner accepted'; end if; end $$;
update public.perfil_ninera set publicado=false where profile_id='00000000-0000-0000-0000-000000000413';
do $$ declare failed boolean := false; begin begin perform public.record_candidate_profile_view('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000411','00000000-0000-0000-0000-000000000413',80,'{}'); exception when others then failed := true; end; if not failed then raise exception 'unpublished candidate accepted'; end if; end $$;
update public.perfil_ninera set publicado=true where profile_id='00000000-0000-0000-0000-000000000413';
select public.record_candidate_profile_view('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000411','00000000-0000-0000-0000-000000000413',80,'{"location":true}');
select public.record_candidate_profile_view('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000411','00000000-0000-0000-0000-000000000413',59,'{}');
do $$ declare s int; v int; c int; begin select match_score_snapshot into s from public.pipeline where necesidad_id='00000000-0000-0000-0000-000000000401'; select count(*) into v from public.analytics_events where necesidad_id='00000000-0000-0000-0000-000000000401' and event_name='candidate_profile_viewed'; select count(*) into c from public.analytics_events where necesidad_id='00000000-0000-0000-0000-000000000401' and event_name='compatible_match_found'; if s<>80 or v<>2 or c<>1 then raise exception 'repeat assertion failed'; end if; end $$;
select public.record_candidate_profile_view('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000412','00000000-0000-0000-0000-000000000413',59,'{}');
do $$ begin if exists (select 1 from public.analytics_events where necesidad_id='00000000-0000-0000-0000-000000000402' and event_name='compatible_match_found') then raise exception 'sub-60 event exists'; end if; end $$;

-- The threshold is inclusive: 60 qualifies, while the later 59 view does not alter the snapshot.
select public.record_candidate_profile_view('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000412','00000000-0000-0000-0000-000000000413',60,'{}');
do $$ declare s int; c int; begin
  select match_score_snapshot into s from public.pipeline where necesidad_id='00000000-0000-0000-0000-000000000402';
  select count(*) into c from public.analytics_events where necesidad_id='00000000-0000-0000-0000-000000000402' and event_name='compatible_match_found';
  if s<>59 or c<>1 then raise exception 'inclusive threshold assertion failed'; end if;
end $$;

-- Current eligibility is enforced independently for completeness and account status. The
-- schema itself guarantees publicado implies perfil_completo (see
-- perfil_ninera_publicado_requires_completo), so a published-but-incomplete row cannot
-- occur through the application layer. Temporarily relax that invariant here to exercise
-- the RPC's own defense-in-depth completeness check, then restore it immediately after.
-- `set role service_role` above drops table-owner privileges needed to alter the
-- constraint; reset to the session's original (table-owning) role for these two DDL
-- statements, then restore service_role before continuing to call the RPC.
reset role;
alter table public.perfil_ninera drop constraint perfil_ninera_publicado_requires_completo;
set role service_role;
update public.perfil_ninera set perfil_completo=false where profile_id='00000000-0000-0000-0000-000000000413';
do $$ declare failed boolean := false; begin
  begin perform public.record_candidate_profile_view('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000411','00000000-0000-0000-0000-000000000413',60,'{}'); exception when others then failed := true; end;
  if not failed then raise exception 'incomplete candidate accepted'; end if;
end $$;
update public.perfil_ninera set perfil_completo=true where profile_id='00000000-0000-0000-0000-000000000413';
reset role;
alter table public.perfil_ninera
  add constraint perfil_ninera_publicado_requires_completo
  check (not publicado or perfil_completo);
set role service_role;
update public.profiles set account_status='suspendida' where id='00000000-0000-0000-0000-000000000413';
do $$ declare failed boolean := false; begin
  begin perform public.record_candidate_profile_view('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000411','00000000-0000-0000-0000-000000000413',60,'{}'); exception when others then failed := true; end;
  if not failed then raise exception 'inactive candidate accepted'; end if;
end $$;
update public.profiles set account_status='activa' where id='00000000-0000-0000-0000-000000000413';

-- Necesidad 403 stays intact here: test-e4-03-profile-view.mjs uses it for the
-- concurrent-view assertion immediately after this file runs, and its own final
-- teardown (not this file's) removes all fixtures once that assertion completes.
