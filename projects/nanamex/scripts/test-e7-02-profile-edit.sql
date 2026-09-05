-- E7-02 live database probe: identity edits re-queue the existing document, while
-- non-identity edits preserve verification and publication state.
begin;
create temporary table e702_ids (ninera uuid, zona uuid);
insert into e702_ids values (gen_random_uuid(), (select id from public.zonas limit 1));
insert into auth.users (id,aud,role,email,encrypted_password,confirmation_token) select ninera,'authenticated','authenticated',ninera::text||'@test.invalid','','' from e702_ids;
insert into public.profiles (id,role,nombre,account_status) select ninera,'ninera','Nombre original','activa' from e702_ids;
insert into public.perfil_ninera (profile_id,foto_url,anos_experiencia,disponibilidad,salario_min,salario_max,modalidades_aceptadas,descripcion,perfil_completo,publicado,verification_status)
select ninera,'https://cdn.test/original.jpg',3,jsonb_build_array(jsonb_build_object('dia','lun','hora_inicio','09:00','hora_fin','17:00')),4000,6000,'{ocasional}'::public.modalidad[],'Perfil completo',true,true,'verificada' from e702_ids;
insert into public.ninera_zonas select ninera,zona from e702_ids;
insert into public.ninera_experiencia_edades select ninera,'0-1' from e702_ids;
insert into public.identity_verifications(ninera_id,document_storage_path,status,motivo) select ninera,ninera::text||'/id.jpg','aprobada','primera_vez' from e702_ids;
insert into auth.users (id,aud,role,email,encrypted_password,confirmation_token) values (gen_random_uuid(),'authenticated','authenticated','missing-doc@test.invalid','','');
insert into public.profiles (id,role,nombre,account_status) select id,'ninera','Sin documento','activa' from auth.users where email='missing-doc@test.invalid';
insert into public.perfil_ninera (profile_id,verification_status) select id,'verificada' from public.profiles where nombre='Sin documento';
grant select on e702_ids to service_role;
select set_config('role','service_role',true);
do $$ declare v_failed boolean:=false; v_publicado boolean; begin
  begin perform public.save_perfil_ninera_section((select ninera from e702_ids),'availability',jsonb_build_object('disponibilidad',jsonb_build_array(jsonb_build_object('dia','lun','hora_inicio','09:00')),'salarioMin',4000,'salarioMax',6000,'modalidadesAceptadas',jsonb_build_array('ocasional'))); exception when others then v_failed:=true; end;
  select publicado into v_publicado from public.perfil_ninera where profile_id=(select ninera from e702_ids);
  if not v_failed or v_publicado is not true then raise exception 'malformed availability was accepted or changed publication'; end if;
  perform public.save_perfil_ninera_section((select ninera from e702_ids),'availability',jsonb_build_object('disponibilidad',jsonb_build_array(jsonb_build_object('dia','mar','hora_inicio','08:00','hora_fin','16:00')),'salarioMin',4000,'salarioMax',6000,'modalidadesAceptadas',jsonb_build_array('ocasional')));
  if (select disponibilidad->0->>'hora_inicio' from public.perfil_ninera where profile_id=(select ninera from e702_ids)) <> '08:00' then raise exception 'valid snake_case availability was not persisted'; end if;
end $$;
do $$ declare v_count int; v_status public.ninera_verification_status; begin
  select count(*) into v_count from public.identity_verifications where ninera_id=(select ninera from e702_ids);
  perform public.save_perfil_ninera_section((select ninera from e702_ids),'identity',jsonb_build_object('nombre','Nombre original','fotoUrl','https://cdn.test/original.jpg'));
  select count(*),verification_status into v_count,v_status from public.identity_verifications,public.perfil_ninera where identity_verifications.ninera_id=(select ninera from e702_ids) and perfil_ninera.profile_id=(select ninera from e702_ids) group by verification_status;
  if v_count <> 1 or v_status <> 'verificada' then raise exception 'unchanged identity edit triggered re-review'; end if;
end $$;
do $$ declare v_status public.ninera_verification_status; v_path text; v_motivo text; begin
  perform public.save_perfil_ninera_section((select ninera from e702_ids),'identity',jsonb_build_object('nombre','Nombre nuevo','fotoUrl','https://cdn.test/new.jpg'));
  select verification_status into v_status from public.perfil_ninera where profile_id=(select ninera from e702_ids);
  select document_storage_path,motivo into v_path,v_motivo from public.identity_verifications where ninera_id=(select ninera from e702_ids) and motivo='re-revision_por_edicion_de_perfil' limit 1;
  if v_status <> 'en_proceso' or v_path <> (select ninera::text||'/id.jpg' from e702_ids) or v_motivo <> 're-revision_por_edicion_de_perfil' then raise exception 'identity edit did not re-review existing document: %, %, %',v_status,v_path,v_motivo; end if;
end $$;
do $$ declare v_failed boolean:=false; v_name text; begin
  begin perform public.save_perfil_ninera_section((select id from public.profiles where nombre='Sin documento'),'identity',jsonb_build_object('nombre','Cambio inválido','fotoUrl','https://cdn.test/change.jpg')); exception when others then v_failed:=true; end;
  select nombre into v_name from public.profiles where nombre='Sin documento' or nombre='Cambio inválido';
  if not v_failed or v_name <> 'Sin documento' then raise exception 'missing-document identity edit did not rollback'; end if;
end $$;
update public.perfil_ninera set verification_status='verificada' where profile_id=(select ninera from e702_ids);
delete from public.identity_verifications where ninera_id=(select ninera from e702_ids) and motivo='re-revision_por_edicion_de_perfil';
do $$ declare v_status public.ninera_verification_status; v_publicado boolean; begin
  perform public.save_perfil_ninera_section((select ninera from e702_ids),'about',jsonb_build_object('descripcion','Otra descripción'));
  select verification_status,publicado into v_status,v_publicado from public.perfil_ninera where profile_id=(select ninera from e702_ids);
  if v_status <> 'verificada' or v_publicado is not true then raise exception 'non-identity edit changed trust/publication'; end if;
end $$;
rollback;
