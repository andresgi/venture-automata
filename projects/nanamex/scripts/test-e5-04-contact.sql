\set ON_ERROR_STOP on
begin;
delete from public.analytics_events where necesidad_id in ('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000602');
delete from public.contacto where pipeline_id in ('00000000-0000-0000-0000-000000000611','00000000-0000-0000-0000-000000000612');
delete from public.pipeline where necesidad_id in ('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000602');
delete from public.entitlements where familia_id in ('00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000622');
delete from public.necesidad_children where necesidad_id in ('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000602');
delete from public.necesidades where id in ('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000602');
delete from public.ninera_zonas where ninera_id='00000000-0000-0000-0000-000000000623';
delete from public.ninera_experiencia_edades where ninera_id='00000000-0000-0000-0000-000000000623';
delete from public.perfil_ninera where profile_id='00000000-0000-0000-0000-000000000623';
delete from public.profiles where id in ('00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000622','00000000-0000-0000-0000-000000000623');
delete from auth.users where id in ('00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000622','00000000-0000-0000-0000-000000000623');
delete from public.zonas where id='00000000-0000-0000-0000-000000000641';
insert into auth.users(id,aud,role,email,encrypted_password,confirmation_token) values
 ('00000000-0000-0000-0000-000000000621','authenticated','authenticated','e504-family@test.invalid','',''),
 ('00000000-0000-0000-0000-000000000622','authenticated','authenticated','e504-other@test.invalid','',''),
 ('00000000-0000-0000-0000-000000000623','authenticated','authenticated','e504-ninera@test.invalid','','');
insert into public.profiles(id,role,nombre,phone,email_verified,phone_verified) values
 ('00000000-0000-0000-0000-000000000621','familia','Familia A','+5215550000621',true,true),
 ('00000000-0000-0000-0000-000000000622','familia','Familia B','+5215550000622',true,true),
 ('00000000-0000-0000-0000-000000000623','ninera','Candidata','+5215550000623',true,true);
insert into public.zonas(id,alcaldia_municipio,colonia,ciudad) values ('00000000-0000-0000-0000-000000000641','Centro','Prueba','Monterrey');
insert into public.perfil_familiar(profile_id,zona_id) values ('00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000641'),('00000000-0000-0000-0000-000000000622','00000000-0000-0000-0000-000000000641');
insert into public.perfil_ninera(profile_id,disponibilidad,salario_min,salario_max,modalidades_aceptadas,anos_experiencia,perfil_completo,publicado)
 values ('00000000-0000-0000-0000-000000000623','[{"dia":"lun","hora_inicio":"09:00","hora_fin":"17:00"}]',100,300,'{ocasional}',3,true,true);
insert into public.necesidades(id,familia_id,zona_id,estado,modalidad,dias_horarios,pago_min,pago_max,fecha_inicio,responsabilidades)
 values ('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000641','activa','ocasional','[{"dia":"lun","hora_inicio":"10:00","hora_fin":"16:00"}]',150,250,current_date,'{cuidado}'),
 ('00000000-0000-0000-0000-000000000602','00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000641','activa','ocasional','[{"dia":"lun","hora_inicio":"10:00","hora_fin":"16:00"}]',150,250,current_date,'{cuidado}');
insert into public.ninera_zonas(ninera_id,zona_id) values ('00000000-0000-0000-0000-000000000623','00000000-0000-0000-0000-000000000641');
insert into public.ninera_experiencia_edades(ninera_id,rango_edad) values ('00000000-0000-0000-0000-000000000623','3-6');
insert into public.necesidad_children(necesidad_id,rango_edad) values ('00000000-0000-0000-0000-000000000601','3-6'),('00000000-0000-0000-0000-000000000602','3-6');
insert into public.pipeline(id,necesidad_id,ninera_id,estado,match_score_snapshot,match_checklist_snapshot,source) values
 ('00000000-0000-0000-0000-000000000611','00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000623','nueva',100,'{}','unknown'),
 ('00000000-0000-0000-0000-000000000612','00000000-0000-0000-0000-000000000602','00000000-0000-0000-0000-000000000623','nueva',100,'{}','unknown');
insert into public.entitlements(id,familia_id,expires_at) values ('00000000-0000-0000-0000-000000000631','00000000-0000-0000-0000-000000000621',now()+interval '30 days');
insert into public.entitlements(id,familia_id,expires_at) values ('00000000-0000-0000-0000-000000000632','00000000-0000-0000-0000-000000000622',now()-interval '1 day');
commit;
set role service_role;

-- Full success: contacto, transition, and event share the transaction.
select public.confirm_contact('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000623','Hola');
do $$ declare s text; c int; e int; m text; begin
 select estado into s from public.pipeline where id='00000000-0000-0000-0000-000000000611';
 select count(*), max(mensaje) into c,m from public.contacto where pipeline_id='00000000-0000-0000-0000-000000000611';
 select count(*) into e from public.analytics_events where event_name='candidate_contacted' and necesidad_id='00000000-0000-0000-0000-000000000601' and metadata->>'entitlement_id'='00000000-0000-0000-0000-000000000631';
 if s<>'contactada' or c<>1 or m<>'Hola' or e<>1 then raise exception 'success assertion failed'; end if; end $$;
