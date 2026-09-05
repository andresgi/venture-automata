\set ON_ERROR_STOP on
begin;
delete from public.analytics_events where necesidad_id in ('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000702');
delete from public.pipeline where necesidad_id in ('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000702');
delete from public.necesidad_children where necesidad_id in ('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000702');
delete from public.necesidades where id in ('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000702');
delete from public.ninera_zonas where ninera_id='00000000-0000-0000-0000-000000000723';
delete from public.ninera_experiencia_edades where ninera_id='00000000-0000-0000-0000-000000000723';
delete from public.perfil_ninera where profile_id='00000000-0000-0000-0000-000000000723';
delete from public.profiles where id in ('00000000-0000-0000-0000-000000000721','00000000-0000-0000-0000-000000000722','00000000-0000-0000-0000-000000000723');
delete from auth.users where id in ('00000000-0000-0000-0000-000000000721','00000000-0000-0000-0000-000000000722','00000000-0000-0000-0000-000000000723');
delete from public.zonas where id='00000000-0000-0000-0000-000000000741';
insert into auth.users(id,aud,role,email,encrypted_password,confirmation_token) values
 ('00000000-0000-0000-0000-000000000721','authenticated','authenticated','e601-family@test.invalid','',''),
 ('00000000-0000-0000-0000-000000000722','authenticated','authenticated','e601-other@test.invalid','',''),
 ('00000000-0000-0000-0000-000000000723','authenticated','authenticated','e601-ninera@test.invalid','','');
insert into public.profiles(id,role,nombre,phone,email_verified,phone_verified) values
 ('00000000-0000-0000-0000-000000000721','familia','Familia A','+5215550000721',true,true),
 ('00000000-0000-0000-0000-000000000722','familia','Familia B','+5215550000722',true,true),
 ('00000000-0000-0000-0000-000000000723','ninera','Candidata','+5215550000723',true,true);
-- Pre-existing cross-script fixture collision fix (unrelated to E7-01): this natural key
-- ("Monterrey"/"Centro"/"Prueba") is also used by scripts/test-e5-04-contact.sql, which
-- commits (not rollback) its fixture rows -- so when both scripts run in the same
-- `npm run test:db` chain, this script's own insert hit
-- `zonas_ciudad_alcaldia_colonia_key`. Using a distinct colonia label avoids the collision
-- without touching the already-VERIFIED E5-04 script.
insert into public.zonas(id,alcaldia_municipio,colonia,ciudad) values ('00000000-0000-0000-0000-000000000741','Centro','Prueba E601','Monterrey');
insert into public.perfil_familiar(profile_id,zona_id) values ('00000000-0000-0000-0000-000000000721','00000000-0000-0000-0000-000000000741'),('00000000-0000-0000-0000-000000000722','00000000-0000-0000-0000-000000000741');
insert into public.necesidades(id,familia_id,zona_id,estado,modalidad,dias_horarios,pago_min,pago_max,fecha_inicio,responsabilidades)
 values ('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000721','00000000-0000-0000-0000-000000000741','activa','ocasional','[{"dia":"lun","hora_inicio":"10:00","hora_fin":"16:00"}]',150,250,current_date,'{cuidado}'),
 ('00000000-0000-0000-0000-000000000702','00000000-0000-0000-0000-000000000721','00000000-0000-0000-0000-000000000741','activa','ocasional','[{"dia":"lun","hora_inicio":"10:00","hora_fin":"16:00"}]',150,250,current_date,'{cuidado}');
insert into public.pipeline(id,necesidad_id,ninera_id,estado,match_score_snapshot,match_checklist_snapshot,source) values
 ('00000000-0000-0000-0000-000000000711','00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000723','nueva',100,'{}','unknown'),
 ('00000000-0000-0000-0000-000000000712','00000000-0000-0000-0000-000000000702','00000000-0000-0000-0000-000000000723','contactada',100,'{}','unknown');
commit;
set role service_role;