-- Retry is idempotent and does not add a second event.
select public.confirm_contact('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000623','Changed');
do $$ declare c int; e int; begin select count(*) into c from public.contacto where pipeline_id='00000000-0000-0000-0000-000000000611'; select count(*) into e from public.analytics_events where event_name='candidate_contacted' and necesidad_id='00000000-0000-0000-0000-000000000601'; if c<>1 or e<>1 then raise exception 'retry assertion failed'; end if; end $$;
-- Existing contact remains idempotent across every valid later pipeline state,
-- without an active entitlement.
do $$ declare result jsonb; state public.pipeline_estado; begin
  foreach state in array array['entrevista'::public.pipeline_estado, 'contratada'::public.pipeline_estado, 'descartada'::public.pipeline_estado] loop
    update public.pipeline set estado=state where id='00000000-0000-0000-0000-000000000611';
    select public.confirm_contact('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000623',null) into result;
    if result->>'status' <> 'already_contacted' or result->>'phone' <> '+5215550000623' then
      raise exception 'existing contact state retry assertion failed for %', state;
    end if;
  end loop;
end $$;
-- Closure does not revoke an established contact, for either terminal necesidad state.
do $$ declare result jsonb; state public.necesidad_estado; begin
  foreach state in array array['cerrada_contratada'::public.necesidad_estado, 'cerrada_cancelada'::public.necesidad_estado] loop
    update public.necesidades set estado=state where id='00000000-0000-0000-0000-000000000601';
    select public.confirm_contact('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000623',null) into result;
    if result->>'status' <> 'already_contacted' or result->>'phone' <> '+5215550000623' then
      raise exception 'closed necesidad existing contact assertion failed for %', state;
    end if;
  end loop;
  update public.necesidades set estado='activa' where id='00000000-0000-0000-0000-000000000601';
end $$;
-- A closed necesidad without a durable contacto cannot create a new contact.
update public.necesidades set estado='cerrada_contratada' where id='00000000-0000-0000-0000-000000000602';
update public.entitlements set expires_at=now()+interval '30 days' where id='00000000-0000-0000-0000-000000000631';
do $$ declare failed boolean; begin
  failed:=false;
  begin perform public.confirm_contact('00000000-0000-0000-0000-000000000602','00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000623',null); exception when others then failed:=true; end;
  if not failed then raise exception 'closed necesidad accepted new contact'; end if;
end $$;
update public.necesidades set estado='cerrada_cancelada' where id='00000000-0000-0000-0000-000000000602';
do $$ declare failed boolean; begin
  failed:=false;
  begin perform public.confirm_contact('00000000-0000-0000-0000-000000000602','00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000623',null); exception when others then failed:=true; end;
  if not failed then raise exception 'cancelled necesidad accepted new contact'; end if;
end $$;
update public.necesidades set estado='activa' where id='00000000-0000-0000-0000-000000000602';
-- Depublication and account deactivation do not revoke an already revealed contact.
update public.pipeline set estado='entrevista' where id='00000000-0000-0000-0000-000000000611';
update public.perfil_ninera set publicado=false where profile_id='00000000-0000-0000-0000-000000000623';
update public.profiles set account_status='suspendida' where id='00000000-0000-0000-0000-000000000623';
do $$ declare result jsonb; begin
  select public.confirm_contact('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000623',null) into result;
  if result->>'status' <> 'already_contacted' or result->>'phone' <> '+5215550000623' then
    raise exception 'post-depublication/deactivation existing contact assertion failed';
  end if;
end $$;
update public.perfil_ninera set publicado=true where profile_id='00000000-0000-0000-0000-000000000623';
update public.profiles set account_status='activa' where id='00000000-0000-0000-0000-000000000623';
-- Missing/expired entitlement, wrong owner, and stale/ineligible pairs fail.
update public.entitlements set expires_at=now()-interval '1 day' where id='00000000-0000-0000-0000-000000000631';
-- Expiry blocks new confirmations but never revokes an existing contact or its phone.
do $$ declare result jsonb; begin
  select public.confirm_contact('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000623',null) into result;
  if result->>'status' <> 'already_contacted' or result->>'phone' <> '+5215550000623' then
    raise exception 'expired existing contact assertion failed';
  end if;
end $$;
do $$ declare failed boolean; begin
  failed:=false; begin perform public.confirm_contact('00000000-0000-0000-0000-000000000602','00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000623',null); exception when others then failed:=true; end; if not failed then raise exception 'missing entitlement accepted'; end if;
  failed:=false; begin perform public.confirm_contact('00000000-0000-0000-0000-000000000602','00000000-0000-0000-0000-000000000622','00000000-0000-0000-0000-000000000623',null); exception when others then failed:=true; end; if not failed then raise exception 'wrong owner accepted'; end if;
  update public.entitlements set expires_at=now()+interval '30 days' where id='00000000-0000-0000-0000-000000000631';
  update public.perfil_ninera set publicado=false where profile_id='00000000-0000-0000-0000-000000000623'; failed:=false; begin perform public.confirm_contact('00000000-0000-0000-0000-000000000602','00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000623',null); exception when others then failed:=true; end; if not failed then raise exception 'ineligible accepted'; end if; update public.perfil_ninera set publicado=true where profile_id='00000000-0000-0000-0000-000000000623';
  update public.entitlements set expires_at=now()-interval '1 day' where id='00000000-0000-0000-0000-000000000631';
end $$;
-- No partial write on invalid message: pipeline remains Nueva and no rows/events exist.
do $$ declare failed boolean; s text; c int; e int; begin failed:=false; begin perform public.confirm_contact('00000000-0000-0000-0000-000000000602','00000000-0000-0000-0000-000000000621','00000000-0000-0000-0000-000000000623',repeat('x',1001)); exception when others then failed:=true; end; select estado into s from public.pipeline where id='00000000-0000-0000-0000-000000000612'; select count(*) into c from public.contacto where pipeline_id='00000000-0000-0000-0000-000000000612'; select count(*) into e from public.analytics_events where necesidad_id='00000000-0000-0000-0000-000000000602'; if not failed or s<>'nueva' or c<>0 or e<>0 then raise exception 'rollback assertion failed'; end if; end $$;