-- The single most important assertion in this file, per E6-01's acceptance criteria: no
-- server action/RPC exists or succeeds for a manual nueva -> contactada transition. Both a
-- 'nueva' row and a 'contactada' row are proven to reject 'contactada' as a manual target.
do $$ declare failed boolean; begin
  failed:=false;
  begin perform public.advance_pipeline_state('00000000-0000-0000-0000-000000000711','00000000-0000-0000-0000-000000000721','contactada'); exception when others then failed:=true; end;
  if not failed then raise exception 'manual nueva pipeline row accepted a contactada transition'; end if;
  failed:=false;
  begin perform public.advance_pipeline_state('00000000-0000-0000-0000-000000000712','00000000-0000-0000-0000-000000000721','contactada'); exception when others then failed:=true; end;
  if not failed then raise exception 'manual contactada->contactada transition unexpectedly succeeded'; end if;
  failed:=false;
  begin perform public.advance_pipeline_state('00000000-0000-0000-0000-000000000711','00000000-0000-0000-0000-000000000721','nueva'); exception when others then failed:=true; end;
  if not failed then raise exception 'manual transition to nueva unexpectedly succeeded'; end if;
end $$;
do $$ declare s text; begin select estado into s from public.pipeline where id='00000000-0000-0000-0000-000000000711'; if s<>'nueva' then raise exception 'nueva row estado changed unexpectedly'; end if; end $$;

-- Forward path succeeds only in the documented order, from contactada onward.
do $$ declare failed boolean; begin
  failed:=false; begin perform public.advance_pipeline_state('00000000-0000-0000-0000-000000000711','00000000-0000-0000-0000-000000000721','entrevista'); exception when others then failed:=true; end;
  if not failed then raise exception 'nueva row accepted a direct entrevista transition'; end if;
end $$;
select public.advance_pipeline_state('00000000-0000-0000-0000-000000000712','00000000-0000-0000-0000-000000000721','entrevista');
do $$ declare s text; e int; begin
  select estado into s from public.pipeline where id='00000000-0000-0000-0000-000000000712';
  select count(*) into e from public.analytics_events where event_name='pipeline_state_advanced' and metadata->>'pipeline_id'='00000000-0000-0000-0000-000000000712' and metadata->>'from_estado'='contactada' and metadata->>'to_estado'='entrevista';
  if s<>'entrevista' or e<>1 then raise exception 'contactada->entrevista transition assertion failed'; end if;
end $$;
do $$ declare failed boolean; begin
  failed:=false; begin perform public.advance_pipeline_state('00000000-0000-0000-0000-000000000712','00000000-0000-0000-0000-000000000721','contratada'); exception when others then failed:=true; end;
  -- entrevista -> contratada is allowed, so this must succeed, not fail.
  if failed then raise exception 'entrevista->contratada transition unexpectedly rejected'; end if;
end $$;
do $$ declare s text; begin select estado into s from public.pipeline where id='00000000-0000-0000-0000-000000000712'; if s<>'contratada' then raise exception 'entrevista->contratada did not persist'; end if; end $$;
-- Skipping a step (contactada -> contratada directly) is not allowed.
update public.pipeline set estado='contactada' where id='00000000-0000-0000-0000-000000000712';
do $$ declare failed boolean; begin
  failed:=false; begin perform public.advance_pipeline_state('00000000-0000-0000-0000-000000000712','00000000-0000-0000-0000-000000000721','contratada'); exception when others then failed:=true; end;
  if not failed then raise exception 'contactada->contratada skip-step transition unexpectedly succeeded'; end if;
end $$;

-- Descartar is available from any state, including Nueva, and is idempotent on retry.
select public.advance_pipeline_state('00000000-0000-0000-0000-000000000711','00000000-0000-0000-0000-000000000721','descartada');
do $$ declare s text; begin select estado into s from public.pipeline where id='00000000-0000-0000-0000-000000000711'; if s<>'descartada' then raise exception 'nueva->descartada transition failed'; end if; end $$;
select public.advance_pipeline_state('00000000-0000-0000-0000-000000000711','00000000-0000-0000-0000-000000000721','descartada');
do $$ declare c int; begin select count(*) into c from public.analytics_events where event_name='pipeline_state_advanced' and metadata->>'pipeline_id'='00000000-0000-0000-0000-000000000711'; if c<>1 then raise exception 'repeat discard emitted a duplicate analytics event'; end if; end $$;

-- A different family cannot mutate another family's pipeline row.
do $$ declare failed boolean; begin
  failed:=false; begin perform public.advance_pipeline_state('00000000-0000-0000-0000-000000000712','00000000-0000-0000-0000-000000000722','descartada'); exception when others then failed:=true; end;
  if not failed then raise exception 'wrong-owner family mutated another familys pipeline row'; end if;
end $$;
